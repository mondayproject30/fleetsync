import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Plus, Minus, Eye, Radio, Shield, Layers } from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine.js';

export function SimulationControls({ state }) {
  const {
    isRunning = true,
    speedMultiplier = 1,
    showRoutes = true,
    showLidar = true,
    showWifiMesh = true,
    show3LaneOverlay = true,
    robots = []
  } = state || {};

  const togglePlay = () => {
    simulationEngine.isRunning = !simulationEngine.isRunning;
  };

  const setSpeed = (spd) => {
    simulationEngine.speedMultiplier = spd;
  };

  const handleReset = () => {
    simulationEngine.reset();
  };

  const handleAddRobot = () => {
    simulationEngine.addRobot();
  };

  const handleRemoveRobot = () => {
    if (robots.length > 0) {
      simulationEngine.removeRobot(robots[robots.length - 1].id);
    }
  };

  const toggleRoutes = () => {
    simulationEngine.showRoutes = !simulationEngine.showRoutes;
  };

  const toggleLidar = () => {
    simulationEngine.showLidar = !simulationEngine.showLidar;
  };

  const toggleMesh = () => {
    simulationEngine.showWifiMesh = !simulationEngine.showWifiMesh;
  };

  const toggle3Lane = () => {
    simulationEngine.show3LaneOverlay = !simulationEngine.show3LaneOverlay;
  };

  return (
    <div className="sim-controls-bar">
      {/* Primary Play/Pause/Reset */}
      <div className="controls-group">
        <button
          className={`btn-ctrl ${isRunning ? 'btn-ctrl-active' : 'btn-ctrl-play'}`}
          onClick={togglePlay}
          title={isRunning ? 'Pause Simulation' : 'Resume Simulation'}
        >
          {isRunning ? <Pause className="icon-sm" /> : <Play className="icon-sm" />}
          <span>{isRunning ? 'Pause' : 'Resume'}</span>
        </button>

        <button
          className="btn-ctrl btn-ctrl-reset"
          onClick={handleReset}
          title="Reset All AMRs, Tasks, and Shelves"
        >
          <RotateCcw className="icon-sm" />
          <span>Reset</span>
        </button>
      </div>

      {/* Speed Multipliers */}
      <div className="controls-group speed-group">
        <span className="group-label">SPEED:</span>
        {[0.5, 1, 2, 4].map(spd => (
          <button
            key={spd}
            className={`btn-speed ${speedMultiplier === spd ? 'active' : ''}`}
            onClick={() => setSpeed(spd)}
          >
            {spd}x
          </button>
        ))}
      </div>

      {/* Fleet Size (+ / -) */}
      <div className="controls-group fleet-size-group">
        <span className="group-label">FLEET ({robots.length}):</span>
        <button
          className="btn-mini"
          onClick={handleAddRobot}
          disabled={robots.length >= 6}
          title="Add another AMR to charging bays"
        >
          <Plus className="icon-xs" />
        </button>
        <button
          className="btn-mini"
          onClick={handleRemoveRobot}
          disabled={robots.length <= 1}
          title="Remove last AMR"
        >
          <Minus className="icon-xs" />
        </button>
      </div>

      {/* Map Overlays Toggles */}
      <div className="controls-group overlays-group">
        <button
          className={`btn-toggle ${showRoutes ? 'active' : ''}`}
          onClick={toggleRoutes}
          title="Toggle A* Planned Routes"
        >
          <Eye className="icon-xs" />
          <span>Routes</span>
        </button>

        <button
          className={`btn-toggle ${showLidar ? 'active' : ''}`}
          onClick={toggleLidar}
          title="Toggle 5m LiDAR Sensor Cones"
        >
          <Radio className="icon-xs" />
          <span>5m LiDAR</span>
        </button>

        <button
          className={`btn-toggle ${showWifiMesh ? 'active' : ''}`}
          onClick={toggleMesh}
          title="Toggle V2V Wireless Mesh Links"
        >
          <Shield className="icon-xs" />
          <span>V2V Mesh</span>
        </button>

        <button
          className={`btn-toggle ${show3LaneOverlay ? 'active' : ''}`}
          onClick={toggle3Lane}
          title="Toggle Physical 3-Lane Roadbeds"
        >
          <Layers className="icon-xs" />
          <span>3 Lanes</span>
        </button>
      </div>
    </div>
  );
}
