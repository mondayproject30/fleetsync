# FleetSync v1.3 — Edge-AI Based Warehouse AMR Fleet Coordination Simulator

An interactive, browser-based 2D warehouse robot fleet simulation built with **React.js**, **Vite**, **JavaScript**, **SVG/Canvas**, and **CSS**.

---

## 🌟 Key Features

### 1. Accurate Top-Down Warehouse Layout
- **Four Storage Shelf Blocks**: Shelf 1 (Electronics), Shelf 2 (Mechanical), Shelf 3 (Chemicals), Shelf 4 (Packaging).
- **Four Dedicated Docking Slots (Red Circles)**: North, South, East, and West docking points per shelf.
- **Physical 3-Lane Corridors**:
  - **Center Lane**: Designated default transit highway for all AMRs.
  - **Side Lanes (Left & Right)**: Dedicated for shelf docking access and collision-resolution yielding.
- **Charging Station**: 5 charging bays with automatic routing and docking.
- **Inventory System (IMS)**: Automatic product reservations and stock tracking.
- **Conveyor System**: 3 independent conveyor access lanes feeding into **Packaging Station** (top-right) and **Delivery Station** (bottom-right).
- **Outer Circulation Loop**: Perimeter return bypass with directional waypoints.

### 2. Multi-Robot Fleet Coordination
- Configurable fleet of AMRs (R1 to R6) with unique IDs, battery levels, smooth kinematics, and orientation.
- Exclusive resource locking:
  - **Shelf Locks**: Prevents multiple robots from accessing the same shelf simultaneously.
  - **Conveyor Lane Reservations**: Exclusively allocates Conveyor Lane 1, 2, or 3.
  - **Waiting Queue**: Automatically queues orders for contending resources.

### 3. A* Pathfinding Engine
- Full graph-based A* routing respecting 3-lane rules and turn constraints.
- Real-time dynamic obstacle avoidance and route replanning.
- Visual route overlay toggle.

### 4. LiDAR & Optical Camera AI Obstacle Detection
- Simulated 5-meter LiDAR zone around each AMR.
- Optical AI Camera classification:
  - Another AMR
  - Human Worker (moving dynamic obstacle)
  - Fallen Box / Goods
  - Static Barrier / Pallet
- Automatic speed reduction and emergency stop triggers with industrial safety alerts.

### 5. Decentralized Conflict Resolution & Priority Ordering
Deterministic decentralized priority rules:
1. **Critical Battery (<25%)**: Highest scheduling priority.
2. **Carrying Goods / Cargo**: Next priority.
3. **Traveling without Goods**: Standard priority.
4. **Order Timestamp**: Earlier orders proceed first.
5. **Robot ID**: Deterministic tie-breaker.
- Side-lane yielding: Lower-priority AMR moves sideways into safe adjacent lane while higher-priority AMR proceeds.
- Deadlock detection: Automatically monitors stalled robots (>3.5s) and triggers recovery.

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Run Locally (Development)
```bash
npm run dev
```
Open your browser at `http://localhost:5175/`.

### Run Unit Tests
```bash
npm test
```
Runs test cases verifying:
- A* pathfinding & dynamic detour routing
- Exclusive shelf locking & contention queueing
- 3 Conveyor access lanes exclusive allocation & release
- Deterministic 4-level priority rules & tie-breaking
- Deadlock detection & recovery

### Production Build
```bash
npm run build
```

---

## 📁 Architecture Overview
```
src/
├── engine/
│   ├── warehouseLayout.js     # Dimensions, coordinates, 3-lane corridors, shelves
│   ├── astar.js               # A* graph, heuristics, dynamic detour pathfinding
│   ├── robotManager.js        # AMR kinematics, state machine, battery drain
│   ├── taskScheduler.js       # Mission lifecycle, pick-to-conveyor scheduling
│   ├── inventoryManager.js    # Stock tracking, item reservation, auto-replenish
│   ├── reservationManager.js  # Exclusive shelf & conveyor locks, FIFO waiting queue
│   ├── collisionResolver.js   # Decentralized priority sorting, yielding, deadlock detection
│   ├── sensorSimulator.js     # 5m LiDAR, optical camera AI classification, moving obstacles
│   ├── communicationManager.js# V2V wireless mesh peer broadcast
│   ├── batteryManager.js      # Discharge tracking, emergency charging bay allocation
│   └── simulationEngine.js    # Master simulation loop (60Hz) decoupled from React
├── components/
│   ├── WarehouseMap.jsx       # SVG warehouse map with live overlays
│   ├── RobotPanel.jsx         # AMR fleet telemetry cards, battery meters
│   ├── JobAssignment.jsx      # Manual & auto dispatch controls, order queue
│   ├── ResourcePanel.jsx      # Real-time shelf & conveyor lock monitors
│   ├── ObstacleControls.jsx   # Dynamic obstacle generator (Human, Box, Barrier)
│   ├── EventLog.jsx           # Filterable timestamped event log
│   ├── SimulationControls.jsx # Play, pause, speed, fleet size, visual toggles
│   └── AlertModal.jsx         # AI hazard alert modal
├── App.jsx                    # Master dashboard layout
├── main.jsx                   # React root entry
└── style.css                  # Industrial dark-theme styling
```
