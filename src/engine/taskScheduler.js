/**
 * Task Scheduler & Mission Orchestrator
 * - Individual robot manual job dispatch (Shelf 1..4, Stations, Charging)
 * - Automatic background task dispatch mode
 * - Full lifecycle: Start -> Shelf Docking -> Pick Goods -> Center Lane -> Conveyor Lane -> Unload -> Station / Outer Loop Return
 * - Queue management & cancellation
 */

import { SHELVES, STATIONS } from './warehouseLayout.js';
import { warehouseGraph } from './astar.js';

let orderCounter = 201;

export class TaskScheduler {
  constructor(reservationManager, inventoryManager, batteryManager, onEventLog) {
    this.reservation = reservationManager;
    this.inventory = inventoryManager;
    this.battery = batteryManager;
    this.log = onEventLog || console.log;

    this.pendingQueue = [];
    this.activeOrders = new Map();
    this.completedOrders = [];
    this.autoDispatchEnabled = false;
    this.autoDispatchTimer = 0;
  }

  /**
   * Assign an explicit job to an individual robot.
   * @param {Object} robot
   * @param {string} jobType - 'Pick goods', 'Deliver', 'Charge', 'Move'
   * @param {Object} options - { shelfNum, destination, targetStation }
   */
  assignJob(robot, jobType, options = {}) {
    if (!robot) return { success: false, reason: 'NO_ROBOT' };

    // If robot is critical low battery and job isn't charging, reject
    if (robot.battery <= 25 && jobType !== 'Charge') {
      this.log(`[DISPATCH REJECTED] Robot ${robot.id} has low battery (${Math.round(robot.battery)}%)! Must return to charging.`, 'danger');
      return { success: false, reason: 'LOW_BATTERY' };
    }

    if (jobType === 'Pick goods') {
      const shelfNum = options.shelfNum || 1;
      const shelf = SHELVES.find(s => s.num === shelfNum);
      if (!shelf) return { success: false, reason: 'INVALID_SHELF' };

      const destination = options.destination || 'PACKAGING_STATION';
      const itemName = options.itemName || this.inventory.getRandomItemForShelf(shelf.id);
      const orderId = `ORD-${orderCounter++}`;

      const order = {
        orderId,
        robotId: robot.id,
        type: 'PICK_AND_DELIVER',
        shelfId: shelf.id,
        shelfNum: shelf.num,
        shelfName: shelf.name,
        itemName,
        destination,
        status: 'EN_ROUTE_SHELF',
        createdAt: Date.now()
      };

      // Attempt exclusive shelf reservation
      const reserveResult = this.reservation.reserveShelf(shelf.id, robot.id, order);

      if (!reserveResult.success) {
        // Shelf is locked! Queue order
        this.pendingQueue.push({ order, robotId: robot.id });
        this.log(`[ORDER QUEUED] Shelf ${shelf.num} is currently locked by ${reserveResult.owner}. Order #${orderId} queued.`, 'warning');
        return { success: false, queued: true, reason: 'SHELF_LOCKED' };
      }

      // Reservation granted! Setup robot
      this.activeOrders.set(orderId, order);
      robot.job = order;
      robot.assignedShelf = shelf.id;
      robot.orderTimestamp = order.createdAt;
      robot.state = 'EN_ROUTE_SHELF';

      // Pick bottom or top dock slot
      const dockSlot = shelf.dockSlots[1] || shelf.dockSlots[0];
      robot.assignedDockSlot = dockSlot;

      // Plan route from robot's current position to the docking port
      const startNode = warehouseGraph.findNearestNode(robot.x, robot.y);
      const dockNode = warehouseGraph.nodes.get(dockSlot.id) || warehouseGraph.findNearestNode(dockSlot.x, dockSlot.y);

      if (startNode && dockNode) {
        const path = warehouseGraph.findPath(startNode.id, dockNode.id);
        robot.setPath(path);
      }

      this.log(`[JOB ASSIGNED] Robot ${robot.id} dispatched -> Shelf ${shelf.num} (${itemName}) -> ${destination === 'PACKAGING_STATION' ? 'Packaging' : 'Delivery'}.`, 'success');
      return { success: true, orderId };
    }

    if (jobType === 'Charge') {
      const bay = this.battery.getAvailableChargingBay(robot.id, robot.bayId);
      robot.job = { type: 'Charge', bayId: bay.id };
      robot.state = 'RETURNING_CHARGE';
      robot.bayId = bay.id;

      const startNode = warehouseGraph.findNearestNode(robot.x, robot.y);
      const bayNode = warehouseGraph.nodes.get(bay.id);

      if (startNode && bayNode) {
        const path = warehouseGraph.findPath(startNode.id, bayNode.id);
        robot.setPath(path);
      }

      this.log(`[CHARGE ROUTE] Robot ${robot.id} navigating into Charging ${bay.name}.`, 'info');
      return { success: true };
    }

    if (jobType === 'Move') {
      const targetStation = options.targetStation || 'PACKAGING_STATION';
      const targetNodeId = targetStation === 'PACKAGING_STATION' ? 'STATION_PACK'
        : targetStation === 'DELIVERY_STATION' ? 'STATION_DELIVERY'
        : targetStation === 'INVENTORY_SYS' ? 'INVENTORY_DOCK'
        : 'STAGING_HUB_TOP';

      robot.job = { type: 'Move', target: targetStation };
      robot.state = 'EN_ROUTE_STATION';

      const startNode = warehouseGraph.findNearestNode(robot.x, robot.y);
      const targetNode = warehouseGraph.nodes.get(targetNodeId);

      if (startNode && targetNode) {
        const path = warehouseGraph.findPath(startNode.id, targetNode.id);
        robot.setPath(path);
      }

      this.log(`[MOVE JOB] Robot ${robot.id} moving to ${targetStation}.`, 'info');
      return { success: true };
    }

    return { success: false, reason: 'UNKNOWN_JOB_TYPE' };
  }

  cancelJob(robot) {
    if (!robot || !robot.job) return false;

    // Release any held shelf reservation
    if (robot.assignedShelf) {
      this.reservation.releaseShelf(robot.assignedShelf, robot.id);
      robot.assignedShelf = null;
    }

    // Release any held conveyor reservation
    if (robot.assignedConveyor) {
      this.reservation.releaseConveyor(robot.assignedConveyor, robot.id);
      robot.assignedConveyor = null;
    }

    this.log(`[JOB CANCELLED] Job for Robot ${robot.id} cancelled safely by operator.`, 'warning');
    robot.job = null;
    robot.state = 'IDLE';
    robot.path = [];
    robot.targetPoint = null;
    return true;
  }

  /**
   * Progress a robot through its active mission phases.
   */
  updateRobotMission(robot) {
    if (!robot.job) return;

    // PHASE 1: Reached Shelf Docking Port -> Begin Picking
    if (robot.state === 'EN_ROUTE_SHELF' && robot.targetPoint === null) {
      robot.state = 'PICKING';
      robot.actionTimer = 0;
      this.log(`[PICKING STARTED] Robot ${robot.id} arrived at Shelf ${robot.job.shelfNum}. Loading ${robot.job.itemName}...`, 'info');
      return;
    }

    // PHASE 2: Picking Action in Progress
    if (robot.state === 'PICKING') {
      robot.actionTimer++;
      if (robot.actionTimer >= robot.maxActionTime) {
        // Pick complete! Update inventory & release shelf lock
        this.inventory.fulfillPick(robot.job.shelfId, robot.job.itemName);
        robot.cargo = robot.job.itemName;

        const nextQueued = this.reservation.releaseShelf(robot.job.shelfId, robot.id);
        robot.assignedShelf = null;

        // If another order was waiting for this shelf, dispatch it
        if (nextQueued) {
          this.activateQueuedOrder(nextQueued);
        }

        // Now reserve an available conveyor access lane (Conveyor Lane 1, 2, or 3)
        const targetStation = robot.job.destination || 'PACKAGING_STATION';
        const freeConv = this.reservation.getAvailableConveyor(targetStation);

        if (freeConv) {
          this.reservation.reserveConveyor(freeConv.id, robot.id);
          robot.assignedConveyor = freeConv.id;
          robot.state = 'EN_ROUTE_CONVEYOR';

          // Plan route from shelf dock -> center transit -> conveyor feeder -> conveyor drop
          const startNode = warehouseGraph.findNearestNode(robot.x, robot.y);
          const dropNodeId = freeConv.id === 'CONV-1' ? 'CONV_DROP_1' : freeConv.id === 'CONV-2' ? 'CONV_DROP_2' : 'CONV_DROP_3';
          const dropNode = warehouseGraph.nodes.get(dropNodeId);

          if (startNode && dropNode) {
            const path = warehouseGraph.findPath(startNode.id, dropNode.id);
            robot.setPath(path);
          }
          this.log(`[EN ROUTE CONVEYOR] Robot ${robot.id} carrying ${robot.cargo} heading to ${freeConv.name}.`, 'info');
        } else {
          // All conveyors occupied! Wait in center transit holding point
          robot.state = 'WAITING_RESOURCE';
          this.log(`[WAITING CONVEYOR] All conveyor access lanes occupied! Robot ${robot.id} holding at safe transit point.`, 'warning');
        }
      }
      return;
    }

    // PHASE 3: Reached Conveyor Lane Drop -> Begin Deposit
    if (robot.state === 'EN_ROUTE_CONVEYOR' && robot.targetPoint === null) {
      robot.state = 'UNLOADING';
      robot.actionTimer = 0;
      if (robot.assignedConveyor) {
        this.reservation.setConveyorOccupied(robot.assignedConveyor, robot.id);
      }
      this.log(`[DEPOSITING GOODS] Robot ${robot.id} transferring ${robot.cargo} onto conveyor lane...`, 'info');
      return;
    }

    // PHASE 4: Unloading Complete -> Deposit into Station & Release Conveyor
    if (robot.state === 'UNLOADING') {
      robot.actionTimer++;
      if (robot.actionTimer >= robot.maxActionTime) {
        const depositedItem = robot.cargo;
        robot.cargo = null;

        if (robot.assignedConveyor) {
          this.reservation.releaseConveyor(robot.assignedConveyor, robot.id);
          robot.assignedConveyor = null;
        }

        const destination = robot.job.destination || 'PACKAGING_STATION';
        this.log(`[ORDER DELIVERED] Order #${robot.job.orderId} COMPLETED! ${depositedItem} deposited at ${destination === 'PACKAGING_STATION' ? 'Packaging Station' : 'Delivery Station'}.`, 'success');

        this.completedOrders.push({
          ...robot.job,
          completedAt: Date.now()
        });

        // Check if robot has low battery (<25%)
        const bay = this.battery.getAvailableChargingBay(robot.id, robot.bayId);
        robot.bayId = bay.id;

        if (robot.battery <= 25) {
          robot.requestEmergencyCharging();
        } else {
          robot.job = null;
          robot.state = 'RETURNING_TO_BAY';
        }

        // Forward route back to Dedicated Bay
        const startNode = warehouseGraph.findNearestNode(robot.x, robot.y);
        const bayNode = warehouseGraph.nodes.get(bay.id);
        if (startNode && bayNode) {
          const path = warehouseGraph.findPath(startNode.id, bayNode.id);
          robot.setPath(path);
        }
      }
      return;
    }

    // PHASE 5: Arrived at Charging Station Bay or Staging Stall
    if ((robot.state === 'RETURNING_CHARGE' || robot.state === 'RETURNING_TO_BAY') && robot.targetPoint === null) {
      const bay = STATIONS.charging.bays.find(b => b.id === robot.bayId) || STATIONS.charging.bays[0];
      robot.x = bay.x;
      robot.y = bay.y;
      robot.heading = 0; // cleanly aligned facing outward into warehouse!
      if (robot.state === 'RETURNING_CHARGE') {
        robot.state = 'CHARGING';
        this.log(`[CHARGING DOCKED] Robot ${robot.id} cleanly docked in ${bay.name}. Charging initiated.`, 'info');
      } else {
        robot.state = 'IDLE';
        this.log(`[STAGING PARKED] Robot ${robot.id} parked cleanly in ${bay.name}. Ready for next assignment.`, 'info');
      }
      return;
    }

    // PHASE 6: Retry conveyor allocation if previously waiting
    if (robot.state === 'WAITING_RESOURCE' && robot.cargo) {
      const targetStation = robot.job ? robot.job.destination : 'PACKAGING_STATION';
      const freeConv = this.reservation.getAvailableConveyor(targetStation);
      if (freeConv) {
        this.reservation.reserveConveyor(freeConv.id, robot.id);
        robot.assignedConveyor = freeConv.id;
        robot.state = 'EN_ROUTE_CONVEYOR';

        const startNode = warehouseGraph.findNearestNode(robot.x, robot.y);
        const dropNodeId = freeConv.id === 'CONV-1' ? 'CONV_DROP_1' : freeConv.id === 'CONV-2' ? 'CONV_DROP_2' : 'CONV_DROP_3';
        const dropNode = warehouseGraph.nodes.get(dropNodeId);

        if (startNode && dropNode) {
          const path = warehouseGraph.findPath(startNode.id, dropNode.id);
          robot.setPath(path);
        }
        this.log(`[CONVEYOR ALLOCATED] ${freeConv.name} is now available. Robot ${robot.id} proceeding to drop.`, 'success');
      }
    }
  }

  activateQueuedOrder(queuedItem) {
    // If an order was waiting for a shelf that just opened up
    this.log(`[DISPATCH RESUMED] Processing queued order for Robot ${queuedItem.robotId} at Shelf ${queuedItem.shelfId}.`, 'info');
  }

  /**
   * Automatic background dispatcher for multi-robot demonstration.
   */
  tickAutoDispatcher(robots) {
    if (!this.autoDispatchEnabled) return;
    this.autoDispatchTimer++;

    // Try dispatching an order every 180 frames (~3 seconds)
    if (this.autoDispatchTimer >= 180) {
      this.autoDispatchTimer = 0;
      const freeRobot = robots.find(r => r.isFree());
      if (freeRobot) {
        const randomShelf = Math.floor(Math.random() * 4) + 1;
        const randomDest = Math.random() > 0.5 ? 'PACKAGING_STATION' : 'DELIVERY_STATION';
        this.assignJob(freeRobot, 'Pick goods', { shelfNum: randomShelf, destination: randomDest });
      }
    }
  }
}
