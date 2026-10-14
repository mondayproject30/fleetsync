import React from 'react';
import { AlertTriangle, UserCheck, Package, Ban, Trash2, Crosshair } from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine.js';

export function ObstacleControls({ state, isPlacingObstacle, setIsPlacingObstacle, obstaclePlacementType, setObstaclePlacementType }) {
  const { obstacles = [] } = state || {};

  const handleSpawnObstacle = (type) => {
    // Spawn at random location on main arterial routes
    const xPositions = [350, 555, 750, 400, 680];
    const yPositions = [390, 85, 670, 235, 515];
    const randX = xPositions[Math.floor(Math.random() * xPositions.length)];
    const randY = yPositions[Math.floor(Math.random() * yPositions.length)];

    simulationEngine.sensor.addObstacle(type, randX, randY);
  };

  const handleClearAll = () => {
    simulationEngine.sensor.clearAllObstacles();
  };

  return (
    <div className="panel obstacle-panel">
      <div className="panel-header">
        <div className="panel-title">
          <AlertTriangle className="icon-sm text-orange" />
          <span>LiDAR Obstacle Generator</span>
        </div>
        <span className="badge badge-orange">{obstacles.length} on Floor</span>
      </div>

      <div className="obstacle-buttons-grid">
        <button
          className="btn-obs btn-obs-human"
          onClick={() => handleSpawnObstacle('HUMAN')}
          title="Spawn moving human worker across corridors"
        >
          <UserCheck className="icon-xs" />
          <span>+ Human (Moving)</span>
        </button>

        <button
          className="btn-obs btn-obs-box"
          onClick={() => handleSpawnObstacle('BOX')}
          title="Place fallen box on robot transit lane"
        >
          <Package className="icon-xs" />
          <span>+ Fallen Box</span>
        </button>

        <button
          className="btn-obs btn-obs-barrier"
          onClick={() => handleSpawnObstacle('STATIC')}
          title="Place static barrier on aisle junction"
        >
          <Ban className="icon-xs" />
          <span>+ Static Barrier</span>
        </button>

        <button
          className="btn-obs btn-obs-clear"
          onClick={handleClearAll}
          disabled={obstacles.length === 0}
          title="Clear all dynamic obstacles"
        >
          <Trash2 className="icon-xs" />
          <span>Clear All</span>
        </button>
      </div>

      {/* Tip */}
      <div className="obstacle-hint">
        <Crosshair className="icon-xs text-muted" />
        <span className="text-muted font-xs">
          Click any lane on the map to introduce an obstacle directly on AMR path.
        </span>
      </div>
    </div>
  );
}
