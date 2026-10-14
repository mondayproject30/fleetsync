import React, { useState } from 'react';
import { Play, Send, Plus, Minus, ToggleLeft, ToggleRight, CheckSquare, Layers, Clock, AlertCircle } from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine.js';
import { SHELVES, STATIONS } from '../engine/warehouseLayout.js';

export function JobAssignment({ state, selectedRobotId, onSelectRobot }) {
  const { robots = [], pendingOrdersCount = 0, autoDispatchEnabled = false } = state || {};

  const [robotId, setRobotId] = useState(selectedRobotId || (robots[0] ? robots[0].id : 'R1'));
  const [jobType, setJobType] = useState('Pick goods');
  const [shelfNum, setShelfNum] = useState(2);
  const [destination, setDestination] = useState('PACKAGING_STATION');
  const [dispatchFeedback, setDispatchFeedback] = useState(null);

  // Sync state if selectedRobotId changes externally
  React.useEffect(() => {
    if (selectedRobotId) {
      setRobotId(selectedRobotId);
    }
  }, [selectedRobotId]);

  const handleDispatch = (e) => {
    e.preventDefault();
    const targetBot = simulationEngine.robots.find(r => r.id === robotId);
    if (!targetBot) {
      setDispatchFeedback({ type: 'error', text: `AMR ${robotId} not found.` });
      return;
    }

    const result = simulationEngine.scheduler.assignJob(targetBot, jobType, {
      shelfNum: Number(shelfNum),
      destination
    });

    if (result.success) {
      setDispatchFeedback({
        type: 'success',
        text: `Job assigned to ${robotId} -> Shelf ${shelfNum} -> ${destination === 'PACKAGING_STATION' ? 'Packaging' : 'Delivery'}`
      });
    } else if (result.queued) {
      setDispatchFeedback({
        type: 'warning',
        text: `Shelf ${shelfNum} is locked! Order queued for ${robotId}.`
      });
    } else {
      setDispatchFeedback({
        type: 'error',
        text: `Failed: ${result.reason}`
      });
    }

    setTimeout(() => setDispatchFeedback(null), 4000);
  };

  const toggleAutoDispatch = () => {
    simulationEngine.scheduler.autoDispatchEnabled = !simulationEngine.scheduler.autoDispatchEnabled;
  };

  return (
    <div className="panel job-assignment-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Layers className="icon-sm text-cyan" />
          <span>Job Assignment & Dispatch</span>
        </div>
        <div className="auto-toggle-wrap" onClick={toggleAutoDispatch} title="Toggle Autonomous Job Scheduler">
          <span className="toggle-label">Auto Dispatch:</span>
          {autoDispatchEnabled ? (
            <span className="badge badge-green flex items-center gap-1 cursor-pointer">
              <ToggleRight className="icon-xs" /> ON
            </span>
          ) : (
            <span className="badge badge-muted flex items-center gap-1 cursor-pointer">
              <ToggleLeft className="icon-xs" /> OFF
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleDispatch} className="assignment-form">
        {/* Select Robot */}
        <div className="form-group">
          <label className="form-label">SELECT AMR UNIT</label>
          <div className="robot-select-chips">
            {robots.map(r => (
              <button
                type="button"
                key={r.id}
                className={`chip-btn ${robotId === r.id ? 'active' : ''}`}
                onClick={() => {
                  setRobotId(r.id);
                  onSelectRobot && onSelectRobot(r.id);
                }}
              >
                <span className="chip-dot" style={{ backgroundColor: r.color }} />
                <span>{r.id}</span>
                <span className="chip-bat">({r.battery}%)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Job Type */}
        <div className="form-group">
          <label className="form-label">JOB TYPE</label>
          <select
            className="form-select"
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
          >
            <option value="Pick goods">Pick goods from Storage Shelf</option>
            <option value="Charge">Return to Charging Station</option>
            <option value="Move">Move to Specified Station</option>
          </select>
        </div>

        {/* Options for 'Pick goods' */}
        {jobType === 'Pick goods' && (
          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">TARGET SHELF</label>
              <select
                className="form-select"
                value={shelfNum}
                onChange={(e) => setShelfNum(Number(e.target.value))}
              >
                {SHELVES.map(s => (
                  <option key={s.id} value={s.num}>
                    Shelf {s.num} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group flex-1">
              <label className="form-label">DESTINATION STATION</label>
              <select
                className="form-select"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="PACKAGING_STATION">Packaging Station (Top)</option>
                <option value="DELIVERY_STATION">Delivery Station (Bottom)</option>
              </select>
            </div>
          </div>
        )}

        {/* Dispatch Button */}
        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
          <Send className="icon-sm" />
          <span>Dispatch Robot {robotId}</span>
        </button>

        {/* Feedback Alert */}
        {dispatchFeedback && (
          <div className={`feedback-alert feedback-${dispatchFeedback.type}`}>
            <AlertCircle className="icon-xs" />
            <span>{dispatchFeedback.text}</span>
          </div>
        )}
      </form>

      {/* Queue Status summary */}
      <div className="queue-status-bar">
        <div className="queue-item">
          <Clock className="icon-xs text-orange" />
          <span>Waiting Queue: <strong>{pendingOrdersCount}</strong></span>
        </div>
        <div className="queue-item">
          <CheckSquare className="icon-xs text-green" />
          <span>Delivered: <strong>{state?.completedOrdersCount || 0}</strong></span>
        </div>
      </div>
    </div>
  );
}
