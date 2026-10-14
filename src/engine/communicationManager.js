/**
 * Decentralized Robot-to-Robot (V2V) Communication Layer
 * - Simulated wireless mesh packet broadcast within communication radius
 * - Exchanging telemetry, priority state, intentions, and reservations
 * - Maintains active mesh links for visualization
 */

import { WAREHOUSE_CONFIG } from './warehouseLayout.js';

export class CommunicationManager {
  constructor(onEventLog) {
    this.log = onEventLog || console.log;
    this.activeLinks = []; // Array<{ fromId, toId, x1, y1, x2, y2, time }>
    this.messageHistory = [];
  }

  /**
   * Package a robot's state packet into the standardized V2V format.
   */
  createTelemetryPacket(robot) {
    return {
      robotId: robot.id,
      timestamp: Date.now(),
      coordinates: { x: Math.round(robot.x), y: Math.round(robot.y) },
      heading: robot.heading,
      battery: Math.round(robot.battery),
      isLowBattery: robot.battery <= WAREHOUSE_CONFIG.lowBatteryThreshold,
      hasGoods: robot.cargo !== null,
      cargoItem: robot.cargo,
      state: robot.state,
      currentJob: robot.job ? { ...robot.job } : null,
      orderTimestamp: robot.orderTimestamp || 0,
      currentTarget: robot.targetPoint ? { x: Math.round(robot.targetPoint.x), y: Math.round(robot.targetPoint.y) } : null,
      nextWaypoint: robot.getNextWaypoint(),
      currentReservation: {
        shelf: robot.assignedShelf,
        conveyor: robot.assignedConveyor,
        dockSlot: robot.assignedDockSlot ? robot.assignedDockSlot.id : null
      }
    };
  }

  /**
   * Broadcast telemetry within communication zone and record active links.
   */
  broadcastAndSync(allRobots, commRadius = WAREHOUSE_CONFIG.commRadiusPixels) {
    const links = [];
    const n = allRobots.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const r1 = allRobots[i];
        const r2 = allRobots[j];
        const dist = Math.hypot(r1.x - r2.x, r1.y - r2.y);

        if (dist <= commRadius) {
          links.push({
            id: `${r1.id}-${r2.id}`,
            r1Id: r1.id,
            r2Id: r2.id,
            x1: r1.x,
            y1: r1.y,
            x2: r2.x,
            y2: r2.y,
            dist
          });

          // Exchange packets
          const p1 = this.createTelemetryPacket(r1);
          const p2 = this.createTelemetryPacket(r2);
          r1.receiveV2VPacket(p2);
          r2.receiveV2VPacket(p1);
        }
      }
    }

    this.activeLinks = links;
    return links;
  }

  getActiveLinks() {
    return this.activeLinks;
  }
}
