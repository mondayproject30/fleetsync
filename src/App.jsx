import React, { useEffect, useState } from 'react';
import { simulationEngine } from './engine/simulationEngine.js';
import { WarehouseMap } from './components/WarehouseMap.jsx';
import { RobotPanel } from './components/RobotPanel.jsx';
import { JobAssignment } from './components/JobAssignment.jsx';
import { ResourcePanel } from './components/ResourcePanel.jsx';
import { ObstacleControls } from './components/ObstacleControls.jsx';
import { EventLog } from './components/EventLog.jsx';
import { SimulationControls } from './components/SimulationControls.jsx';
import { AlertModal } from './components/AlertModal.jsx';
import { ShieldAlert } from 'lucide-react';
import './style.css';

export function App() {
  const [simState, setSimState] = useState(() => simulationEngine.getStateSnapshot());
  const [logs, setLogs] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [selectedRobotId, setSelectedRobotId] = useState('R1');
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    // 1. Subscribe to Simulation State Updates
    const unsubscribeState = simulationEngine.subscribe((snapshot) => {
      setSimState(snapshot);
    });

    // 2. Subscribe to Simulation Telemetry Logs
    const unsubscribeLogs = simulationEngine.subscribeLogs((newLog) => {
      setLogs((prev) => [...prev.slice(-120), newLog]);
    });

    // 3. Subscribe to Emergency Sensor Alerts
    const unsubscribeAlerts = simulationEngine.subscribeAlerts((alert) => {
      setActiveAlert(alert);
    });

    // 4. Clock interval
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => {
      unsubscribeState();
      unsubscribeLogs();
      unsubscribeAlerts();
      clearInterval(clockInterval);
    };
  }, []);

  const handleShelfClick = (shelf) => {
    // Quick assign selected robot to this clicked shelf
    const selectedBot = simulationEngine.robots.find(r => r.id === selectedRobotId);
    if (selectedBot) {
      simulationEngine.scheduler.assignJob(selectedBot, 'Pick goods', {
        shelfNum: shelf.num,
        destination: 'PACKAGING_STATION'
      });
    }
  };

  const handleAddObstacleAt = (x, y) => {
    // Quick click on floor to place a fallen box obstacle
    simulationEngine.sensor.addObstacle('BOX', x, y);
  };

  const activeRobotsCount = simState.robots?.length || 0;
  const lowBatteryCount = simState.robots?.filter(r => r.battery <= 25).length || 0;
  const inTransitCount = simState.robots?.filter(r => r.state !== 'IDLE' && r.state !== 'CHARGING').length || 0;

  return (
    <div className="app-container">
      {/* 1. Industrial Navigation Header */}
      <header className="top-header">
        <div className="brand-section">
          <div className="brand-logo-icon">FS</div>
          <div>
            <h1 className="brand-title">
              FleetSync <span className="version">v1.3</span>
            </h1>
            <p className="brand-subtitle">Edge-AI Warehouse Robot Coordination Platform</p>
          </div>
        </div>

        <div className="header-telemetry">
          <div className="telemetry-chip">
            <span className="telemetry-label">SYSTEM TIME</span>
            <span className="telemetry-value">{currentTime}</span>
          </div>

          <div className="telemetry-chip">
            <span className="telemetry-label">ACTIVE FLEET</span>
            <span className="telemetry-value text-cyan">
              {inTransitCount} / {activeRobotsCount} In Transit
            </span>
          </div>

          <div className="telemetry-chip">
            <span className="telemetry-label">ORDERS COMPLETED</span>
            <span className="telemetry-value text-green">
              {simState.completedOrdersCount} Delivered
            </span>
          </div>

          {lowBatteryCount > 0 && (
            <div className="telemetry-chip">
              <span className="telemetry-label">LOW BATTERY</span>
              <span className="telemetry-value text-red flex items-center gap-1">
                <ShieldAlert className="icon-xs" /> {lowBatteryCount} AMRs Critical
              </span>
            </div>
          )}

          <div className="telemetry-chip">
            <span className="telemetry-label">SIM ENGINE</span>
            <span className="telemetry-value text-green flex items-center gap-1">
              <span className="badge badge-green">60 Hz</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. Simulation Playback & Overlays Controls Bar */}
      <SimulationControls state={simState} />

      {/* 3. Main Operational Dashboard */}
      <main className="dashboard-grid">
        {/* Left: AMR Fleet Telemetry Cards */}
        <section className="left-column">
          <RobotPanel
            robots={simState.robots}
            selectedRobotId={selectedRobotId}
            onSelectRobot={setSelectedRobotId}
          />
        </section>

        {/* Center: Interactive 2D Warehouse Blueprint Map */}
        <section className="center-column map-panel">
          <WarehouseMap
            state={simState}
            onShelfClick={handleShelfClick}
            onAddObstacleAt={handleAddObstacleAt}
          />
        </section>

        {/* Right: Job Assignment Dispatcher & Obstacle Injection */}
        <section className="right-column flex flex-col gap-4">
          <JobAssignment
            state={simState}
            selectedRobotId={selectedRobotId}
            onSelectRobot={setSelectedRobotId}
          />

          <ObstacleControls
            state={simState}
          />
        </section>
      </main>

      {/* 4. Bottom Resource Locks & Telemetry Event Log */}
      <section className="bottom-section">
        <ResourcePanel state={simState} />
        <EventLog logs={logs} onClearLogs={() => setLogs([])} />
      </section>

      {/* 5. Optical Camera AI Safety Alert Modal */}
      {activeAlert && (
        <AlertModal
          alert={activeAlert}
          onClose={() => setActiveAlert(null)}
        />
      )}
    </div>
  );
}
