import React, { useRef } from 'react';
import { WAREHOUSE_CONFIG, SHELVES, STATIONS, THREE_LANE_CORRIDORS, BLUE_MARKERS, CONVEYOR_CENTRAL_COLUMN } from '../engine/warehouseLayout.js';

export function WarehouseMap({ state, onShelfClick, onAddObstacleAt }) {
  const svgRef = useRef(null);

  const {
    robots = [],
    obstacles = [],
    activeLinks = [],
    conflictZones = [],
    shelfLocks = [],
    conveyors = [],
    showRoutes = true,
    showLidar = true,
    showWifiMesh = true,
    show3LaneOverlay = true
  } = state || {};

  const handleSvgClick = (e) => {
    if (!svgRef.current || !onAddObstacleAt) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = WAREHOUSE_CONFIG.width / rect.width;
    const scaleY = WAREHOUSE_CONFIG.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    onAddObstacleAt(Math.round(x), Math.round(y));
  };

  return (
    <div className="warehouse-map-container">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WAREHOUSE_CONFIG.width} ${WAREHOUSE_CONFIG.height}`}
        className="warehouse-svg"
        onClick={handleSvgClick}
      >
        <defs>
          {/* Subtle Grid Pattern */}
          <pattern id="gridPattern" width={WAREHOUSE_CONFIG.gridStep} height={WAREHOUSE_CONFIG.gridStep} patternUnits="userSpaceOnUse">
            <path
              d={`M ${WAREHOUSE_CONFIG.gridStep} 0 L 0 0 0 ${WAREHOUSE_CONFIG.gridStep}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.04)"
              strokeWidth="1"
            />
          </pattern>

          {/* Yellow Arrow Marker */}
          <marker id="yellowArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#ffdd33" />
          </marker>
          <marker id="cyanArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#00d2ff" />
          </marker>

          {/* Glowing Filters */}
          <filter id="glowYellow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Dark Warehouse Floor Background & Grid */}
        <rect width={WAREHOUSE_CONFIG.width} height={WAREHOUSE_CONFIG.height} fill="#050811" />
        <rect width={WAREHOUSE_CONFIG.width} height={WAREHOUSE_CONFIG.height} fill="url(#gridPattern)" />

        {/* 2. Three-Lane Aisles Overlay & Clearly Visible Left/Right Lane Lines */}
        <g className="three-lane-roadways" opacity="0.95">
          {/* Mid Horizontal Corridor Roadbed */}
          <rect
            x={THREE_LANE_CORRIDORS.horizontalMid.xStart}
            y={THREE_LANE_CORRIDORS.horizontalMid.yTop}
            width={THREE_LANE_CORRIDORS.horizontalMid.xEnd - THREE_LANE_CORRIDORS.horizontalMid.xStart}
            height={THREE_LANE_CORRIDORS.horizontalMid.height}
            fill="#080e1c"
            stroke="rgba(0, 210, 255, 0.25)"
            strokeWidth="1.5"
          />

          {/* Lane 1: Left / Top Lane Line (y = 340) - Clearly Visible Cyan */}
          <line
            x1={THREE_LANE_CORRIDORS.horizontalMid.xStart}
            y1={THREE_LANE_CORRIDORS.horizontalMid.lane1Y}
            x2={THREE_LANE_CORRIDORS.horizontalMid.xEnd}
            y2={THREE_LANE_CORRIDORS.horizontalMid.lane1Y}
            stroke="#00d2ff"
            strokeWidth="2.2"
            strokeDasharray="9 5"
            markerEnd="url(#cyanArrow)"
          />

          {/* Mid Corridor Lane Dividers (Crisp Dashed White/Ice Lines) */}
          <line
            x1={THREE_LANE_CORRIDORS.horizontalMid.xStart}
            y1="365"
            x2={THREE_LANE_CORRIDORS.horizontalMid.xEnd}
            y2="365"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeDasharray="8 6"
            strokeWidth="1.6"
          />

          {/* Lane 3: Right / Bottom Lane Line (y = 440) - Clearly Visible Cyan */}
          <line
            x1={THREE_LANE_CORRIDORS.horizontalMid.xStart}
            y1={THREE_LANE_CORRIDORS.horizontalMid.lane3Y}
            x2={THREE_LANE_CORRIDORS.horizontalMid.xEnd}
            y2={THREE_LANE_CORRIDORS.horizontalMid.lane3Y}
            stroke="#00d2ff"
            strokeWidth="2.2"
            strokeDasharray="9 5"
            markerEnd="url(#cyanArrow)"
          />

          <line
            x1={THREE_LANE_CORRIDORS.horizontalMid.xStart}
            y1="415"
            x2={THREE_LANE_CORRIDORS.horizontalMid.xEnd}
            y2="415"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeDasharray="8 6"
            strokeWidth="1.6"
          />

          {/* Vertical Center Corridor Roadbed */}
          <rect
            x={THREE_LANE_CORRIDORS.verticalCenter.xLeft}
            y={THREE_LANE_CORRIDORS.verticalCenter.yStart}
            width={THREE_LANE_CORRIDORS.verticalCenter.width}
            height={THREE_LANE_CORRIDORS.verticalCenter.yEnd - THREE_LANE_CORRIDORS.verticalCenter.yStart}
            fill="#080e1c"
            stroke="rgba(0, 210, 255, 0.25)"
            strokeWidth="1.5"
          />

          {/* Vertical Lane 1: Left Lane Line (x = 515) - Clearly Visible Cyan */}
          <line
            x1={THREE_LANE_CORRIDORS.verticalCenter.lane1X}
            y1={THREE_LANE_CORRIDORS.verticalCenter.yStart}
            x2={THREE_LANE_CORRIDORS.verticalCenter.lane1X}
            y2={THREE_LANE_CORRIDORS.verticalCenter.yEnd}
            stroke="#00d2ff"
            strokeWidth="2.2"
            strokeDasharray="9 5"
            markerEnd="url(#cyanArrow)"
          />

          {/* Vertical Center Lane Dividers */}
          <line
            x1="535"
            y1={THREE_LANE_CORRIDORS.verticalCenter.yStart}
            x2="535"
            y2={THREE_LANE_CORRIDORS.verticalCenter.yEnd}
            stroke="rgba(255, 255, 255, 0.45)"
            strokeDasharray="8 6"
            strokeWidth="1.6"
          />

          {/* Vertical Lane 3: Right Lane Line (x = 595) - Clearly Visible Cyan */}
          <line
            x1={THREE_LANE_CORRIDORS.verticalCenter.lane3X}
            y1={THREE_LANE_CORRIDORS.verticalCenter.yStart}
            x2={THREE_LANE_CORRIDORS.verticalCenter.lane3X}
            y2={THREE_LANE_CORRIDORS.verticalCenter.yEnd}
            stroke="#00d2ff"
            strokeWidth="2.2"
            strokeDasharray="9 5"
            markerEnd="url(#cyanArrow)"
          />

          <line
            x1="575"
            y1={THREE_LANE_CORRIDORS.verticalCenter.yStart}
            x2="575"
            y2={THREE_LANE_CORRIDORS.verticalCenter.yEnd}
            stroke="rgba(255, 255, 255, 0.45)"
            strokeDasharray="8 6"
            strokeWidth="1.6"
          />

          {/* Clearly Styled Lane Badges & Labels */}
          <text x="240" y="333" fill="#00d2ff" fontSize="10" fontWeight="bold" fontFamily="monospace">L1: LEFT LANE (OVERTAKE / DOCK)</text>
          <text x="240" y="383" fill="#ffdd33" fontSize="10" fontWeight="bold" fontFamily="monospace">L2: CENTER TRANSIT</text>
          <text x="240" y="433" fill="#00d2ff" fontSize="10" fontWeight="bold" fontFamily="monospace">L3: RIGHT LANE (OVERTAKE / DOCK)</text>

          <text x="515" y="105" fill="#00d2ff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">L1</text>
          <text x="555" y="105" fill="#ffdd33" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">L2</text>
          <text x="595" y="105" fill="#00d2ff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">L3</text>
        </g>

        {/* 3. Primary Yellow Movement Network & Circulation Loops (Inspired by Diagram) */}
        <g className="designated-yellow-routes">
          {/* North Arterial Route */}
          <line x1="230" y1="85" x2="870" y2="85" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />
          {/* Mid Arterial Route */}
          <line x1="230" y1="390" x2="870" y2="390" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />
          {/* South Arterial Route */}
          <line x1="230" y1="670" x2="870" y2="670" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />

          {/* Vertical Arterial Routes */}
          <line x1="230" y1="85" x2="230" y2="670" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />
          <line x1="555" y1="85" x2="555" y2="670" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />
          <line x1="870" y1="85" x2="870" y2="670" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />

          {/* Outer Circulation Bypass Routes (Top and Bottom perimeter with Leftward arrows) */}
          <line x1="1080" y1="40" x2="170" y2="40" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />
          <line x1="170" y1="40" x2="170" y2="640" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />

          <line x1="1080" y1="720" x2="170" y2="720" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />

          {/* Horizontal Entry lines into Charging Bays */}
          {STATIONS.charging.bays.map((bay) => (
            <line
              key={`bay-approach-${bay.id}`}
              x1="170"
              y1={bay.y}
              x2={bay.x + 18}
              y2={bay.y}
              stroke="#00d2ff"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          ))}

          {/* Conveyor Feeder Lines */}
          <line x1="870" y1="270" x2="1040" y2="270" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />
          <line x1="870" y1="390" x2="1040" y2="390" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />
          <line x1="870" y1="510" x2="1040" y2="510" stroke="#ffdd33" strokeWidth="2.5" markerEnd="url(#yellowArrow)" />
        </g>

        {/* 4. Charging & Staging Station (Left) */}
        <g className="station-charging">
          <rect
            x={STATIONS.charging.x}
            y={STATIONS.charging.y}
            width={STATIONS.charging.width}
            height={STATIONS.charging.height}
            fill="#f5f6fa"
            stroke="#dcdde1"
            strokeWidth="2"
            rx="6"
          />
          <text
            x={STATIONS.charging.x + STATIONS.charging.width / 2}
            y={STATIONS.charging.y + 24}
            fill="#1e272e"
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
          >
            Charging
          </text>

          {/* 5 Charging Bays */}
          {STATIONS.charging.bays.map((bay, idx) => (
            <g key={bay.id} transform={`translate(${bay.x}, ${bay.y})`}>
              <rect
                x="-28"
                y="-20"
                width="56"
                height="40"
                fill="#0d1b2a"
                stroke="#00d2ff"
                strokeWidth="1.8"
                rx="5"
              />
              <text x="0" y="4" fill="#00d2ff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                BAY {idx + 1}
              </text>
            </g>
          ))}
        </g>

        {/* 5. Inventory Management System (Bottom-Left) */}
        <g className="station-inventory">
          <rect
            x={STATIONS.inventory.x}
            y={STATIONS.inventory.y}
            width={STATIONS.inventory.width}
            height={STATIONS.inventory.height}
            fill="#f5f6fa"
            stroke="#dcdde1"
            strokeWidth="2"
            rx="6"
          />
          <text
            x={STATIONS.inventory.x + STATIONS.inventory.width / 2}
            y={STATIONS.inventory.y + 60}
            fill="#1e272e"
            fontSize="13"
            fontWeight="bold"
            textAnchor="middle"
          >
            Inventory
          </text>
          <text
            x={STATIONS.inventory.x + STATIONS.inventory.width / 2}
            y={STATIONS.inventory.y + 80}
            fill="#1e272e"
            fontSize="13"
            fontWeight="bold"
            textAnchor="middle"
          >
            System
          </text>
        </g>

        {/* 6. Blue Direction Markers (Inspired by Diagram: '>', 'v', '^' on left, '<' in center) */}
        {BLUE_MARKERS.map(bm => (
          <g key={bm.id} transform={`translate(${bm.x}, ${bm.y})`}>
            <circle r="16" fill="#00a8ff" stroke="#ffffff" strokeWidth="1.8" />
            <text x="0" y="5" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {bm.arrow}
            </text>
          </g>
        ))}

        {/* 7. Packaging Station (Top-Right) */}
        <g className="station-packaging">
          <rect
            x={STATIONS.packaging.x}
            y={STATIONS.packaging.y}
            width={STATIONS.packaging.width}
            height={STATIONS.packaging.height}
            fill="#f5f6fa"
            stroke="#dcdde1"
            strokeWidth="2"
            rx="6"
          />
          <text
            x={STATIONS.packaging.x + STATIONS.packaging.width / 2}
            y={STATIONS.packaging.y + 55}
            fill="#1e272e"
            fontSize="13"
            fontWeight="bold"
            textAnchor="middle"
          >
            Packaging
          </text>
          <text
            x={STATIONS.packaging.x + STATIONS.packaging.width / 2}
            y={STATIONS.packaging.y + 75}
            fill="#1e272e"
            fontSize="13"
            fontWeight="bold"
            textAnchor="middle"
          >
            Station
          </text>
        </g>

        {/* 8. Delivery Station (Bottom-Right) */}
        <g className="station-delivery">
          <rect
            x={STATIONS.delivery.x}
            y={STATIONS.delivery.y}
            width={STATIONS.delivery.width}
            height={STATIONS.delivery.height}
            fill="#f5f6fa"
            stroke="#dcdde1"
            strokeWidth="2"
            rx="6"
          />
          <text
            x={STATIONS.delivery.x + STATIONS.delivery.width / 2}
            y={STATIONS.delivery.y + 55}
            fill="#1e272e"
            fontSize="13"
            fontWeight="bold"
            textAnchor="middle"
          >
            Delivery
          </text>
          <text
            x={STATIONS.delivery.x + STATIONS.delivery.width / 2}
            y={STATIONS.delivery.y + 75}
            fill="#1e272e"
            fontSize="13"
            fontWeight="bold"
            textAnchor="middle"
          >
            Station
          </text>
        </g>

        {/* 9. Conveyor Central Column & 3 Conveyor Access Lanes */}
        <g className="conveyor-column">
          <rect
            x={CONVEYOR_CENTRAL_COLUMN.x}
            y={CONVEYOR_CENTRAL_COLUMN.y}
            width={CONVEYOR_CENTRAL_COLUMN.width}
            height={CONVEYOR_CENTRAL_COLUMN.height}
            fill="#f5f6fa"
            stroke="#dcdde1"
            strokeWidth="2"
            rx="4"
          />
          <text
            x={CONVEYOR_CENTRAL_COLUMN.x + CONVEYOR_CENTRAL_COLUMN.width / 2}
            y={CONVEYOR_CENTRAL_COLUMN.y + 175}
            fill="#1e272e"
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
            transform={`rotate(-90 ${CONVEYOR_CENTRAL_COLUMN.x + CONVEYOR_CENTRAL_COLUMN.width / 2} ${CONVEYOR_CENTRAL_COLUMN.y + 175})`}
          >
            Conveyor ↕
          </text>

          {/* 3 Dedicated Conveyor Feeder Lanes */}
          {conveyors.map((c, i) => {
            const laneY = 270 + i * 120;
            const isReserved = c.state === 'RESERVED';
            const isOccupied = c.state === 'OCCUPIED';
            const laneColor = isOccupied ? '#ff4757' : isReserved ? '#ffa502' : '#2ed573';

            return (
              <g key={c.id}>
                {/* Visual Conveyor Belt */}
                <rect
                  x="880"
                  y={laneY - 14}
                  width="160"
                  height="28"
                  fill="#0c1829"
                  stroke={laneColor}
                  strokeWidth="2"
                  rx="3"
                />
                <line x1="890" y1={laneY} x2="1030" y2={laneY} stroke={laneColor} strokeWidth="2" strokeDasharray="6 4" />
                <text x="960" y={laneY - 18} fill={laneColor} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  LANE {i + 1}: {c.state} {c.reservedBy ? `[${c.reservedBy}]` : ''}
                </text>
              </g>
            );
          })}
        </g>

        {/* 10. Four Shelves with 4 Dedicated Red Circle Docking Slots Each */}
        {SHELVES.map(shelf => {
          const lockInfo = shelfLocks.find(l => l.shelfId === shelf.id);
          const isLocked = lockInfo && lockInfo.lockedBy !== null;
          const waitingCount = lockInfo ? lockInfo.waitingQueue.length : 0;

          return (
            <g key={shelf.id} onClick={(e) => { e.stopPropagation(); onShelfClick && onShelfClick(shelf); }} style={{ cursor: 'pointer' }}>
              {/* 4 Red Circle Docking Ports around each shelf */}
              {shelf.dockSlots.map(slot => (
                <g key={slot.id} transform={`translate(${slot.x}, ${slot.y})`}>
                  <circle r="16" fill="rgba(255, 71, 87, 0.15)" stroke="#ff3838" strokeWidth="2.5" />
                  <circle r="6" fill="#ff3838" />
                  <line x1="-14" y1="0" x2="14" y2="0" stroke="#ff3838" strokeWidth="1.2" />
                  <line x1="0" y1="-14" x2="0" y2="14" stroke="#ff3838" strokeWidth="1.2" />
                </g>
              ))}

              {/* Shelf Central Block (White Square with Number) */}
              <rect
                x={shelf.x}
                y={shelf.y}
                width={shelf.width}
                height={shelf.height}
                fill="#f5f6fa"
                stroke={isLocked ? '#ffa502' : '#ffffff'}
                strokeWidth={isLocked ? 3.5 : 2}
                rx="4"
              />

              {/* Shelf Number */}
              <text
                x={shelf.x + shelf.width / 2}
                y={shelf.y + shelf.height / 2 + 12}
                fill="#1e272e"
                fontSize="38"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="Outfit, sans-serif"
              >
                {shelf.num}
              </text>

              {/* Shelf Category Label */}
              <text
                x={shelf.x + shelf.width / 2}
                y={shelf.y + shelf.height - 10}
                fill="#57606f"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {shelf.category}
              </text>

              {/* Lock Badge */}
              {isLocked && (
                <g transform={`translate(${shelf.x + shelf.width - 24}, ${shelf.y + 16})`}>
                  <circle r="12" fill="#ff4757" />
                  <text x="0" y="4" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                    🔒
                  </text>
                </g>
              )}

              {/* Waiting Queue Count Badge */}
              {waitingCount > 0 && (
                <g transform={`translate(${shelf.x + 20}, ${shelf.y + 16})`}>
                  <rect x="-12" y="-9" width="24" height="18" fill="#ffa502" rx="4" />
                  <text x="0" y="4" fill="#000" fontSize="10" fontWeight="bold" textAnchor="middle">
                    +{waitingCount}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* 11. Planned A* Routes Overlay */}
        {showRoutes && robots.map(r => {
          if (!r.path || r.path.length < 2) return null;
          const points = r.path.map(p => `${p.x},${p.y}`).join(' ');
          return (
            <polyline
              key={`route-${r.id}`}
              points={points}
              fill="none"
              stroke={r.color}
              strokeWidth="2.5"
              strokeDasharray="5 4"
              opacity="0.75"
            />
          );
        })}

        {/* 12. V2V Wireless Mesh Communication Links */}
        {showWifiMesh && activeLinks.map(link => (
          <g key={link.id}>
            <line
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              stroke="#00d2ff"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />
            {/* Midpoint Mesh Ping */}
            <circle
              cx={(link.x1 + link.x2) / 2}
              cy={(link.y1 + link.y2) / 2}
              r="4"
              fill="#00d2ff"
              filter="url(#glowCyan)"
            />
          </g>
        ))}

        {/* 13. Dynamic Floor Obstacles (Humans, Fallen Boxes, Static Barriers) */}
        {obstacles.map(obs => (
          <g key={obs.id} transform={`translate(${obs.x}, ${obs.y})`}>
            {obs.type === 'HUMAN' ? (
              // Moving Human Worker
              <g>
                <circle r={obs.radius} fill="rgba(255, 59, 105, 0.2)" stroke="#ff3b69" strokeWidth="2" />
                <circle r="7" fill="#ff3b69" />
                <text x="0" y="-14" fill="#ff3b69" fontSize="9" fontWeight="bold" textAnchor="middle">
                  HUMAN
                </text>
              </g>
            ) : obs.type === 'BOX' ? (
              // Fallen Box / Cargo
              <g>
                <rect x="-12" y="-12" width="24" height="24" fill="#ffaa00" stroke="#fff" strokeWidth="1.5" rx="3" />
                <text x="0" y="4" fill="#000" fontSize="11" fontWeight="bold" textAnchor="middle">
                  📦
                </text>
                <text x="0" y="-15" fill="#ffaa00" fontSize="8" fontWeight="bold" textAnchor="middle">
                  FALLEN BOX
                </text>
              </g>
            ) : (
              // Static Obstacle
              <g>
                <rect x="-14" y="-14" width="28" height="28" fill="#e056fd" stroke="#fff" strokeWidth="1.5" rx="4" />
                <text x="0" y="4" fill="#000" fontSize="12" fontWeight="bold" textAnchor="middle">
                  ⛔
                </text>
              </g>
            )}
          </g>
        ))}

        {/* 14. Conflict Resolution Markers */}
        {conflictZones.map(conf => (
          <g key={conf.id} transform={`translate(${conf.x}, ${conf.y})`}>
            <circle r="26" fill="none" stroke={conf.type === 'OVERTAKE' || conf.type === 'RIGHT_EVASION' ? '#00d2ff' : '#ff4757'} strokeWidth="2.2" strokeDasharray="4 4" />
            <circle r="6" fill={conf.type === 'OVERTAKE' || conf.type === 'RIGHT_EVASION' ? '#00d2ff' : '#ff4757'} filter={conf.type === 'OVERTAKE' || conf.type === 'RIGHT_EVASION' ? 'url(#glowCyan)' : 'url(#glowRed)'} />
            <text x="0" y="-30" fill={conf.type === 'OVERTAKE' || conf.type === 'RIGHT_EVASION' ? '#00d2ff' : '#ff4757'} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {conf.type === 'OVERTAKE' ? `⚡ OVERTAKE: ${conf.winnerId} ➔ ${conf.yielderId}` : conf.type === 'RIGHT_EVASION' ? '⇄ PASS RIGHT' : `⚡ PRIORITY: ${conf.winnerId}`}
            </text>
          </g>
        ))}

        {/* 15. AMR Robots */}
        {robots.map(robot => {
          const isLow = robot.battery <= 25;
          const isYielding = robot.state === 'YIELDING' || robot.state === 'WAITING_YIELD';
          const isEvadingRight = robot.state === 'EVADING_RIGHT';
          const hasCargo = robot.cargo !== null;

          return (
            <g
              key={robot.id}
              transform={`translate(${robot.x}, ${robot.y})`}
              className="robot-marker"
            >
              {/* LiDAR Sensor Detection Zone (5 Meters / 55px radius) */}
              {showLidar && (
                <circle
                  r={WAREHOUSE_CONFIG.lidarRadiusPixels}
                  fill={robot.lidarAlert ? 'rgba(255, 71, 87, 0.15)' : 'rgba(0, 210, 255, 0.06)'}
                  stroke={robot.lidarAlert ? '#ff4757' : 'rgba(0, 210, 255, 0.25)'}
                  strokeWidth="1.2"
                  strokeDasharray={robot.lidarAlert ? '4 3' : 'none'}
                />
              )}

              {/* Robot Chassis */}
              <circle
                r={WAREHOUSE_CONFIG.robotRadius}
                fill="#0b172a"
                stroke={isLow ? '#ff4757' : robot.color}
                strokeWidth="2.8"
              />

              {/* Robot Heading Pointer (Direction of travel) */}
              <line
                x1="0"
                y1="0"
                x2={Math.cos(robot.heading) * (WAREHOUSE_CONFIG.robotRadius + 8)}
                y2={Math.sin(robot.heading) * (WAREHOUSE_CONFIG.robotRadius + 8)}
                stroke={robot.color}
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle
                cx={Math.cos(robot.heading) * (WAREHOUSE_CONFIG.robotRadius + 8)}
                cy={Math.sin(robot.heading) * (WAREHOUSE_CONFIG.robotRadius + 8)}
                r="3"
                fill="#ffffff"
              />

              {/* Cargo Box Badge on AMR */}
              {hasCargo ? (
                <g transform="translate(0, -1)">
                  <rect x="-8" y="-8" width="16" height="16" fill="#ffaa00" stroke="#ffffff" strokeWidth="1.2" rx="2" />
                  <text x="0" y="4" fill="#000" fontSize="10" fontWeight="bold" textAnchor="middle">
                    📦
                  </text>
                </g>
              ) : (
                <text
                  x="0"
                  y="4"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {robot.id}
                </text>
              )}

              {/* Battery Meter Ring / Gauge */}
              <g transform="translate(0, 23)">
                <rect x="-16" y="-4" width="32" height="7" fill="#050811" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" rx="2" />
                <rect
                  x="-15"
                  y="-3"
                  width={Math.max(0, (robot.battery / 100) * 30)}
                  height="5"
                  fill={isLow ? '#ff4757' : robot.battery > 50 ? '#2ed573' : '#ffa502'}
                  rx="1.5"
                />
              </g>

              {/* State / Yield / Evade / Overtake Indicator */}
              {robot.state === 'OVERTAKING' ? (
                <g transform="translate(18, -14)">
                  <circle r="10" fill="#00d2ff" filter="url(#glowCyan)" />
                  <text x="0" y="3" fill="#000" fontSize="9" fontWeight="bold" textAnchor="middle">
                    ↷
                  </text>
                </g>
              ) : isEvadingRight ? (
                <g transform="translate(18, -14)">
                  <circle r="9" fill="#00d2ff" />
                  <text x="0" y="3" fill="#000" fontSize="9" fontWeight="bold" textAnchor="middle">
                    ⮡
                  </text>
                </g>
              ) : isYielding ? (
                <g transform="translate(18, -14)">
                  <circle r="8" fill="#ffa502" />
                  <text x="0" y="3" fill="#000" fontSize="8" fontWeight="bold" textAnchor="middle">
                    Y
                  </text>
                </g>
              ) : null}

              {/* Critical Low Battery Flasher */}
              {isLow && (
                <g transform="translate(-18, -14)">
                  <circle r="8" fill="#ff4757" filter="url(#glowRed)" />
                  <text x="0" y="3" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle">
                    ⚡
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
