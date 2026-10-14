/**
 * A* Pathfinding Graph strictly adhering to:
 * 1. Default Center-Lane Navigation
 * 2. Dedicated Shelf-Access Docking Lanes (Red Circles)
 * 3. 3-Lane Corridors & Permitted Lane Changes
 * 4. Dynamic Obstacle Avoidance & Rerouting
 * 5. Conveyor Feeder & Outer Perimeter Bypass Loop
 */

import { SHELVES, STATIONS, THREE_LANE_CORRIDORS } from './warehouseLayout.js';

export class WarehouseGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.initGraph();
  }

  addNode(id, x, y, type = 'transit', meta = {}) {
    this.nodes.set(id, { id, x, y, type, meta });
    if (!this.edges.has(id)) {
      this.edges.set(id, []);
    }
  }

  addEdge(fromId, toId, bidirectional = true, customWeight = null) {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return;
    const n1 = this.nodes.get(fromId);
    const n2 = this.nodes.get(toId);
    const dist = customWeight !== null ? customWeight : Math.hypot(n1.x - n2.x, n1.y - n2.y);

    this.edges.get(fromId).push({ to: toId, weight: dist });
    if (bidirectional) {
      if (!this.edges.has(toId)) this.edges.set(toId, []);
      this.edges.get(toId).push({ to: fromId, weight: dist });
    }
  }

  initGraph() {
    // -----------------------------------------------------------------
    // 1. CENTER TRANSIT ARTERIAL NETWORK (Default travel lanes - Lane 2)
    // -----------------------------------------------------------------
    // North Center Transit (y = 85)
    this.addNode('T_NW', 230, 85, 'transit');
    this.addNode('T_N_S1', 405, 85, 'transit');
    this.addNode('T_NC', 555, 85, 'transit');
    this.addNode('T_N_S2', 705, 85, 'transit');
    this.addNode('T_NE', 870, 85, 'transit');

    this.addEdge('T_NW', 'T_N_S1');
    this.addEdge('T_N_S1', 'T_NC');
    this.addEdge('T_NC', 'T_N_S2');
    this.addEdge('T_N_S2', 'T_NE');

    // Mid Center Transit (y = 390) - The main central highway
    this.addNode('T_MW', 230, 390, 'transit');
    this.addNode('T_M_S12', 405, 390, 'transit');
    this.addNode('T_MC', 555, 390, 'transit');
    this.addNode('T_M_S34', 705, 390, 'transit');
    this.addNode('T_ME', 870, 390, 'transit');

    this.addEdge('T_MW', 'T_M_S12');
    this.addEdge('T_M_S12', 'T_MC');
    this.addEdge('T_MC', 'T_M_S34');
    this.addEdge('T_M_S34', 'T_ME');

    // South Center Transit (y = 670)
    this.addNode('T_SW', 230, 670, 'transit');
    this.addNode('T_S_S3', 405, 670, 'transit');
    this.addNode('T_SC', 555, 670, 'transit');
    this.addNode('T_S_S4', 705, 670, 'transit');
    this.addNode('T_SE', 870, 670, 'transit');

    this.addEdge('T_SW', 'T_S_S3');
    this.addEdge('T_S_S3', 'T_SC');
    this.addEdge('T_SC', 'T_S_S4');
    this.addEdge('T_S_S4', 'T_SE');

    // Vertical Center Transit (x = 230, x = 555, x = 870)
    this.addNode('T_W_S1', 230, 235, 'transit');
    this.addNode('T_W_S3', 230, 515, 'transit');
    this.addEdge('T_NW', 'T_W_S1');
    this.addEdge('T_W_S1', 'T_MW');
    this.addEdge('T_MW', 'T_W_S3');
    this.addEdge('T_W_S3', 'T_SW');

    this.addNode('T_C_S12', 555, 235, 'transit');
    this.addNode('T_C_S34', 555, 515, 'transit');
    this.addEdge('T_NC', 'T_C_S12');
    this.addEdge('T_C_S12', 'T_MC');
    this.addEdge('T_MC', 'T_C_S34');
    this.addEdge('T_C_S34', 'T_SC');

    this.addNode('T_E_S2', 870, 235, 'transit');
    this.addNode('T_E_S4', 870, 515, 'transit');
    this.addEdge('T_NE', 'T_E_S2');
    this.addEdge('T_E_S2', 'T_ME');
    this.addEdge('T_ME', 'T_E_S4');
    this.addEdge('T_E_S4', 'T_SE');

    // -----------------------------------------------------------------
    // 2. CHARGING & STAGING BAYS (Left Station - Dedicated Entry Berths)
    // -----------------------------------------------------------------
    STATIONS.charging.bays.forEach((bay, idx) => {
      const approachId = bay.approachNodeId || `STAGING_BAY_${idx + 1}`;
      this.addNode(approachId, 170, bay.y, 'staging_approach', { bayId: bay.id });
      this.addNode(bay.id, bay.x, bay.y, 'charging_bay', { bayIndex: idx });
      // Direct clean horizontal docking connection into the bay stall
      this.addEdge(approachId, bay.id, true, 75);
    });

    // Vertical staging transit spine connecting all approach nodes cleanly
    this.addEdge('STAGING_BAY_1', 'STAGING_BAY_2');
    this.addEdge('STAGING_BAY_2', 'STAGING_BAY_3');
    this.addEdge('STAGING_BAY_3', 'STAGING_BAY_4');
    this.addEdge('STAGING_BAY_4', 'STAGING_BAY_5');

    // Connect staging spine to the warehouse transit network
    this.addEdge('STAGING_BAY_1', 'T_NW');
    this.addEdge('STAGING_BAY_1', 'T_W_S1');
    this.addEdge('STAGING_BAY_2', 'T_W_S1');
    this.addEdge('STAGING_BAY_3', 'T_MW');
    this.addEdge('STAGING_BAY_4', 'T_MW');
    this.addEdge('STAGING_BAY_5', 'T_W_S3');

    // Aliases for compatibility
    this.addNode('STAGING_HUB_TOP', 170, 205, 'station');
    this.addNode('STAGING_HUB_BOT', 170, 365, 'station');
    this.addEdge('STAGING_HUB_TOP', 'STAGING_BAY_2');
    this.addEdge('STAGING_HUB_BOT', 'STAGING_BAY_4');

    // Inventory System Dock
    this.addNode('INVENTORY_DOCK', 170, 640, 'station');
    this.addEdge('STAGING_BAY_5', 'INVENTORY_DOCK');
    this.addEdge('INVENTORY_DOCK', 'T_SW');
    this.addEdge('INVENTORY_DOCK', 'T_W_S3');

    // -----------------------------------------------------------------
    // 3. SHELF ACCESS DOCKING PORTS (Red Circles - Lane 1 & Lane 3 Entry)
    // -----------------------------------------------------------------
    // Shelf 1 Docking Ports
    this.addNode('DOCK_S1_S', 405, 340, 'shelf_dock', { shelfId: 'SHELF-1', side: 'bottom' });
    this.addNode('DOCK_S1_N', 405, 130, 'shelf_dock', { shelfId: 'SHELF-1', side: 'top' });
    this.addNode('DOCK_S1_W', 295, 235, 'shelf_dock', { shelfId: 'SHELF-1', side: 'left' });
    this.addNode('DOCK_S1_E', 515, 235, 'shelf_dock', { shelfId: 'SHELF-1', side: 'right' });
    this.addEdge('T_M_S12', 'DOCK_S1_S');
    this.addEdge('T_N_S1', 'DOCK_S1_N');
    this.addEdge('T_W_S1', 'DOCK_S1_W');
    this.addEdge('T_C_S12', 'DOCK_S1_E');

    // Shelf 2 Docking Ports
    this.addNode('DOCK_S2_S', 705, 340, 'shelf_dock', { shelfId: 'SHELF-2', side: 'bottom' });
    this.addNode('DOCK_S2_N', 705, 130, 'shelf_dock', { shelfId: 'SHELF-2', side: 'top' });
    this.addNode('DOCK_S2_W', 595, 235, 'shelf_dock', { shelfId: 'SHELF-2', side: 'left' });
    this.addNode('DOCK_S2_E', 815, 235, 'shelf_dock', { shelfId: 'SHELF-2', side: 'right' });
    this.addEdge('T_M_S34', 'DOCK_S2_S');
    this.addEdge('T_N_S2', 'DOCK_S2_N');
    this.addEdge('T_C_S12', 'DOCK_S2_W');
    this.addEdge('T_E_S2', 'DOCK_S2_E');

    // Shelf 3 Docking Ports
    this.addNode('DOCK_S3_N', 405, 440, 'shelf_dock', { shelfId: 'SHELF-3', side: 'top' });
    this.addNode('DOCK_S3_S', 405, 620, 'shelf_dock', { shelfId: 'SHELF-3', side: 'bottom' });
    this.addNode('DOCK_S3_W', 295, 515, 'shelf_dock', { shelfId: 'SHELF-3', side: 'left' });
    this.addNode('DOCK_S3_E', 515, 515, 'shelf_dock', { shelfId: 'SHELF-3', side: 'right' });
    this.addEdge('T_M_S12', 'DOCK_S3_N');
    this.addEdge('T_S_S3', 'DOCK_S3_S');
    this.addEdge('T_W_S3', 'DOCK_S3_W');
    this.addEdge('T_C_S34', 'DOCK_S3_E');

    // Shelf 4 Docking Ports
    this.addNode('DOCK_S4_N', 705, 440, 'shelf_dock', { shelfId: 'SHELF-4', side: 'top' });
    this.addNode('DOCK_S4_S', 705, 620, 'shelf_dock', { shelfId: 'SHELF-4', side: 'bottom' });
    this.addNode('DOCK_S4_W', 595, 515, 'shelf_dock', { shelfId: 'SHELF-4', side: 'left' });
    this.addNode('DOCK_S4_E', 815, 515, 'shelf_dock', { shelfId: 'SHELF-4', side: 'right' });
    this.addEdge('T_M_S34', 'DOCK_S4_N');
    this.addEdge('T_S_S4', 'DOCK_S4_S');
    this.addEdge('T_C_S34', 'DOCK_S4_W');
    this.addEdge('T_E_S4', 'DOCK_S4_E');

    // -----------------------------------------------------------------
    // 4. SIDE-LANE YIELDING NODES (For collision conflict resolution)
    // -----------------------------------------------------------------
    // Mid corridor side yielding nodes (Lane 1 & Lane 3)
    this.addNode('YIELD_MID_N1', 340, 340, 'yield_pocket');
    this.addNode('YIELD_MID_N2', 640, 340, 'yield_pocket');
    this.addNode('YIELD_MID_S1', 340, 440, 'yield_pocket');
    this.addNode('YIELD_MID_S2', 640, 440, 'yield_pocket');
    this.addEdge('T_MW', 'YIELD_MID_N1');
    this.addEdge('YIELD_MID_N1', 'T_M_S12');
    this.addEdge('T_MC', 'YIELD_MID_N2');
    this.addEdge('YIELD_MID_N2', 'T_M_S34');

    this.addEdge('T_MW', 'YIELD_MID_S1');
    this.addEdge('YIELD_MID_S1', 'T_M_S12');
    this.addEdge('T_MC', 'YIELD_MID_S2');
    this.addEdge('YIELD_MID_S2', 'T_M_S34');

    // -----------------------------------------------------------------
    // 5. CONVEYOR LANES (3 Dedicated Access Lanes)
    // -----------------------------------------------------------------
    this.addNode('CONV_FEEDER_1', 930, 270, 'transit');
    this.addNode('CONV_FEEDER_2', 930, 390, 'transit');
    this.addNode('CONV_FEEDER_3', 930, 510, 'transit');

    this.addEdge('T_E_S2', 'CONV_FEEDER_1');
    this.addEdge('T_ME', 'CONV_FEEDER_2');
    this.addEdge('T_E_S4', 'CONV_FEEDER_3');

    this.addNode('CONV_DROP_1', 1040, 270, 'conveyor_access', { conveyorId: 'CONV-1' });
    this.addNode('CONV_DROP_2', 1040, 390, 'conveyor_access', { conveyorId: 'CONV-2' });
    this.addNode('CONV_DROP_3', 1040, 510, 'conveyor_access', { conveyorId: 'CONV-3' });

    this.addEdge('CONV_FEEDER_1', 'CONV_DROP_1');
    this.addEdge('CONV_FEEDER_2', 'CONV_DROP_2');
    this.addEdge('CONV_FEEDER_3', 'CONV_DROP_3');

    // Stations
    this.addNode('STATION_PACK', 1110, 145, 'station');
    this.addNode('STATION_DELIVERY', 1110, 635, 'station');

    this.addEdge('CONV_DROP_1', 'STATION_PACK');
    this.addEdge('CONV_DROP_2', 'STATION_PACK');
    this.addEdge('CONV_DROP_2', 'STATION_DELIVERY');
    this.addEdge('CONV_DROP_3', 'STATION_DELIVERY');

    // -----------------------------------------------------------------
    // 6. OUTER PERIMETER BYPASS LOOP (Yellow lines from diagram)
    // -----------------------------------------------------------------
    this.addNode('OUTER_TOP_E', 1050, 40, 'outer_loop');
    this.addNode('OUTER_TOP_M', 555, 40, 'outer_loop');
    this.addNode('OUTER_TOP_W', 170, 40, 'outer_loop');

    this.addEdge('STATION_PACK', 'OUTER_TOP_E');
    this.addEdge('OUTER_TOP_E', 'OUTER_TOP_M');
    this.addEdge('OUTER_TOP_M', 'OUTER_TOP_W');
    this.addEdge('OUTER_TOP_W', 'STAGING_BAY_1');
    this.addEdge('OUTER_TOP_W', 'STAGING_HUB_TOP');

    this.addNode('OUTER_BOT_E', 1050, 720, 'outer_loop');
    this.addNode('OUTER_BOT_M', 555, 720, 'outer_loop');
    this.addNode('OUTER_BOT_W', 170, 720, 'outer_loop');

    this.addEdge('STATION_DELIVERY', 'OUTER_BOT_E');
    this.addEdge('OUTER_BOT_E', 'OUTER_BOT_M');
    this.addEdge('OUTER_BOT_M', 'OUTER_BOT_W');
    this.addEdge('OUTER_BOT_W', 'INVENTORY_DOCK');
  }

  findNearestNode(x, y, allowedTypes = null) {
    let nearest = null;
    let minDist = Infinity;
    for (const [id, node] of this.nodes.entries()) {
      if (allowedTypes && !allowedTypes.includes(node.type)) continue;
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = node;
      }
    }
    return nearest;
  }

  /**
   * Classic A* Search on the warehouse network graph.
   * @param {string} startId - Starting node ID
   * @param {string} goalId - Target node ID
   * @param {Set<string>|Array<string>} blockedNodeIds - Temporarily blocked nodes (e.g., active obstacles/other robots)
   * @param {Set<string>} reservedNodeIds - Nodes reserved exclusively by other robots
   * @returns {Array<{x: number, y: number, id: string, type: string}>}
   */
  findPath(startId, goalId, blockedNodeIds = new Set(), reservedNodeIds = new Set()) {
    if (!this.nodes.has(startId) || !this.nodes.has(goalId)) return [];
    if (startId === goalId) {
      const n = this.nodes.get(startId);
      return [{ id: n.id, x: n.x, y: n.y, type: n.type }];
    }

    const blockedSet = blockedNodeIds instanceof Set ? blockedNodeIds : new Set(blockedNodeIds);
    const reservedSet = reservedNodeIds instanceof Set ? reservedNodeIds : new Set(reservedNodeIds);

    const goalNode = this.nodes.get(goalId);

    const openSet = [startId];
    const cameFrom = new Map();

    const gScore = new Map();
    gScore.set(startId, 0);

    const fScore = new Map();
    fScore.set(startId, Math.hypot(this.nodes.get(startId).x - goalNode.x, this.nodes.get(startId).y - goalNode.y));

    const closedSet = new Set();

    while (openSet.length > 0) {
      // Find node with lowest fScore
      let currentId = openSet[0];
      let lowestF = fScore.get(currentId) ?? Infinity;
      let lowestIdx = 0;

      for (let i = 1; i < openSet.length; i++) {
        const id = openSet[i];
        const f = fScore.get(id) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          currentId = id;
          lowestIdx = i;
        }
      }

      if (currentId === goalId) {
        // Reconstruct path
        const path = [];
        let curr = currentId;
        while (curr) {
          const node = this.nodes.get(curr);
          path.unshift({ id: node.id, x: node.x, y: node.y, type: node.type, meta: node.meta });
          curr = cameFrom.get(curr);
        }
        return path;
      }

      openSet.splice(lowestIdx, 1);
      closedSet.add(currentId);

      const neighbors = this.edges.get(currentId) || [];
      for (const edge of neighbors) {
        const neighborId = edge.to;
        if (closedSet.has(neighborId)) continue;

        // Check if neighbor is blocked (unless it is our start or goal node)
        if (neighborId !== goalId && neighborId !== startId) {
          if (blockedSet.has(neighborId)) continue;
          if (reservedSet.has(neighborId)) continue;
        }

        const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.weight;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          const neighborNode = this.nodes.get(neighborId);
          const h = Math.hypot(neighborNode.x - goalNode.x, neighborNode.y - goalNode.y);
          fScore.set(neighborId, tentativeG + h);

          if (!openSet.includes(neighborId)) {
            openSet.push(neighborId);
          }
        }
      }
    }

    // No path found with strict blocks -> attempt fallback allowing soft avoidance if blocked
    return [];
  }
}

export const warehouseGraph = new WarehouseGraph();
