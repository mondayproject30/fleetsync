/**
 * Master Simulation Engine
 * - Decouples simulation physics and state machine updates from React rendering
 * - Orchestrates A* Pathfinding, Exclusive Reservations, Sensors, V2V Mesh, and Conflict Resolution
 * - Supports variable simulation speeds, pause/resume, single-step, reset
 */

import { WAREHOUSE_CONFIG, SHELVES, STATIONS } from './warehouseLayout.js';
import { warehouseGraph } from './astar.js';
import { Robot, ROBOT_COLORS } from './robotManager.js';
import { ReservationManager } from './reservationManager.js';
import { InventoryManager } from './inventoryManager.js';
import { SensorSimulator } from './sensorSimulator.js';
import { CommunicationManager } from './communicationManager.js';
import { CollisionResolver } from './collisionResolver.js';
import { BatteryManager } from './batteryManager.js';
import { TaskScheduler } from './taskScheduler.js';

export class SimulationEngine {
  constructor() {
    this.isRunning = true;
    this.speedMultiplier = 1;
    this.animationFrameId = null;

    // Subsystems
    this.eventListeners = new Set();
    this.logListeners = new Set();
    this.alertListeners = new Set();

    this.reservation = new ReservationManager(this.emitLog.bind(this));
    this.inventory = new InventoryManager(this.emitLog.bind(this));
    this.battery = new BatteryManager(this.emitLog.bind(this));
    this.sensor = new SensorSimulator(this.emitLog.bind(this));
    this.comm = new CommunicationManager(this.emitLog.bind(this));
    this.collision = new CollisionResolver(this.reservation, this.emitLog.bind(this));
    this.scheduler = new TaskScheduler(this.reservation, this.inventory, this.battery, this.emitLog.bind(this));

    // Fleet
    this.robots = [];
    this.initFleet();

    // Visualization Toggles
    this.showRoutes = true;
    this.showLidar = true;
    this.showWifiMesh = true;
    this.show3LaneOverlay = true;

    // Start Simulation Loop
    this.startLoop();
  }

  initFleet() {
    this.robots = [];
    this.battery.bayAssignments.clear();
    const initialCount = 4;
    for (let i = 0; i < initialCount; i++) {
      const bay = STATIONS.charging.bays[i];
      const r = new Robot(
        `R${i + 1}`,
        `AMR-0${i + 1}`,
        bay.x,
        bay.y,
        ROBOT_COLORS[i % ROBOT_COLORS.length],
        bay.id
      );
      r.heading = 0;
      r.battery = 95 - i * 15;
      this.battery.bayAssignments.set(bay.id, r.id);
      this.robots.push(r);
    }
    this.emitLog(`[SYSTEM INITIALIZED] FleetSync v1.3 online with ${this.robots.length} AMRs in Charging Bays.`, 'success');
  }

  addRobot() {
    if (this.robots.length >= WAREHOUSE_CONFIG.maxRobots) {
      this.emitLog(`[FLEET LIMIT] Maximum of ${WAREHOUSE_CONFIG.maxRobots} AMRs reached.`, 'warning');
      return null;
    }
    const idx = this.robots.length;
    const bay = STATIONS.charging.bays[idx] || STATIONS.charging.bays[0];
    const newBot = new Robot(
      `R${idx + 1}`,
      `AMR-0${idx + 1}`,
      bay.x,
      bay.y,
      ROBOT_COLORS[idx % ROBOT_COLORS.length],
      bay.id
    );
    newBot.heading = 0;
    this.battery.bayAssignments.set(bay.id, newBot.id);
    this.robots.push(newBot);
    this.emitLog(`[FLEET EXPANDED] Robot ${newBot.id} added at ${bay.name}.`, 'success');
    return newBot;
  }

  removeRobot(robotId) {
    if (this.robots.length <= 1) {
      this.emitLog(`[FLEET LIMIT] Minimum 1 AMR required in simulation.`, 'warning');
      return false;
    }
    const idx = this.robots.findIndex(r => r.id === robotId);
    if (idx !== -1) {
      const bot = this.robots[idx];
      this.scheduler.cancelJob(bot);
      this.robots.splice(idx, 1);
      this.emitLog(`[FLEET REDUCED] Robot ${bot.id} decommissioned.`, 'info');
      return true;
    }
    return false;
  }

  startLoop() {
    const loop = () => {
      if (this.isRunning) {
        try {
          for (let s = 0; s < this.speedMultiplier; s++) {
            this.stepSimulation();
          }
        } catch (err) {
          console.error('[SIMULATION TICK ERROR]', err);
        }
      }
      this.notifyListeners();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Deterministic Simulation Tick.
   */
  stepSimulation() {
    // 1. Update moving obstacles (e.g. human walking)
    this.sensor.updateObstacles();

    // 2. Peer-to-peer V2V mesh telemetry broadcast & communication links
    this.comm.broadcastAndSync(this.robots);

    // 3. Decentralized Conflict & Priority Resolution
    this.collision.resolveFleetConflicts(this.robots, this.sensor.obstacles);

    // 4. Update each robot
    for (const robot of this.robots) {
      // Run LiDAR scanning
      const scan = this.sensor.scanForRobot(robot, this.robots);
      robot.lidarAlert = scan.slowDown || scan.emergencyStop;
      robot.detectedObstacles = scan.detectedObjects;

      if (scan.alertMessage && !robot.hasTriggeredScanAlert) {
        robot.hasTriggeredScanAlert = true;
        this.emitAlert({
          robotId: robot.id,
          message: scan.alertMessage,
          category: scan.detectedObjects[0]?.classification?.category || 'Obstacle'
        });
      } else if (!scan.alertMessage) {
        robot.hasTriggeredScanAlert = false;
      }

      // Determine movement speed based on sensor / yielding
      let effectiveSpeed = robot.speed;
      if (scan.emergencyStop || robot.state === 'BLOCKED' || robot.state === 'WAITING_YIELD') {
        effectiveSpeed = 0;
      } else if (scan.slowDown) {
        effectiveSpeed = robot.speed * 0.45;
      }

      // Step kinematics along path with non-penetration guard
      const wasMoving = effectiveSpeed > 0 && robot.targetPoint !== null;
      if (wasMoving) {
        const reachedWaypoint = robot.stepTowardsTarget(effectiveSpeed, this.robots);
        if (reachedWaypoint) {
          if (robot.state === 'EVADING_RIGHT') {
            robot.state = 'WAITING_YIELD';
          } else {
            const pathFinished = robot.advanceWaypoint();
            if (pathFinished && robot.state === 'YIELDING') {
              // Reached yield holding spot -> wait for winner to pass
              robot.state = 'WAITING_YIELD';
            }
          }
        }
      }

      // If waiting yield or evading right, check if conflict partner has passed
      if ((robot.state === 'WAITING_YIELD' || robot.state === 'EVADING_RIGHT') && (robot.yieldingFor || robot.evasionPartnerId)) {
        const partnerId = robot.yieldingFor || robot.evasionPartnerId;
        const partner = this.robots.find(r => r.id === partnerId);
        const elapsed = robot.blockedSince ? (Date.now() - robot.blockedSince) : 0;
        if (!partner || Math.hypot(partner.x - robot.x, partner.y - robot.y) > 75 || elapsed > 3500) {
          robot.hasLoggedEvasion = false;
          robot.resumeFromYield();
        }
      }

      // Update battery consumption
      const isPicking = robot.state === 'PICKING' || robot.state === 'UNLOADING';
      this.battery.updateBattery(robot, wasMoving, isPicking);

      // Progress active mission through scheduler lifecycle
      this.scheduler.updateRobotMission(robot);
    }

    // 5. Automatic task dispatcher tick
    this.scheduler.tickAutoDispatcher(this.robots);
  }

  // Event Subscription
  subscribe(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  subscribeLogs(callback) {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  subscribeAlerts(callback) {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  notifyListeners() {
    for (const cb of this.eventListeners) {
      cb(this.getStateSnapshot());
    }
  }

  emitLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logItem = { id: Date.now() + Math.random(), timestamp, message, type };
    for (const cb of this.logListeners) {
      cb(logItem);
    }
  }

  emitAlert(alertData) {
    for (const cb of this.alertListeners) {
      cb(alertData);
    }
  }

  getStateSnapshot() {
    return {
      robots: this.robots.map(r => ({
        id: r.id,
        name: r.name,
        x: r.x,
        y: r.y,
        heading: r.heading,
        battery: Math.round(r.battery),
        color: r.color,
        state: r.state,
        cargo: r.cargo,
        job: r.job,
        path: r.path,
        waypointIndex: r.waypointIndex,
        lidarAlert: r.lidarAlert,
        detectedObstacles: r.detectedObstacles,
        assignedShelf: r.assignedShelf,
        assignedConveyor: r.assignedConveyor,
        priorityScore: this.collision.calculatePriorityScore(r)
      })),
      obstacles: [...this.sensor.obstacles],
      activeLinks: [...this.comm.activeLinks],
      conflictZones: [...this.collision.conflictZones],
      shelfLocks: Array.from(this.reservation.shelfLocks.values()),
      conveyors: Array.from(this.reservation.conveyorReservations.values()),
      inventory: this.inventory.getAllStockSummary(),
      completedOrdersCount: this.scheduler.completedOrders.length,
      pendingOrdersCount: this.scheduler.pendingQueue.length,
      autoDispatchEnabled: this.scheduler.autoDispatchEnabled,
      isRunning: this.isRunning,
      speedMultiplier: this.speedMultiplier,
      showRoutes: this.showRoutes,
      showLidar: this.showLidar,
      showWifiMesh: this.showWifiMesh,
      show3LaneOverlay: this.show3LaneOverlay
    };
  }

  clearAllLocks() {
    this.reservation.resetAll();
    for (const r of this.robots) {
      r.assignedShelf = null;
      r.assignedConveyor = null;
    }
    this.emitLog(`[OPERATOR OVERRIDE] All shelf and conveyor locks cleared. Fleet unblocked.`, 'warning');
  }

  forceUnlockShelf(shelfId) {
    this.reservation.forceUnlockShelf(shelfId);
    for (const r of this.robots) {
      if (r.assignedShelf === shelfId) {
        r.assignedShelf = null;
      }
    }
  }

  forceUnlockConveyor(convId) {
    this.reservation.forceUnlockConveyor(convId);
    for (const r of this.robots) {
      if (r.assignedConveyor === convId) {
        r.assignedConveyor = null;
      }
    }
  }

  reset() {
    this.reservation.resetAll();
    this.inventory.reset();
    this.battery.reset();
    this.sensor.clearAllObstacles();
    this.scheduler.pendingQueue = [];
    this.scheduler.activeOrders.clear();
    this.initFleet();
    this.emitLog(`[SIMULATION RESET] Warehouse, inventory and AMR fleet reset to initial state.`, 'info');
  }
}

// Global Singleton Instance
export const simulationEngine = new SimulationEngine();
