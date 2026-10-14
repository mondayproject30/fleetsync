import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, X } from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine.js';

export function AlertModal({ alert, onClose }) {
  if (!alert) return null;

  const handleClearTrack = () => {
    simulationEngine.sensor.clearAllObstacles();
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="alert-modal-card">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <ShieldAlert className="icon-md text-red" />
            <h3 className="modal-title">AI Vision & LiDAR Hazard Alert</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X className="icon-sm" />
          </button>
        </div>

        <div className="modal-body">
          <div className="alert-badge-row">
            <span className="badge badge-red font-mono">EMERGENCY STOP ENGAGED</span>
            <span className="badge badge-orange font-mono">OBJECT: {alert.category}</span>
          </div>

          <p className="modal-desc">
            Autonomous Mobile Robot <strong>{alert.robotId}</strong> optical sensor and 5m LiDAR detected a hazard obstructing its trajectory:
          </p>

          <div className="hazard-quote-box">
            <AlertTriangle className="icon-sm text-orange flex-shrink-0" />
            <span>"{alert.message}"</span>
          </div>

          <p className="modal-safety-note font-xs text-muted">
            The robot has halted safely per ISO 3691-4 industrial safety standards. Lower-priority robots will yield or hold at their safe side lanes.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Acknowledge & Monitor
          </button>
          <button className="btn-danger flex items-center gap-1.5" onClick={handleClearTrack}>
            <CheckCircle className="icon-xs" />
            <span>Clear Floor Hazard & Resume</span>
          </button>
        </div>
      </div>
    </div>
  );
}
