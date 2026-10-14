import React from 'react';
import { ShieldCheck, Lock, Unlock, Clock, Radio, Activity, RefreshCw } from 'lucide-react';
import { SHELVES } from '../engine/warehouseLayout.js';
import { simulationEngine } from '../engine/simulationEngine.js';

export function ResourcePanel({ state }) {
  const { shelfLocks = [], conveyors = [] } = state || {};

  const anyLocksActive = shelfLocks.some(l => l.lockedBy !== null) || conveyors.some(c => c.state !== 'FREE');

  return (
    <div className="panel resource-panel">
      <div className="panel-header">
        <div className="panel-title">
          <ShieldCheck className="icon-sm text-cyan" />
          <span>Resource Locking & Conveyors</span>
        </div>
        <div className="flex items-center gap-2">
          {anyLocksActive && (
            <button
              className="btn-clear-locks"
              onClick={() => simulationEngine.clearAllLocks()}
              title="Release all shelf and conveyor locks immediately"
            >
              <Unlock className="icon-xs" />
              <span>Clear All Locks</span>
            </button>
          )}
          <span className="badge badge-muted">Real-Time Locks</span>
        </div>
      </div>

      <div className="resource-sections">
        {/* Shelf Locks */}
        <div className="resource-subgroup">
          <span className="subgroup-title">STORAGE SHELVES (EXCLUSIVE LOCKS)</span>
          <div className="shelf-status-grid">
            {SHELVES.map(s => {
              const lock = shelfLocks.find(l => l.shelfId === s.id);
              const isLocked = lock && lock.lockedBy !== null;
              const waitingCount = lock ? lock.waitingQueue.length : 0;

              return (
                <div key={s.id} className={`shelf-card ${isLocked ? 'locked' : 'available'}`}>
                  <div className="shelf-card-header">
                    <span className="shelf-num-tag">Shelf {s.num}</span>
                    {isLocked ? (
                      <div className="flex items-center gap-1">
                        <span className="lock-tag text-orange flex items-center gap-1 font-xs">
                          <Lock className="icon-xs" /> Locked
                        </span>
                        <button
                          className="btn-unlock-badge"
                          onClick={() => simulationEngine.forceUnlockShelf(s.id)}
                          title={`Unlock Shelf ${s.num}`}
                        >
                          Unlock
                        </button>
                      </div>
                    ) : (
                      <span className="lock-tag text-green flex items-center gap-1 font-xs">
                        <Unlock className="icon-xs" /> Free
                      </span>
                    )}
                  </div>
                  <div className="shelf-card-body">
                    <div className="shelf-owner-line">
                      {isLocked ? (
                        <span>Owner: <strong className="text-cyan">{lock.lockedBy}</strong></span>
                      ) : (
                        <span className="text-muted">Available for dispatch</span>
                      )}
                    </div>
                    {waitingCount > 0 && (
                      <div className="shelf-waiting-badge">
                        <Clock className="icon-xs text-orange" />
                        <span>{waitingCount} in waiting queue</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conveyor Access Lanes */}
        <div className="resource-subgroup">
          <span className="subgroup-title">CONVEYOR ACCESS LANES</span>
          <div className="conveyor-status-grid">
            {conveyors.map((c, i) => {
              const isFree = c.state === 'FREE';
              const isOccupied = c.state === 'OCCUPIED';
              const isReserved = c.state === 'RESERVED';

              return (
                <div key={c.id} className={`conveyor-card state-${c.state.toLowerCase()}`}>
                  <div className="conveyor-card-header">
                    <span className="conv-name">Lane {i + 1}</span>
                    <div className="flex items-center gap-1">
                      <span className={`conv-state-badge badge-${isFree ? 'green' : isOccupied ? 'red' : 'orange'}`}>
                        {c.state}
                      </span>
                      {!isFree && (
                        <button
                          className="btn-unlock-badge"
                          onClick={() => simulationEngine.forceUnlockConveyor(c.id)}
                          title={`Free Conveyor Lane ${i + 1}`}
                        >
                          Unlock
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="conveyor-card-body">
                    <div className="conv-alloc-text">
                      {c.reservedBy ? (
                        <span>Reserved by: <strong className="text-cyan">{c.reservedBy}</strong></span>
                      ) : (
                        <span className="text-muted">Ready for deposit</span>
                      )}
                    </div>
                    <div className="conv-target-line text-muted font-xs">
                      → {c.targetStation.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
