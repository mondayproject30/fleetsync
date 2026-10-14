/**
 * Battery Management & Charging System
 * - Simulates battery consumption during driving and picking operations
 * - Low-battery trigger (<25%) with automatic mission abort/charge routing
 * - Multi-bay charging station dock management
 * - Automatic recovery when recharged to >= 90%
 */

import { WAREHOUSE_CONFIG, STATIONS } from './warehouseLayout.js';

export class BatteryManager {
  constructor(onEventLog) {
    this.log = onEventLog || console.log;
    this.bayAssignments = new Map(); // bayId -> robotId
  }

  /**
   * Drain battery according to active activity.
   */
  updateBattery(robot, isMoving = false, isPicking = false) {
    if (robot.state === 'CHARGING') {
      // Recharging
      robot.battery = Math.min(100, robot.battery + WAREHOUSE_CONFIG.chargingRate);
      if (robot.battery >= 90) {
        robot.onChargingComplete();
        this.releaseBay(robot.id);
        this.log(`[CHARGING COMPLETE] Robot ${robot.id} battery restored to ${Math.round(robot.battery)}%. Returning to operational service.`, 'success');
      }
      return;
    }

    let drain = 0;
    if (isMoving) {
      drain += robot.cargo ? WAREHOUSE_CONFIG.loadedDischargeRate : WAREHOUSE_CONFIG.moveDischargeRate;
    }
    if (isPicking) {
      drain += WAREHOUSE_CONFIG.pickDischargeRate;
    }

    if (drain > 0) {
      robot.battery = Math.max(0, robot.battery - drain);
    }

    // Check low battery transition
    if (robot.battery <= WAREHOUSE_CONFIG.lowBatteryThreshold && !robot.isLowBatteryAlerted) {
      robot.isLowBatteryAlerted = true;
      this.log(`[LOW BATTERY CRITICAL] Robot ${robot.id} battery dropped to ${Math.round(robot.battery)}%! Requesting emergency charging bay.`, 'danger');
      robot.requestEmergencyCharging();
    }
  }

  /**
   * Find an available charging bay (Bay 1 to 5), prioritizing preferred bay if provided.
   */
  getAvailableChargingBay(robotId, preferredBayId = null) {
    if (preferredBayId) {
      const prefBay = STATIONS.charging.bays.find(b => b.id === preferredBayId);
      const occupant = this.bayAssignments.get(preferredBayId);
      if (prefBay && (!occupant || occupant === robotId)) {
        this.bayAssignments.set(preferredBayId, robotId);
        return prefBay;
      }
    }
    for (const bay of STATIONS.charging.bays) {
      const occupant = this.bayAssignments.get(bay.id);
      if (!occupant || occupant === robotId) {
        this.bayAssignments.set(bay.id, robotId);
        return bay;
      }
    }
    // Fallback: Bay 1
    return STATIONS.charging.bays[0];
  }

  releaseBay(robotId) {
    for (const [bayId, botId] of this.bayAssignments.entries()) {
      if (botId === robotId) {
        this.bayAssignments.delete(bayId);
        break;
      }
    }
  }

  reset() {
    this.bayAssignments.clear();
  }
}
