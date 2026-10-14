/**
 * Warehouse Configuration, Precise 3-Lane Geometry, Shelves, Stations & Nodes
 * Accurately inspired by the user's warehouse blueprint diagram.
 */

export const WAREHOUSE_CONFIG = {
  width: 1260,
  height: 760,
  gridStep: 30,
  lidarRadiusMeters: 5,
  lidarRadiusPixels: 55,     // 11 px = 1 meter
  commRadiusPixels: 130,     // V2V Wi-Fi mesh communication radius
  robotRadius: 18,
  speed: 2.4,                // pixels per simulation frame
  lowBatteryThreshold: 25,   // <25% triggers critical priority & auto-charging
  chargingRate: 0.35,        // battery % per frame while docked at bay
  moveDischargeRate: 0.015,  // battery % per frame when driving
  loadedDischargeRate: 0.025,// battery % per frame when carrying cargo
  pickDischargeRate: 0.05,
  maxRobots: 6,
  defaultRobots: 4
};

// 4 Main Shelf Blocks with 4 Dedicated Docking Slots (Red Circles) Each
export const SHELVES = [
  {
    id: 'SHELF-1',
    num: 1,
    name: 'Shelf 1',
    category: 'Electronics',
    x: 340,
    y: 170,
    width: 130,
    height: 130,
    items: ['Sensors', 'Microchips', 'Circuit Boards', 'Optics Modules'],
    // 4 red circle docking ports (North, South, West, East)
    dockSlots: [
      { id: 'S1-N', side: 'top',    x: 405, y: 130, transitNodeId: 'T_N_S1', lane: 'North Aisle (Shelf Access)' },
      { id: 'S1-S', side: 'bottom', x: 405, y: 340, transitNodeId: 'T_M_S12', lane: 'Mid Aisle (Lane 1 Access)' },
      { id: 'S1-W', side: 'left',   x: 295, y: 235, transitNodeId: 'T_W_S1',  lane: 'West Aisle (Lane 3 Access)' },
      { id: 'S1-E', side: 'right',  x: 515, y: 235, transitNodeId: 'T_C_S12', lane: 'Center Aisle (Lane 1 Access)' }
    ]
  },
  {
    id: 'SHELF-2',
    num: 2,
    name: 'Shelf 2',
    category: 'Mechanical',
    x: 640,
    y: 170,
    width: 130,
    height: 130,
    items: ['Hydraulic Pumps', 'Gearboxes', 'Precision Bearings', 'Linear Actuators'],
    dockSlots: [
      { id: 'S2-N', side: 'top',    x: 705, y: 130, transitNodeId: 'T_N_S2', lane: 'North Aisle (Shelf Access)' },
      { id: 'S2-S', side: 'bottom', x: 705, y: 340, transitNodeId: 'T_M_S34', lane: 'Mid Aisle (Lane 1 Access)' },
      { id: 'S2-W', side: 'left',   x: 595, y: 235, transitNodeId: 'T_C_S12', lane: 'Center Aisle (Lane 3 Access)' },
      { id: 'S2-E', side: 'right',  x: 815, y: 235, transitNodeId: 'T_E_S2',  lane: 'East Aisle (Lane 1 Access)' }
    ]
  },
  {
    id: 'SHELF-3',
    num: 3,
    name: 'Shelf 3',
    category: 'Chemicals & Fluids',
    x: 340,
    y: 450,
    width: 130,
    height: 130,
    items: ['Coolants', 'Synthetic Lubricant', 'Industrial Epoxy', 'Degreasers'],
    dockSlots: [
      { id: 'S3-N', side: 'top',    x: 405, y: 440, transitNodeId: 'T_M_S12', lane: 'Mid Aisle (Lane 3 Access)' },
      { id: 'S3-S', side: 'bottom', x: 405, y: 620, transitNodeId: 'T_S_S3',  lane: 'South Aisle (Shelf Access)' },
      { id: 'S3-W', side: 'left',   x: 295, y: 515, transitNodeId: 'T_W_S3',  lane: 'West Aisle (Lane 3 Access)' },
      { id: 'S3-E', side: 'right',  x: 515, y: 515, transitNodeId: 'T_C_S34', lane: 'Center Aisle (Lane 1 Access)' }
    ]
  },
  {
    id: 'SHELF-4',
    num: 4,
    name: 'Shelf 4',
    category: 'Packaging Materials',
    x: 640,
    y: 450,
    width: 130,
    height: 130,
    items: ['Kraft Cartons', 'Protective Film', 'Poly Tubing', 'Foam Inserts'],
    dockSlots: [
      { id: 'S4-N', side: 'top',    x: 705, y: 440, transitNodeId: 'T_M_S34', lane: 'Mid Aisle (Lane 3 Access)' },
      { id: 'S4-S', side: 'bottom', x: 705, y: 620, transitNodeId: 'T_S_S4',  lane: 'South Aisle (Shelf Access)' },
      { id: 'S4-W', side: 'left',   x: 595, y: 515, transitNodeId: 'T_C_S34', lane: 'Center Aisle (Lane 3 Access)' },
      { id: 'S4-E', side: 'right',  x: 815, y: 515, transitNodeId: 'T_E_S4',  lane: 'East Aisle (Lane 1 Access)' }
    ]
  }
];

// Stations: Charging (Left), Inventory System (Bottom-Left), Packaging (Top-Right), Delivery (Bottom-Right), 3 Conveyors
export const STATIONS = {
  charging: {
    id: 'CHARGING_STATION',
    name: 'Charging Station',
    x: 35,
    y: 70,
    width: 125,
    height: 440,
    bays: [
      { id: 'BAY-1', name: 'Bay 1', x: 90, y: 125, approachNodeId: 'STAGING_BAY_1' },
      { id: 'BAY-2', name: 'Bay 2', x: 90, y: 205, approachNodeId: 'STAGING_BAY_2' },
      { id: 'BAY-3', name: 'Bay 3', x: 90, y: 285, approachNodeId: 'STAGING_BAY_3' },
      { id: 'BAY-4', name: 'Bay 4', x: 90, y: 365, approachNodeId: 'STAGING_BAY_4' },
      { id: 'BAY-5', name: 'Bay 5', x: 90, y: 445, approachNodeId: 'STAGING_BAY_5' }
    ]
  },
  inventory: {
    id: 'INVENTORY_SYS',
    name: 'Inventory System',
    x: 40,
    y: 570,
    width: 120,
    height: 140,
    dockX: 180,
    dockY: 640
  },
  packaging: {
    id: 'PACKAGING_STATION',
    name: 'Packaging Station',
    x: 1080,
    y: 80,
    width: 140,
    height: 130,
    dropX: 1110,
    dropY: 145
  },
  delivery: {
    id: 'DELIVERY_STATION',
    name: 'Delivery Station',
    x: 1080,
    y: 570,
    width: 140,
    height: 130,
    dropX: 1110,
    dropY: 635
  },
  conveyors: [
    {
      id: 'CONV-1',
      name: 'Conveyor Lane 1',
      feederY: 270,
      startX: 880,
      endX: 1060,
      targetStation: 'PACKAGING_STATION',
      state: 'FREE', // FREE, RESERVED, OCCUPIED, BLOCKED
      reservedBy: null
    },
    {
      id: 'CONV-2',
      name: 'Conveyor Lane 2',
      feederY: 390,
      startX: 880,
      endX: 1060,
      targetStation: 'PACKAGING_STATION',
      state: 'FREE',
      reservedBy: null
    },
    {
      id: 'CONV-3',
      name: 'Conveyor Lane 3',
      feederY: 510,
      startX: 880,
      endX: 1060,
      targetStation: 'DELIVERY_STATION',
      state: 'FREE',
      reservedBy: null
    }
  ]
};

// Explicit 3-Lane Corridors Definition
export const THREE_LANE_CORRIDORS = {
  // Horizontal Mid Corridor (between Shelves 1/2 and Shelves 3/4)
  horizontalMid: {
    xStart: 230,
    xEnd: 870,
    yTop: 315,
    height: 150,
    lane1Y: 340,         // Lane 1: Top (Shelf 1 & 2 bottom access)
    centerTransitY: 390, // Lane 2: Center (Default Travel Lane)
    lane3Y: 440          // Lane 3: Bottom (Shelf 3 & 4 top access)
  },
  // Vertical Center Corridor (between Shelves 1/3 and Shelves 2/4)
  verticalCenter: {
    yStart: 85,
    yEnd: 670,
    xLeft: 475,
    width: 150,
    lane1X: 515,         // Lane 1: Left (Shelf 1 & 3 access)
    centerTransitX: 555, // Lane 2: Center (Default Travel Lane)
    lane3X: 595          // Lane 3: Right (Shelf 2 & 4 access)
  },
  // Horizontal North Corridor (above Shelves 1 & 2)
  horizontalNorth: {
    xStart: 230,
    xEnd: 870,
    yTop: 55,
    height: 75,
    centerTransitY: 85
  },
  // Horizontal South Corridor (below Shelves 3 & 4)
  horizontalSouth: {
    xStart: 230,
    xEnd: 870,
    yTop: 630,
    height: 75,
    centerTransitY: 670
  },
  // Vertical West Corridor (between Charging/IMS and Shelves 1 & 3)
  verticalWest: {
    yStart: 85,
    yEnd: 670,
    xLeft: 190,
    width: 80,
    centerTransitX: 230
  },
  // Vertical East Corridor (between Shelves 2 & 4 and Conveyor Feeders)
  verticalEast: {
    yStart: 85,
    yEnd: 670,
    xLeft: 830,
    width: 80,
    centerTransitX: 870
  }
};

// Blue Circular Nav Markers from the diagram
export const BLUE_MARKERS = [
  { id: 'BM-1', x: 120, y: 340, arrow: '>', label: 'Staging Exit' },
  { id: 'BM-2', x: 120, y: 420, arrow: 'v', label: 'Transit Down' },
  { id: 'BM-3', x: 120, y: 500, arrow: '^', label: 'Transit Up' },
  { id: 'BM-CENTER', x: 555, y: 440, arrow: '<', label: 'Mid Yield Return' }
];

// Conveyor Central Column Info
export const CONVEYOR_CENTRAL_COLUMN = {
  x: 1040,
  y: 220,
  width: 50,
  height: 330,
  label: 'Conveyor'
};
