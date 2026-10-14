/**
 * LiDAR-Inspired Obstacle Detection & Camera Object Classification Module
 * - 5-Meter Configurable Detection Zone (55px simulation conversion)
 * - Detects other AMRs, Humans (moving obstacles), Boxes/Goods, Static Obstacles
 * - Optical AI Camera Classification into discrete categories
 * - Speed slowing & safety stop triggers
 */

import { WAREHOUSE_CONFIG } from './warehouseLayout.js';

export const OBSTACLE_TYPES = {
  AMR: 'Another AMR',
  HUMAN: 'Human Worker',
  BOX: 'Fallen Box / Goods',
  STATIC: 'Static Barrier / Pallet',
  UNKNOWN: 'Unknown Obstacle'
};

export class SensorSimulator {
  constructor(onEventLog) {
    this.log = onEventLog || console.log;
    this.obstacles = [];
    this.obstacleIdCounter = 1;
    this.initDefaultObstacles();
  }

  initDefaultObstacles() {
    this.obstacles = [];
  }

  /**
   * Add a dynamic or static obstacle into the warehouse floor.
   */
  addObstacle(type = 'BOX', x, y, options = {}) {
    const id = `OBS-${this.obstacleIdCounter++}`;
    const obs = {
      id,
      type, // 'HUMAN', 'BOX', 'STATIC', 'UNKNOWN'
      label: OBSTACLE_TYPES[type] || OBSTACLE_TYPES.UNKNOWN,
      x,
      y,
      radius: options.radius || 16,
      vx: options.vx || (type === 'HUMAN' ? 0.6 : 0),
      vy: options.vy || (type === 'HUMAN' ? 0.4 : 0),
      minX: options.minX || 200,
      maxX: options.maxX || 880,
      minY: options.minY || 70,
      maxY: options.maxY || 680,
      color: type === 'HUMAN' ? '#ff3b69' : type === 'BOX' ? '#ffaa00' : '#e056fd',
      createdAt: Date.now()
    };
    this.obstacles.push(obs);
    this.log(`[OBSTACLE PLACED] ${obs.label} introduced at (${Math.round(x)}, ${Math.round(y)}).`, 'warning');
    return obs;
  }

  removeObstacle(id) {
    const idx = this.obstacles.findIndex(o => o.id === id);
    if (idx !== -1) {
      const removed = this.obstacles.splice(idx, 1)[0];
      this.log(`[OBSTACLE CLEARED] ${removed.label} (${removed.id}) removed from floor.`, 'info');
      return true;
    }
    return false;
  }

  clearAllObstacles() {
    this.obstacles = [];
    this.log(`[OBSTACLES] All floor obstacles cleared.`, 'info');
  }

  /**
   * Update moving obstacles (e.g. simulated human walking).
   */
  updateObstacles() {
    for (const obs of this.obstacles) {
      if (obs.vx !== 0 || obs.vy !== 0) {
        obs.x += obs.vx;
        obs.y += obs.vy;

        // Bounce back within boundaries
        if (obs.x <= obs.minX || obs.x >= obs.maxX) obs.vx *= -1;
        if (obs.y <= obs.minY || obs.y >= obs.maxY) obs.vy *= -1;
      }
    }
  }

  /**
   * Run LiDAR scan for a robot against other robots and floor obstacles.
   * Returns scan findings: { detectedObstacles: [], slowDown: boolean, emergencyStop: boolean }
   */
  scanForRobot(robot, allRobots, lidarRange = WAREHOUSE_CONFIG.lidarRadiusPixels) {
    const findings = {
      detectedObjects: [],
      slowDown: false,
      emergencyStop: false,
      nearestDistance: Infinity,
      alertMessage: null
    };

    // 1. Scan against other AMRs
    for (const other of allRobots) {
      if (other.id === robot.id) continue;

      // Ignore robots that are parked/charging inside charging stalls (x <= 120)
      if ((other.state === 'IDLE' || other.state === 'CHARGING') && other.x <= 120) continue;
      if ((robot.state === 'IDLE' || robot.state === 'CHARGING') && robot.x <= 120) continue;

      // If the other robot is actively yielding FOR this robot or evading/overtaking together, do not halt this robot
      if (other.yieldingFor === robot.id) continue;
      if (other.evasionPartnerId === robot.id || robot.evasionPartnerId === other.id) continue;
      if (other.overtakingTargetId === robot.id || robot.overtakingTargetId === other.id) continue;

      const dist = Math.hypot(other.x - robot.x, other.y - robot.y);
      if (dist <= lidarRange + WAREHOUSE_CONFIG.robotRadius) {
        const angleToOther = Math.atan2(other.y - robot.y, other.x - robot.x);
        // Heading alignment
        const headingDiff = Math.abs(robot.heading - angleToOther);
        const isAhead = headingDiff < Math.PI / 2 || headingDiff > (Math.PI * 1.5);

        const classification = this.classifyObject({ type: 'AMR', ref: other });
        findings.detectedObjects.push({
          type: 'AMR',
          id: other.id,
          classification,
          distance: dist,
          x: other.x,
          y: other.y,
          isAhead
        });

        if (dist < findings.nearestDistance) {
          findings.nearestDistance = dist;
        }

        if (dist < WAREHOUSE_CONFIG.robotRadius * 2.2) {
          findings.emergencyStop = true;
        } else if (dist < lidarRange * 0.8 && isAhead) {
          findings.slowDown = true;
        }
      }
    }

    // 2. Scan against Floor Obstacles (Boxes, Humans, Static)
    for (const obs of this.obstacles) {
      const dist = Math.hypot(obs.x - robot.x, obs.y - robot.y);
      if (dist <= lidarRange + obs.radius) {
        const classification = this.classifyObject(obs);
        const angleToObs = Math.atan2(obs.y - robot.y, obs.x - robot.x);
        const headingDiff = Math.abs(robot.heading - angleToObs);
        const isAhead = headingDiff < Math.PI / 2.2 || headingDiff > (Math.PI * 1.5);

        findings.detectedObjects.push({
          type: obs.type,
          id: obs.id,
          classification,
          distance: dist,
          x: obs.x,
          y: obs.y,
          isAhead
        });

        if (dist < findings.nearestDistance) {
          findings.nearestDistance = dist;
        }

        // Safety stop thresholds
        if (dist < (WAREHOUSE_CONFIG.robotRadius + obs.radius + 10) && isAhead) {
          findings.emergencyStop = true;
          findings.alertMessage = `Emergency Stop: ${classification.category} directly on route!`;
        } else if (dist < lidarRange && isAhead) {
          findings.slowDown = true;
        }
      }
    }

    return findings;
  }

  /**
   * Simulated Camera Classification Model
   */
  classifyObject(obj) {
    if (obj.type === 'AMR') {
      return {
        category: OBSTACLE_TYPES.AMR,
        confidence: 0.99,
        action: 'NEGOTIATE_PRIORITY',
        safetyProtocol: 'V2V_MESH'
      };
    }
    if (obj.type === 'HUMAN') {
      return {
        category: OBSTACLE_TYPES.HUMAN,
        confidence: 0.96,
        action: 'SAFETY_HALT',
        safetyProtocol: 'IMMEDIATE_STOP_AND_ALARM'
      };
    }
    if (obj.type === 'BOX') {
      return {
        category: OBSTACLE_TYPES.BOX,
        confidence: 0.94,
        action: 'REPLAN_ROUTE',
        safetyProtocol: 'SLOW_AND_DETOUR'
      };
    }
    return {
      category: OBSTACLE_TYPES.UNKNOWN,
      confidence: 0.82,
      action: 'SAFETY_HALT',
      safetyProtocol: 'WARN_OPERATOR'
    };
  }
}
