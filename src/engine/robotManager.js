/**
 * AMR Robot Fleet Model & Kinematics Controller
 * - 2D Smooth Kinematics (Position, Heading Angle, Velocity)
 * - State Machine: IDLE -> EN_ROUTE_SHELF -> DOCKING -> PICKING -> RETURNING_CENTER -> EN_ROUTE_CONVEYOR -> UNLOADING -> CHARGING
 * - Dynamic LiDAR & Optical Camera Sensor Integration
 * - V2V Mesh Peer Communication Handling
 */

import { WAREHOUSE_CONFIG } from './warehouseLayout.js';
import { warehouseGraph } from './astar.js';

export const ROBOT_COLORS = [
  '#00d2ff', // Cyan / Electric Blue (R1)
  '#b28aff', // Violet / Purple (R2)
  '#ff9f43', // Orange (R3)
  '#2ed573', // Emerald Green (R4)
  '#ff5252', // Crimson / Red (R5)
  '#ffd32a'  // Amber / Yellow (R6)
];

export class Robot {
  constructor(id, name, startX, startY, color, bayId = null) {
    this.id = id;
    this.name = name;
    this.x = startX;
    this.y = startY;
    this.heading = 0; // Radians
    this.color = color;
    this.bayId = bayId;

    this.battery = 100;
    this.state = 'IDLE';
    this.speed = WAREHOUSE_CONFIG.speed;

    this.cargo = null;
    this.job = null;
    this.orderTimestamp = null;

    // Reservations
    this.assignedShelf = null;
    this.assignedConveyor = null;
    this.assignedDockSlot = null;

    // Path & Navigation
    this.path = [];
    this.waypointIndex = 0;
    this.targetPoint = null;

    // Yielding & Conflict State
    this.yieldingFor = null;
    this.yieldHoldingPoint = null;
    this.preYieldPath = null;
    this.preYieldIndex = 0;
    this.blockedSince = null;
    this.isDeadlockRecovering = false;
    this.isLowBatteryAlerted = false;
    this.evasionPartnerId = null;
    this.hasLoggedEvasion = false;

    // Sensor & Communication
    this.lidarAlert = false;
    this.detectedObstacles = [];
    this.v2vPeers = new Map();

    // Internal action timer (for picking/unloading duration)
    this.actionTimer = 0;
    this.maxActionTime = 50; // frames (~0.9s at 60Hz)
  }

  isFree() {
    return (
      (this.state === 'IDLE' || this.state === 'CHARGING') &&
      this.battery > WAREHOUSE_CONFIG.lowBatteryThreshold &&
      this.cargo === null &&
      this.job === null
    );
  }

  getNextWaypoint() {
    if (this.path && this.waypointIndex < this.path.length) {
      return this.path[this.waypointIndex];
    }
    return null;
  }

  setPath(waypoints) {
    if (!waypoints || waypoints.length === 0) {
      this.path = [];
      this.waypointIndex = 0;
      this.targetPoint = null;
      return;
    }
    this.path = waypoints;
    this.waypointIndex = 0;
    this.targetPoint = waypoints[0];
  }

  receiveV2VPacket(packet) {
    this.v2vPeers.set(packet.robotId, packet);
  }

  /**
   * Step robot forward along its current path towards the active waypoint.
   * Includes a hard physical non-penetration guard (Rule 7: robots never overlap).
   */
  stepTowardsTarget(effectiveSpeed, allRobots = []) {
    if (!this.targetPoint) return true;

    const dx = this.targetPoint.x - this.x;
    const dy = this.targetPoint.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1.5) {
      // Smooth heading rotation
      const targetHeading = Math.atan2(dy, dx);
      let diff = targetHeading - this.heading;
      // Normalize angle to -PI..PI
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.heading += diff * 0.25;

      const step = Math.min(effectiveSpeed, dist);
      const nextX = this.x + (dx / dist) * step;
      const nextY = this.y + (dy / dist) * step;

      // Hard Non-Penetration Guard:
      // Minimum separation = 36px (2 * robotRadius 18)
      for (const other of allRobots) {
        if (other.id === this.id) continue;
        // Skip robots safely parked in charging stalls unless docking into that same bay
        const otherIsParked = other.x <= 120 && (other.state === 'IDLE' || other.state === 'CHARGING');
        const thisIsDockingToOtherBay = (this.state === 'RETURNING_CHARGE' || this.state === 'RETURNING_TO_BAY') && this.bayId === other.bayId;
        if (otherIsParked && !thisIsDockingToOtherBay) continue;

        const currentDist = Math.hypot(other.x - this.x, other.y - this.y);
        const nextDist = Math.hypot(other.x - nextX, other.y - nextY);

        // If stepping would penetrate the other robot's 36px physical body, STOP immediately!
        if (nextDist < 36 && nextDist < currentDist) {
          return false;
        }
      }

      this.x = nextX;
      this.y = nextY;
      return false;
    } else {
      this.x = this.targetPoint.x;
      this.y = this.targetPoint.y;
      return true;
    }
  }

  advanceWaypoint() {
    this.waypointIndex++;
    if (this.waypointIndex < this.path.length) {
      this.targetPoint = this.path[this.waypointIndex];
      return false; // Still has waypoints
    } else {
      this.targetPoint = null;
      return true; // Path completed
    }
  }

  yieldToSideLane(winnerId, sideHoldingPoint) {
    this.state = 'YIELDING';
    this.yieldingFor = winnerId;
    this.yieldHoldingPoint = sideHoldingPoint;
    this.preYieldPath = [...this.path];
    this.preYieldIndex = this.waypointIndex;

    // Shift to side holding point
    this.targetPoint = sideHoldingPoint;
    this.blockedSince = Date.now();
  }

  evadeToRight(partner) {
    if (this.state === 'EVADING_RIGHT' || this.x <= 125) return;

    this.state = 'EVADING_RIGHT';
    this.evasionPartnerId = partner.id;
    if (!this.preYieldPath) {
      this.preYieldPath = [...this.path];
      this.preYieldIndex = this.waypointIndex;
    }

    // Reverse slightly along current heading (12px back)
    const revX = this.x - Math.cos(this.heading) * 14;
    const revY = this.y - Math.sin(this.heading) * 14;

    // Shift to the right by 38px relative to current forward heading
    const rightAngle = this.heading + Math.PI / 2;
    const rightX = revX + Math.cos(rightAngle) * 38;
    const rightY = revY + Math.sin(rightAngle) * 38;

    // Clamp inside walkable corridor boundaries
    const safeX = Math.max(175, Math.min(1080, rightX));
    const safeY = Math.max(80, Math.min(675, rightY));

    this.targetPoint = { x: safeX, y: safeY };
    this.blockedSince = Date.now();
  }

  resumeFromYield() {
    if (this.cargo) {
      this.state = 'EN_ROUTE_CONVEYOR';
    } else if (this.job && this.job.type === 'Pick goods') {
      this.state = 'EN_ROUTE_SHELF';
    } else if (this.job && this.job.type === 'Charge') {
      this.state = 'RETURNING_CHARGE';
    } else {
      this.state = 'RETURNING_TO_BAY';
    }

    this.yieldingFor = null;
    this.yieldHoldingPoint = null;
    this.evasionPartnerId = null;
    this.blockedSince = null;
    if (this.preYieldPath) {
      this.path = this.preYieldPath;
      this.waypointIndex = this.preYieldIndex;
      this.targetPoint = this.path[this.waypointIndex] || null;
      this.preYieldPath = null;
    }
  }

  triggerDeadlockRecovery() {
    this.isDeadlockRecovering = true;
    // Step back slightly along previous heading or request new detour route
    const backHeading = this.heading + Math.PI;
    this.x += Math.cos(backHeading) * 12;
    this.y += Math.sin(backHeading) * 12;

    setTimeout(() => {
      this.isDeadlockRecovering = false;
      this.blockedSince = null;
      if (this.state === 'BLOCKED' || this.state === 'WAITING_YIELD') {
        this.resumeFromYield();
      }
    }, 1500);
  }

  requestEmergencyCharging() {
    if (this.state === 'CHARGING' || this.state === 'RETURNING_CHARGE') return;
    this.state = 'RETURNING_CHARGE';
    this.job = { type: 'Charge', target: 'CHARGING_STATION', reason: 'Low Battery Auto Return' };
  }

  onChargingComplete() {
    this.state = 'IDLE';
    this.job = null;
    this.isLowBatteryAlerted = false;
    this.path = [];
    this.targetPoint = null;
  }
}
