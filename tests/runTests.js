/**
 * Comprehensive Unit Test Suite for FleetSync v1.3
 * Tests:
 * 1. A* Pathfinding (3-Lane Navigation & Shelf Obstacle Avoidance)
 * 2. Exclusive Shelf Locking & Contention Waiting Queue
 * 3. 3 Conveyor Access Lanes Exclusive Reservation
 * 4. Deterministic Multi-Robot Priority Ordering Protocol
 * 5. Deadlock Detection & Recovery Procedure
 */

import assert from 'node:assert';
import { warehouseGraph } from '../src/engine/astar.js';
import { ReservationManager } from '../src/engine/reservationManager.js';
import { CollisionResolver } from '../src/engine/collisionResolver.js';
import { Robot } from '../src/engine/robotManager.js';
import { WAREHOUSE_CONFIG } from '../src/engine/warehouseLayout.js';

console.log('====================================================');
console.log('🧪 RUNNING FLEETSYNC v1.3 ALGORITHMIC UNIT TESTS');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------
// TEST 1: A* Pathfinding (3-Lane Center Arterial & Docking Navigation)
// -----------------------------------------------------------------
runTest('A* Pathfinding: Routes via 3-Lane Network & Avoids Shelf Obstacles', () => {
  const startNode = 'STAGING_HUB_TOP';
  const goalNode = 'DOCK_S1_S'; // Shelf 1 Bottom Dock

  const path = warehouseGraph.findPath(startNode, goalNode);
  assert(path.length > 0, 'Path should not be empty');
  assert.strictEqual(path[0].id, startNode, 'Path should start at startNode');
  assert.strictEqual(path[path.length - 1].id, goalNode, 'Path should reach goalNode');

  // Verify path traverses center transit nodes
  const hasCenterTransit = path.some(n => n.id.startsWith('T_'));
  assert(hasCenterTransit, 'Path must use designated Center Transit Arterials');

  // Verify dynamic avoidance of temporarily blocked node
  const blockedMidNode = path[Math.floor(path.length / 2)].id;
  const detourPath = warehouseGraph.findPath(startNode, goalNode, new Set([blockedMidNode]));
  assert(detourPath.length > 0, 'Detour path should exist');
  assert(!detourPath.some(n => n.id === blockedMidNode), 'Detour path must not contain the blocked node');
});

// -----------------------------------------------------------------
// TEST 2: Exclusive Shelf Locking & Waiting Queue
// -----------------------------------------------------------------
runTest('Shelf Locking: Exclusive Ownership & Contention Queueing', () => {
  const res = new ReservationManager();

  // Robot R1 reserves Shelf 2
  const r1Result = res.reserveShelf('SHELF-2', 'R1', { orderId: 'ORD-1' });
  assert.strictEqual(r1Result.success, true, 'R1 must obtain exclusive lock on Shelf 2');
  assert.strictEqual(res.isShelfLocked('SHELF-2'), true, 'Shelf 2 must be locked');
  assert.strictEqual(res.getShelfOwner('SHELF-2'), 'R1', 'Shelf 2 owner must be R1');

  // Robot R2 requests Shelf 2 simultaneously
  const r2Result = res.reserveShelf('SHELF-2', 'R2', { orderId: 'ORD-2' });
  assert.strictEqual(r2Result.success, false, 'R2 must be rejected because Shelf 2 is locked');
  assert.strictEqual(r2Result.queued, true, 'R2 must be queued');
  assert.strictEqual(res.getShelfOwner('SHELF-2'), 'R1', 'Owner must still be R1, not R2');

  // R1 releases Shelf 2 -> R2 should automatically receive reservation
  const grantedNext = res.releaseShelf('SHELF-2', 'R1');
  assert(grantedNext !== null, 'Queued order must be returned');
  assert.strictEqual(grantedNext.robotId, 'R2', 'Reservation must transfer to waiting Robot R2');
  assert.strictEqual(res.getShelfOwner('SHELF-2'), 'R2', 'Shelf 2 owner must now be R2');

  // R2 releases Shelf 2 -> Shelf is now free
  res.releaseShelf('SHELF-2', 'R2');
  assert.strictEqual(res.isShelfLocked('SHELF-2'), false, 'Shelf 2 must now be unlocked');
});

// -----------------------------------------------------------------
// TEST 3: 3 Conveyor Access Lanes Exclusive Reservations
// -----------------------------------------------------------------
runTest('Conveyor Lanes: 3 Dedicated Lanes Exclusive Allocation & Release', () => {
  const res = new ReservationManager();

  // R1 requests conveyor for Packaging Station
  const conv1 = res.getAvailableConveyor('PACKAGING_STATION');
  assert(conv1 !== null, 'Available conveyor must be found');
  const r1Reserved = res.reserveConveyor(conv1.id, 'R1');
  assert.strictEqual(r1Reserved, true, 'R1 must successfully reserve conveyor lane');

  // R2 requests conveyor
  const conv2 = res.getAvailableConveyor('PACKAGING_STATION');
  assert.notStrictEqual(conv2.id, conv1.id, 'R2 must get a different conveyor lane than R1');
  res.reserveConveyor(conv2.id, 'R2');

  // R3 requests conveyor for Delivery Station
  const conv3 = res.getAvailableConveyor('DELIVERY_STATION');
  assert.strictEqual(conv3.id, 'CONV-3', 'CONV-3 is dedicated to Delivery Station');
  res.reserveConveyor(conv3.id, 'R3');

  // Verify all 3 are reserved
  const anyFree = res.getAvailableConveyor();
  assert.strictEqual(anyFree, null, 'No free conveyor lanes should remain when all 3 are reserved');

  // Release Lane 1
  res.releaseConveyor(conv1.id, 'R1');
  const freedConv = res.getAvailableConveyor('PACKAGING_STATION');
  assert.strictEqual(freedConv.id, conv1.id, 'Lane 1 must be free again after release');
});

// -----------------------------------------------------------------
// TEST 4: Decentralized Deterministic Priority Ordering Protocol
// -----------------------------------------------------------------
runTest('Priority Rules: Low Battery (<25%) > Cargo > No Cargo > Order Timestamp > ID Tie-breaker', () => {
  const res = new ReservationManager();
  const resolver = new CollisionResolver(res);

  // Robot A: Critical Low Battery (18%)
  const botLowBat = new Robot('R1', 'AMR-1', 100, 100, '#00d2ff');
  botLowBat.battery = 18;
  botLowBat.cargo = null;

  // Robot B: High Battery with Cargo ("Sensors")
  const botCargo = new Robot('R2', 'AMR-2', 100, 100, '#b28aff');
  botCargo.battery = 85;
  botCargo.cargo = 'Sensors';

  // Robot C: High Battery without Cargo, Order placed earlier
  const botOldOrder = new Robot('R3', 'AMR-3', 100, 100, '#ff9f43');
  botOldOrder.battery = 90;
  botOldOrder.cargo = null;
  botOldOrder.orderTimestamp = Date.now() - 30000; // 30s ago

  // Robot D: High Battery without Cargo, Order placed just now
  const botNewOrder = new Robot('R4', 'AMR-4', 100, 100, '#2ed573');
  botNewOrder.battery = 90;
  botNewOrder.cargo = null;
  botNewOrder.orderTimestamp = Date.now(); // 0s ago

  // Rule 1: Low battery beats Carrying Cargo
  const comp1 = resolver.compareRobots(botLowBat, botCargo);
  assert(comp1 > 0, 'Critical Low Battery AMR must have higher priority than Cargo AMR');

  // Rule 2: Carrying Cargo beats Without Cargo
  const comp2 = resolver.compareRobots(botCargo, botOldOrder);
  assert(comp2 > 0, 'AMR carrying cargo must have higher priority than AMR without cargo');

  // Rule 3: Earlier order beats Later order
  const comp3 = resolver.compareRobots(botOldOrder, botNewOrder);
  assert(comp3 > 0, 'Earlier order timestamp AMR must beat later order timestamp AMR');

  // Sort full fleet of 4 robots
  const fleet = [botNewOrder, botOldOrder, botCargo, botLowBat];
  fleet.sort((a, b) => resolver.compareRobots(b, a));

  assert.strictEqual(fleet[0].id, 'R1', '1st priority must be Critical Battery AMR R1');
  assert.strictEqual(fleet[1].id, 'R2', '2nd priority must be Loaded Cargo AMR R2');
  assert.strictEqual(fleet[2].id, 'R3', '3rd priority must be Earlier Order AMR R3');
  assert.strictEqual(fleet[3].id, 'R4', '4th priority must be Recent Order AMR R4');
});

// -----------------------------------------------------------------
// TEST 5: Deadlock Detection & Safe Recovery Trigger
// -----------------------------------------------------------------
runTest('Deadlock Detection: Stalled Robot Detection & Recovery Recovery', () => {
  const res = new ReservationManager();
  const resolver = new CollisionResolver(res);

  const stalledBot = new Robot('R1', 'AMR-1', 555, 390, '#00d2ff');
  stalledBot.state = 'BLOCKED';
  stalledBot.blockedSince = Date.now() - 4500; // Stalled for 4.5 seconds (> 3.5s threshold)

  assert.strictEqual(stalledBot.isDeadlockRecovering, false);

  resolver.checkDeadlocks([stalledBot]);

  assert.strictEqual(stalledBot.isDeadlockRecovering, true, 'Stalled robot must enter deadlock recovery');
});

// -----------------------------------------------------------------
// TEST 6: Bilateral Collision Evasion: Reverse & Move Right (Both AMRs)
// -----------------------------------------------------------------
runTest('Bilateral Collision Evasion: Impending Collisions Trigger Reversal & Right-Side Shift for Both AMRs', () => {
  const res = new ReservationManager();
  const resolver = new CollisionResolver(res);

  // Robot 1 moving East at y = 390
  const r1 = new Robot('R1', 'AMR-01', 300, 390, '#00d2ff');
  r1.heading = 0; // East
  r1.targetPoint = { x: 450, y: 390 };
  r1.state = 'EN_ROUTE_SHELF';

  // Robot 2 moving West at y = 390 (direct head-on collision course)
  const r2 = new Robot('R2', 'AMR-02', 350, 390, '#ff9f43');
  r2.heading = Math.PI; // West
  r2.targetPoint = { x: 200, y: 390 };
  r2.state = 'EN_ROUTE_CONVEYOR';

  resolver.resolveFleetConflicts([r1, r2]);

  assert.strictEqual(r1.state, 'EVADING_RIGHT', 'Robot 1 must enter EVADING_RIGHT state');
  assert.strictEqual(r2.state, 'EVADING_RIGHT', 'Robot 2 must enter EVADING_RIGHT state');

  // R1 heading East (0) -> right side is South (y increases)
  // R2 heading West (PI) -> right side is North (y decreases)
  assert(r1.targetPoint.y > 390, 'R1 must shift South (+Y) onto its right-hand lane');
  assert(r2.targetPoint.y < 390, 'R2 must shift North (-Y) onto its right-hand lane');
  assert(r1.targetPoint.x < 300, 'R1 must reverse backward before shifting right');
  assert(r2.targetPoint.x > 350, 'R2 must reverse backward before shifting right');
});

console.log(`\n====================================================`);
console.log(`🎉 ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log(`====================================================`);
