/**
 * Reservation Manager: Exclusive Resource Allocation
 * - Exclusive Shelf Locks (Shelf 1, 2, 3, 4)
 * - Conveyor Access Lane Reservations (Conveyor Lane 1, 2, 3)
 * - Critical Junction Resource Locking
 * - FIFO Order Waiting Queue for Contested Resources
 */

import { SHELVES, STATIONS } from './warehouseLayout.js';

export class ReservationManager {
  constructor(onEventLog) {
    this.log = onEventLog || console.log;

    // Shelf locks: Map<shelfId, { lockedBy: string|null, lockedAt: number|null, waitingQueue: Array<any> }>
    this.shelfLocks = new Map();
    SHELVES.forEach(shelf => {
      this.shelfLocks.set(shelf.id, {
        shelfId: shelf.id,
        num: shelf.num,
        name: shelf.name,
        lockedBy: null,
        lockedAt: null,
        waitingQueue: []
      });
    });

    // Conveyor reservations: Map<convId, { id, name, state: 'FREE'|'RESERVED'|'OCCUPIED'|'BLOCKED', reservedBy: string|null }>
    this.conveyorReservations = new Map();
    STATIONS.conveyors.forEach(conv => {
      this.conveyorReservations.set(conv.id, {
        id: conv.id,
        name: conv.name,
        targetStation: conv.targetStation,
        state: 'FREE',
        reservedBy: null,
        reservedAt: null
      });
    });

    // Node & Junction Exclusive Locks: Map<nodeId, { reservedBy: string, expiresAt: number }>
    this.nodeLocks = new Map();
  }

  // =========================================================================
  // SHELF RESERVATIONS
  // =========================================================================

  isShelfLocked(shelfId) {
    const lock = this.shelfLocks.get(shelfId);
    return lock && lock.lockedBy !== null;
  }

  getShelfOwner(shelfId) {
    const lock = this.shelfLocks.get(shelfId);
    return lock ? lock.lockedBy : null;
  }

  getShelfWaitingQueue(shelfId) {
    const lock = this.shelfLocks.get(shelfId);
    return lock ? lock.waitingQueue : [];
  }

  /**
   * Acquire exclusive reservation for a shelf.
   * Returns { success: true } or { success: false, queued: true, owner: string }
   */
  reserveShelf(shelfId, robotId, orderData = {}) {
    const lock = this.shelfLocks.get(shelfId);
    if (!lock) return { success: false, reason: 'INVALID_SHELF' };

    if (lock.lockedBy === null) {
      lock.lockedBy = robotId;
      lock.lockedAt = Date.now();
      this.log(`[SHELF LOCK] Shelf ${lock.num} exclusively RESERVED by Robot ${robotId}.`, 'lock');
      return { success: true, owner: robotId };
    }

    if (lock.lockedBy === robotId) {
      return { success: true, owner: robotId, alreadyOwned: true };
    }

    // Shelf already locked! Add to waiting queue
    const queuedOrder = { robotId, shelfId, orderData, queuedAt: Date.now() };
    if (!lock.waitingQueue.some(q => q.robotId === robotId)) {
      lock.waitingQueue.push(queuedOrder);
      this.log(`[CONTENTION] Shelf ${lock.num} is LOCKED by Robot ${lock.lockedBy}. Robot ${robotId} added to Waiting Queue (#${lock.waitingQueue.length}).`, 'warning');
    }
    return { success: false, queued: true, owner: lock.lockedBy, queuePosition: lock.waitingQueue.length };
  }

  /**
   * Release shelf reservation and grant to next waiting robot if any.
   */
  releaseShelf(shelfId, robotId) {
    const lock = this.shelfLocks.get(shelfId);
    if (!lock) return null;

    if (lock.lockedBy !== robotId) {
      return null; // Not owner
    }

    this.log(`[SHELF RELEASE] Shelf ${lock.num} RELEASED by Robot ${robotId}.`, 'info');
    lock.lockedBy = null;
    lock.lockedAt = null;

    // Dispatch next in queue if available
    if (lock.waitingQueue.length > 0) {
      const next = lock.waitingQueue.shift();
      lock.lockedBy = next.robotId;
      lock.lockedAt = Date.now();
      this.log(`[QUEUE DISPATCH] Shelf ${lock.num} reservation now GRANTED to waiting Robot ${next.robotId}!`, 'success');
      return next;
    }

    return null;
  }

  // =========================================================================
  // CONVEYOR ACCESS LANE RESERVATIONS
  // =========================================================================

  getAvailableConveyor(preferredStation = null) {
    for (const [id, conv] of this.conveyorReservations.entries()) {
      if (conv.state === 'FREE') {
        if (!preferredStation || conv.targetStation === preferredStation) {
          return conv;
        }
      }
    }
    // Fallback: any free conveyor
    for (const [id, conv] of this.conveyorReservations.entries()) {
      if (conv.state === 'FREE') return conv;
    }
    return null;
  }

  reserveConveyor(convId, robotId) {
    const conv = this.conveyorReservations.get(convId);
    if (!conv) return false;

    if (conv.state === 'FREE') {
      conv.state = 'RESERVED';
      conv.reservedBy = robotId;
      conv.reservedAt = Date.now();
      this.log(`[CONVEYOR LANE] ${conv.name} RESERVED for Robot ${robotId}.`, 'lock');
      return true;
    }
    if (conv.reservedBy === robotId) return true;
    return false;
  }

  setConveyorOccupied(convId, robotId) {
    const conv = this.conveyorReservations.get(convId);
    if (conv && conv.reservedBy === robotId) {
      conv.state = 'OCCUPIED';
      this.log(`[CONVEYOR OCCUPIED] Robot ${robotId} docked at ${conv.name}. Transferring goods...`, 'info');
    }
  }

  releaseConveyor(convId, robotId) {
    const conv = this.conveyorReservations.get(convId);
    if (!conv) return;

    if (conv.reservedBy === robotId) {
      conv.state = 'FREE';
      conv.reservedBy = null;
      conv.reservedAt = null;
      this.log(`[CONVEYOR RELEASE] ${conv.name} is now FREE.`, 'success');
    }
  }

  // =========================================================================
  // JUNCTION & NODE RESERVATIONS
  // =========================================================================

  reserveNode(nodeId, robotId, durationMs = 2500) {
    const existing = this.nodeLocks.get(nodeId);
    const now = Date.now();
    if (existing && existing.reservedBy !== robotId && existing.expiresAt > now) {
      return false; // Reserved by someone else
    }
    this.nodeLocks.set(nodeId, { reservedBy: robotId, expiresAt: now + durationMs });
    return true;
  }

  releaseNode(nodeId, robotId) {
    const existing = this.nodeLocks.get(nodeId);
    if (existing && existing.reservedBy === robotId) {
      this.nodeLocks.delete(nodeId);
    }
  }

  isNodeReservedByOther(nodeId, robotId) {
    const existing = this.nodeLocks.get(nodeId);
    if (!existing) return false;
    return existing.reservedBy !== robotId && existing.expiresAt > Date.now();
  }

  getReservedNodeIds(forRobotId) {
    const set = new Set();
    const now = Date.now();
    for (const [nodeId, lock] of this.nodeLocks.entries()) {
      if (lock.reservedBy !== forRobotId && lock.expiresAt > now) {
        set.add(nodeId);
      }
    }
    return set;
  }

  forceUnlockShelf(shelfId) {
    const lock = this.shelfLocks.get(shelfId);
    if (lock) {
      const prevOwner = lock.lockedBy;
      lock.lockedBy = null;
      lock.lockedAt = null;
      lock.waitingQueue = [];
      this.log(`[MANUAL UNLOCK] Shelf ${lock.num} lock cleared by operator (was held by ${prevOwner || 'none'}).`, 'warning');
      return true;
    }
    return false;
  }

  forceUnlockConveyor(convId) {
    const conv = this.conveyorReservations.get(convId);
    if (conv) {
      const prevOwner = conv.reservedBy;
      conv.state = 'FREE';
      conv.reservedBy = null;
      conv.reservedAt = null;
      this.log(`[MANUAL UNLOCK] ${conv.name} lock cleared to FREE by operator (was held by ${prevOwner || 'none'}).`, 'warning');
      return true;
    }
    return false;
  }

  resetAll() {
    this.shelfLocks.forEach(lock => {
      lock.lockedBy = null;
      lock.lockedAt = null;
      lock.waitingQueue = [];
    });
    this.conveyorReservations.forEach(conv => {
      conv.state = 'FREE';
      conv.reservedBy = null;
      conv.reservedAt = null;
    });
    this.nodeLocks.clear();
  }

  clearAllLocks() {
    this.resetAll();
    this.log(`[RESOURCE UNLOCK] All shelf and conveyor locks cleared by operator.`, 'warning');
  }
}
