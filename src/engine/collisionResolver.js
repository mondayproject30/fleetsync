/**
 * Deterministic Decentralized Conflict Resolution & Priority Engine
 *
 * Strict Priority Ordering:
 * 1. Critical Low-Battery (<25%) -> Highest scheduling priority (10,000,000)
 * 2. Carrying Goods / Cargo -> Next priority (100,000)
 * 3. Traveling without goods -> Base priority (1,000)
 * 4. Earlier Order Assignment Timestamp -> Tie-breaker
 * 5. Robot ID (e.g. 'R1' < 'R2') -> Deterministic final tie-breaker
 *
 * Side-Lane Yielding & Deadlock Recovery:
 * - Highest-priority robot gets right-of-way.
 * - Lower-priority robot yields to safe side lane or halts safely.
 * - Deadlock monitor detects robots stalled > 3.5 seconds and triggers backing-off or rerouting.
 */

import { WAREHOUSE_CONFIG } from './warehouseLayout.js';

export class CollisionResolver {
  constructor(reservationManager, onEventLog) {
    this.reservation = reservationManager;
    this.log = onEventLog || console.log;
    this.conflictZones = []; // [{ id, x, y, participatingRobots, winnerId, timestamp }]
    this.deadlockAlerts = [];
  }

  /**
   * Calculate exact deterministic priority score according to specification.
   * @param {Object} robot
   * @returns {number}
   */
  calculatePriorityScore(robot) {
    const isCriticalBat = robot.battery <= WAREHOUSE_CONFIG.lowBatteryThreshold;
    const hasCargo = robot.cargo !== null;

    let score = 0;
    if (isCriticalBat) {
      score += 10000000;
    } else if (hasCargo) {
      score += 100000;
    } else {
      score += 1000;
    }

    // Earlier order timestamp adds up to 999 bonus points (inverting age so older gets higher score)
    if (robot.orderTimestamp) {
      const ageSeconds = Math.min(999, Math.floor((Date.now() - robot.orderTimestamp) / 1000));
      score += ageSeconds;
    }

    return score;
  }

  /**
   * Deterministic comparison between two robots.
   * Returns positive if r1 has higher priority than r2, negative if r2 higher, 0 if equal.
   */
  compareRobots(r1, r2) {
    const score1 = this.calculatePriorityScore(r1);
    const score2 = this.calculatePriorityScore(r2);

    if (score1 !== score2) {
      return score1 - score2;
    }

    // Tie-breaker 1: Earlier order timestamp
    const t1 = r1.orderTimestamp || Infinity;
    const t2 = r2.orderTimestamp || Infinity;
    if (t1 !== t2) {
      return t2 - t1; // Earlier timestamp wins
    }

    // Tie-breaker 2: Deterministic string comparison on Robot ID (e.g. "R1" > "R2" alphabetically reverse or standard)
    return r2.id.localeCompare(r1.id);
  }

  /**
   * Detect potential path collisions and junction contentions.
   */
  resolveFleetConflicts(robots, obstacles = []) {
    const activeConflicts = [];
    const n = robots.length;

    // Check all robot pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const r1 = robots[i];
        const r2 = robots[j];

        // Skip robots that are parked/charging inside charging stalls (x <= 120)
        const r1Parked = (r1.state === 'IDLE' || r1.state === 'CHARGING') && r1.x <= 120;
        const r2Parked = (r2.state === 'IDLE' || r2.state === 'CHARGING') && r2.x <= 120;
        if (r1Parked || r2Parked) continue;

        // Skip if both are stationary idle or charging
        if ((r1.state === 'IDLE' || r1.state === 'CHARGING') && (r2.state === 'IDLE' || r2.state === 'CHARGING')) continue;

        // Check distance or projected next waypoint overlap
        const r1Next = r1.getNextWaypoint();
        const r2Next = r2.getNextWaypoint();
        const nextOverlap = Boolean(r1Next && r2Next && Math.hypot(r1Next.x - r2Next.x, r1Next.y - r2Next.y) < 35);

        // If traveling in the same direction along a corridor, follower simply maintains following distance
        const headingDiff = Math.abs(r1.heading - r2.heading);
        const isSameDirection = headingDiff < 0.6 || headingDiff > (Math.PI * 2 - 0.6);
        if (isSameDirection && !nextOverlap) continue;

        const dist = Math.hypot(r1.x - r2.x, r1.y - r2.y);
        const conflictDistanceThreshold = 65; // pixels (approaching collision zone)

        if (dist < conflictDistanceThreshold || nextOverlap) {
          // Identify lower-number and higher-number robots
          const getBotNum = (r) => parseInt(r.id.replace(/\D/g, ''), 10) || 0;
          const num1 = getBotNum(r1);
          const num2 = getBotNum(r2);
          const lowerBot = num1 < num2 ? r1 : r2;
          const higherBot = num1 < num2 ? r2 : r1;

          // Rule: If robots collide, lower number robot takes another lane (left or right) and overtakes higher robot from center
          if (lowerBot.x > 125 && higherBot.x > 125) {
            higherBot.holdCenterLane(lowerBot.id);
            const chosenLane = lowerBot.initiateOvertake(higherBot, robots);

            activeConflicts.push({
              id: `CONF-${lowerBot.id}-${higherBot.id}`,
              x: (lowerBot.x + higherBot.x) / 2,
              y: (lowerBot.y + higherBot.y) / 2,
              r1: lowerBot.id,
              r2: higherBot.id,
              winnerId: lowerBot.id,
              yielderId: higherBot.id,
              type: 'OVERTAKE',
              reason: `${lowerBot.id} (Lower #) overtaking ${higherBot.id} via ${chosenLane || 'Side Lane'}`
            });

            if (!lowerBot.hasLoggedOvertake) {
              lowerBot.hasLoggedOvertake = true;
              this.log(`[OVERTAKE INITIATED] Potential collision! Lower number Robot ${lowerBot.id} taking ${chosenLane} to overtake Robot ${higherBot.id} from center.`, 'warning');
            }
            continue;
          }

          // Conflict detected!
          const comparison = this.compareRobots(r1, r2);
          const winner = comparison >= 0 ? r1 : r2;
          const yielder = comparison >= 0 ? r2 : r1;

          activeConflicts.push({
            id: `CONF-${r1.id}-${r2.id}`,
            x: (r1.x + r2.x) / 2,
            y: (r1.y + r2.y) / 2,
            r1: r1.id,
            r2: r2.id,
            winnerId: winner.id,
            yielderId: yielder.id,
            reason: winner.battery <= WAREHOUSE_CONFIG.lowBatteryThreshold
              ? 'Low Battery Critical Priority'
              : winner.cargo !== null
              ? 'Cargo Delivery Priority'
              : 'Deterministic Timestamp/ID'
          });

          // Apply resolution:
          // Winner proceeds, yielder yields or halts safely
          this.applyYielding(yielder, winner, robots);
        }
      }
    }

    // Check Deadlock Monitor
    this.checkDeadlocks(robots);

    this.conflictZones = activeConflicts;
    return activeConflicts;
  }

  /**
   * Apply yielding protocol to the lower-priority robot.
   * Validates target lane clearance or halts safely per Section 3 Rule 10.
   */
  applyYielding(yielder, winner, allRobots = []) {
    if (yielder.state === 'YIELDING' || yielder.state === 'WAITING_YIELD') {
      return; // Already yielding
    }

    // Never yield or shift if inside charging stall (x <= 125)
    if (yielder.x <= 125) {
      return;
    }

    const yieldShiftDist = 38;
    const rightAngle = yielder.heading + Math.PI / 2;
    const rightX = yielder.x + Math.cos(rightAngle) * yieldShiftDist;
    const rightY = yielder.y + Math.sin(rightAngle) * yieldShiftDist;

    // Check if right side position is clear of all other robots
    const isOccupied = (x, y) =>
      allRobots.some(r => r.id !== yielder.id && r.id !== winner.id && Math.hypot(r.x - x, r.y - y) < 36);

    let safeHolding = null;
    if (!isOccupied(rightX, rightY)) {
      safeHolding = { x: rightX, y: rightY };
    } else {
      // Try left lane
      const leftAngle = yielder.heading - Math.PI / 2;
      const leftX = yielder.x + Math.cos(leftAngle) * yieldShiftDist;
      const leftY = yielder.y + Math.sin(leftAngle) * yieldShiftDist;
      if (!isOccupied(leftX, leftY)) {
        safeHolding = { x: leftX, y: leftY };
      }
    }

    this.log(`[PRIORITY RESOLVED] Conflict between ${winner.id} & ${yielder.id}: ${winner.id} won right-of-way (${this.getPriorityLabel(winner)}). ${yielder.id} yielding.`, 'info');

    if (safeHolding) {
      yielder.yieldToSideLane(winner.id, safeHolding);
    } else {
      // Rule 10: If no safe lane change is available, remain stopped safely
      yielder.state = 'WAITING_YIELD';
      yielder.yieldingFor = winner.id;
      yielder.targetPoint = null;
      yielder.blockedSince = Date.now();
    }
  }

  getPriorityLabel(robot) {
    if (robot.battery <= WAREHOUSE_CONFIG.lowBatteryThreshold) return 'Critical Battery (<25%)';
    if (robot.cargo !== null) return `Carrying Cargo (${robot.cargo})`;
    return 'Transit Rule (Earlier Timestamp / ID)';
  }

  /**
   * Deadlock Detection: Check if robots are waiting blocked for too long (> 3.5s)
   */
  checkDeadlocks(robots) {
    const now = Date.now();
    for (const robot of robots) {
      if ((robot.state === 'BLOCKED' || robot.state === 'WAITING_YIELD') && robot.blockedSince) {
        const stalledSeconds = (now - robot.blockedSince) / 1000;
        if (stalledSeconds > 3.5 && !robot.isDeadlockRecovering) {
          this.log(`[DEADLOCK DETECTED] Robot ${robot.id} stalled for ${stalledSeconds.toFixed(1)}s! Initiating automatic recovery...`, 'danger');
          robot.triggerDeadlockRecovery();
        }
      }
    }
  }
}
