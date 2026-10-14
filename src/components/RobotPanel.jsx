import React from 'react';
import { BatteryCharging, Battery, Package, AlertTriangle, Radio, Navigation, ShieldCheck, XCircle } from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine.js';

export function RobotPanel({ robots = [], onSelectRobot, selectedRobotId }) {
  const handleCharge = (e, robot) => {
    e.stopPropagation();
    simulationEngine.scheduler.assignJob(
      simulationEngine.robots.find(r => r.id === robot.id),
      'Charge'
    );
  };

  const handleCancel = (e, robot) => {
    e.stopPropagation();
    simulationEngine.scheduler.cancelJob(
      simulationEngine.robots.find(r => r.id === robot.id)
    );
  };

  return (
    <div className="panel robot-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Navigation className="icon-sm text-cyan" />
          <span>AMR Fleet Status</span>
        </div>
        <span className="badge badge-cyan">{robots.length} Units Online</span>
      </div>

      <div className="robot-list">
        {robots.map(r => {
          const isSelected = r.id === selectedRobotId;
          const isLow = r.battery <= 25;
          const hasCargo = r.cargo !== null;

          return (
            <div
              key={r.id}
              className={`robot-card ${isSelected ? 'selected' : ''} ${isLow ? 'card-low-battery' : ''}`}
              onClick={() => onSelectRobot && onSelectRobot(r.id)}
            >
              <div className="robot-card-top">
                <div className="robot-identity">
                  <span className="robot-dot" style={{ backgroundColor: r.color }} />
                  <span className="robot-id">{r.id}</span>
                  <span className="robot-name">{r.name}</span>
                </div>
                <div className="robot-state-tag">
                  <span className={`state-pill state-${r.state.toLowerCase()}`}>
                    {r.state.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Battery Meter */}
              <div className="robot-battery-row">
                <div className="battery-icon-label">
                  {r.state === 'CHARGING' ? (
                    <BatteryCharging className="icon-xs text-green" />
                  ) : (
                    <Battery className={`icon-xs ${isLow ? 'text-red' : 'text-green'}`} />
                  )}
                  <span className={`battery-val ${isLow ? 'text-red font-bold' : ''}`}>
                    {r.battery}%
                  </span>
                </div>
                <div className="battery-progress-track">
                  <div
                    className="battery-progress-bar"
                    style={{
                      width: `${r.battery}%`,
                      backgroundColor: isLow ? '#ff4757' : r.battery > 50 ? '#2ed573' : '#ffa502'
                    }}
                  />
                </div>
              </div>

              {/* Cargo & Coordinates */}
              <div className="robot-metrics-grid">
                <div className="metric-box">
                  <span className="metric-label">CARGO</span>
                  <div className="metric-value">
                    {hasCargo ? (
                      <span className="text-orange font-bold truncate">📦 {r.cargo}</span>
                    ) : (
                      <span className="text-muted">Empty</span>
                    )}
                  </div>
                </div>

                <div className="metric-box">
                  <span className="metric-label">POSITION</span>
                  <div className="metric-value font-mono">
                    ({Math.round(r.x)}, {Math.round(r.y)})
                  </div>
                </div>

                <div className="metric-box">
                  <span className="metric-label">PRIORITY</span>
                  <div className="metric-value font-mono text-cyan">
                    {r.priorityScore}
                  </div>
                </div>

                <div className="metric-box">
                  <span className="metric-label">RESERVATION</span>
                  <div className="metric-value text-muted truncate">
                    {r.assignedShelf ? `Shelf ${r.assignedShelf.replace('SHELF-', '')}` : r.assignedConveyor || 'None'}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="robot-actions-row">
                <button
                  className="btn-xs btn-outline-cyan"
                  onClick={(e) => handleCharge(e, r)}
                  title="Route directly to charging bay"
                  disabled={r.state === 'CHARGING'}
                >
                  <BatteryCharging className="icon-xs" /> Charge
                </button>
                {r.job && (
                  <button
                    className="btn-xs btn-outline-red"
                    onClick={(e) => handleCancel(e, r)}
                    title="Safely cancel job and clear locks"
                  >
                    <XCircle className="icon-xs" /> Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
