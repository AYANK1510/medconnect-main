/**
 * MedConnect Pulse Phase 9 - Atomic Resource Reservation Verification Suite
 * Tests core Phase 9 requirements:
 * 1. Safe atomic resource reservation flow:
 *    Accept → validate match → check inventory → atomically reserve → create resource_reservation → update inventory → continue dispatch
 * 2. Concurrent acceptance attempts (Promise.allSettled race conditions)
 * 3. Prevention of double allocation and negative inventory
 * 4. Insufficient inventory failure (reservation fails, no dispatch created)
 * 5. Zero stock failure handling
 */

import { dbEngine } from '../src/lib/dbEngine';
import { createEmergencyRequest, acceptEmergencyRequest } from '../src/services/emergencyService';
import { addInventoryItem } from '../src/services/inventoryService';

interface TestResult {
  testId: number;
  title: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function logTest(testId: number, title: string, passed: boolean, details: string) {
  results.push({ testId, title, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[TEST ${testId}] ${status} - ${title}: ${details}`);
}

async function runPhase9ReservationTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 9 Atomic Resource Reservation Verification');
  console.log('================================================================\n');

  // Setup Test Hospitals
  // Requesting Hospital A: (28.6139, 77.2090)
  // Responding Hospital B: (28.5672, 77.2400) ~6km away (within 15km radius)
  const hospA_Id = 'p9-hosp-A';
  const hospB_Id = 'p9-hosp-B';

  dbEngine.addOrUpdateHospital({
    id: hospA_Id,
    name: 'Hospital A (Requesting)',
    latitude: 28.6139,
    longitude: 77.2090,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: hospB_Id,
    name: 'Hospital B (Stock Provider)',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  // TEST 1: Setup Inventory = 10 Oxygen Cylinders at Hospital B & Verify Initial State
  let oxygenItem: any;
  try {
    oxygenItem = await addInventoryItem({
      hospital_id: hospB_Id,
      resource_type: 'Oxygen',
      item_name: 'Oxygen Cylinders D-Type',
      total_quantity: 10,
      unit: 'cylinders',
    });

    const initialAvailable = oxygenItem.total_quantity - oxygenItem.reserved_quantity;
    if (oxygenItem.total_quantity === 10 && oxygenItem.reserved_quantity === 0 && initialAvailable === 10) {
      logTest(
        1,
        'Initial Inventory Setup (Total=10, Reserved=0, Available=10)',
        true,
        `Hospital B inventory initialized: Total=${oxygenItem.total_quantity}, Reserved=${oxygenItem.reserved_quantity}, Available=${initialAvailable}`
      );
    } else {
      logTest(1, 'Initial Inventory Setup', false, `Unexpected inventory state: ${JSON.stringify(oxygenItem)}`);
    }
  } catch (err: any) {
    logTest(1, 'Initial Inventory Setup', false, `Error: ${err.message}`);
  }

  // TEST 2: Concurrent Acceptance Attempt (Race Condition: Total stock 10, Req 1=7, Req 2=7 simultaneously)
  let req1Id = '';
  let req2Id = '';
  try {
    // Hospital A creates 2 emergency requests for 7 oxygen cylinders each
    const req1Res = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      resource_name: 'Oxygen Cylinders D-Type',
      quantity: 7,
      urgency: 'HIGH',
      notes: 'Urgent ICU oxygen requirement - Batch 1',
    });
    req1Id = req1Res.request.id;

    const req2Res = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      resource_name: 'Oxygen Cylinders D-Type',
      quantity: 7,
      urgency: 'CRITICAL',
      notes: 'Urgent ICU oxygen requirement - Batch 2',
    });
    req2Id = req2Res.request.id;

    console.log(`\nLaunching simultaneous acceptance for Request 1 (${req1Id}) and Request 2 (${req2Id}) for 7 items each...`);

    // Execute concurrent acceptance attempts via Promise.allSettled
    const settleResults = await Promise.allSettled([
      acceptEmergencyRequest(req1Id, hospB_Id),
      acceptEmergencyRequest(req2Id, hospB_Id),
    ]);

    const fulfilledCount = settleResults.filter(r => r.status === 'fulfilled').length;
    const rejectedCount = settleResults.filter(r => r.status === 'rejected').length;

    // Check resulting inventory at Hospital B
    const updatedInventory = dbEngine.getInventory(hospB_Id);
    const updatedOxygen = updatedInventory.find(i => i.id === oxygenItem.id || i.resource_type === 'Oxygen');

    if (fulfilledCount === 1 && rejectedCount === 1) {
      if (
        updatedOxygen &&
        updatedOxygen.total_quantity === 10 &&
        updatedOxygen.reserved_quantity === 7 &&
        updatedOxygen.available_quantity === 3
      ) {
        logTest(
          2,
          'Concurrent Acceptance Attempt (Only 1 Succeeded, Stock=10, Reserved=7, Available=3)',
          true,
          `Atomic lock enforced! Exactly 1 acceptance succeeded, 1 rejected. Reserved=7, Available=3 (No double allocation!).`
        );
      } else {
        logTest(
          2,
          'Concurrent Acceptance Attempt',
          false,
          `Inventory corrupted: ${JSON.stringify(updatedOxygen)}`
        );
      }
    } else {
      logTest(
        2,
        'Concurrent Acceptance Attempt',
        false,
        `Expected 1 fulfilled & 1 rejected, but got ${fulfilledCount} fulfilled and ${rejectedCount} rejected.`
      );
    }
  } catch (err: any) {
    logTest(2, 'Concurrent Acceptance Attempt', false, `Error: ${err.message}`);
  }

  // TEST 3: Verify Resource Reservation Record & Dispatch Creation
  try {
    const reservations = dbEngine.getResourceReservations();
    const dispatches = dbEngine.getDispatches();

    const reservationForReq1Or2 = reservations.find(r => r.request_id === req1Id || r.request_id === req2Id);
    const dispatchForReq1Or2 = dispatches.find(d => d.request_id === req1Id || d.request_id === req2Id);

    if (reservationForReq1Or2 && dispatchForReq1Or2 && reservationForReq1Or2.reserved_quantity === 7) {
      logTest(
        3,
        'Resource Reservation Record & Dispatch Generation',
        true,
        `Created reservation ${reservationForReq1Or2.id} (Status: ${reservationForReq1Or2.status}) and dispatch ${dispatchForReq1Or2.id} (Verification Code: ${dispatchForReq1Or2.verification_code}).`
      );
    } else {
      logTest(
        3,
        'Resource Reservation Record & Dispatch Generation',
        false,
        `Missing reservation or dispatch record. Reservations count: ${reservations.length}, Dispatches count: ${dispatches.length}`
      );
    }
  } catch (err: any) {
    logTest(3, 'Resource Reservation Record & Dispatch Generation', false, `Error: ${err.message}`);
  }

  // TEST 4: Insufficient Inventory Rejection (Attempting 5 Cylinders when Available=3)
  try {
    const req3Res = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      resource_name: 'Oxygen Cylinders D-Type',
      quantity: 5, // 5 requested > 3 available
      urgency: 'HIGH',
      notes: 'Requesting 5 cylinders when only 3 available',
    });

    const initialDispatchCount = dbEngine.getDispatches().length;

    let threwError = false;
    let errorMessage = '';
    try {
      await acceptEmergencyRequest(req3Res.request.id, hospB_Id);
    } catch (err: any) {
      threwError = true;
      errorMessage = err.message;
    }

    const finalDispatchCount = dbEngine.getDispatches().length;

    // Check inventory remains unchanged (Total=10, Reserved=7, Available=3)
    const currentInventory = dbEngine.getInventory(hospB_Id);
    const currentOxygen = currentInventory.find(i => i.resource_type === 'Oxygen');

    if (
      threwError &&
      errorMessage.includes('Insufficient available inventory') &&
      finalDispatchCount === initialDispatchCount &&
      currentOxygen?.reserved_quantity === 7 &&
      currentOxygen?.available_quantity === 3
    ) {
      logTest(
        4,
        'Insufficient Inventory Rejection (Reservation Fails, No Dispatch Created)',
        true,
        `Request correctly rejected with error: "${errorMessage}". Stock remains intact (Reserved=7, Available=3), no successful dispatch created.`
      );
    } else {
      logTest(
        4,
        'Insufficient Inventory Rejection',
        false,
        `Unexpected result: threwError=${threwError}, msg="${errorMessage}", dispatchCountDelta=${finalDispatchCount - initialDispatchCount}`
      );
    }
  } catch (err: any) {
    logTest(4, 'Insufficient Inventory Rejection', false, `Error: ${err.message}`);
  }

  // TEST 5: Zero Inventory Reservation Attempt
  try {
    // Add empty medicine item (Total=0)
    await addInventoryItem({
      hospital_id: hospB_Id,
      resource_type: 'Medicine',
      item_name: 'Remdesivir 100mg',
      total_quantity: 0,
      unit: 'vials',
    });

    const zeroReq = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Medicine',
      resource_name: 'Remdesivir 100mg',
      quantity: 1,
      urgency: 'CRITICAL',
    });

    let zeroThrew = false;
    let zeroError = '';
    try {
      await acceptEmergencyRequest(zeroReq.request.id, hospB_Id);
    } catch (err: any) {
      zeroThrew = true;
      zeroError = err.message;
    }

    if (zeroThrew && (zeroError.includes('Insufficient available inventory') || zeroError.includes('Inventory item not found'))) {
      logTest(
        5,
        'Zero Inventory Reservation Attempt',
        true,
        `Zero inventory reservation correctly rejected with error: "${zeroError}". No negative inventory produced.`
      );
    } else {
      logTest(5, 'Zero Inventory Reservation Attempt', false, `Failed to reject zero stock reservation: "${zeroError}"`);
    }
  } catch (err: any) {
    logTest(5, 'Zero Inventory Reservation Attempt', false, `Error: ${err.message}`);
  }

  // TEST 6: Strict Non-Negative Inventory & Constraint Invariance Check
  try {
    const allInventory = dbEngine.getInventory();
    const invalidItems = allInventory.filter(
      i => i.available_quantity < 0 || i.reserved_quantity > i.total_quantity || i.available_quantity !== (i.total_quantity - i.reserved_quantity)
    );

    if (invalidItems.length === 0) {
      logTest(
        6,
        'Non-Negative Inventory & Constraint Invariance (available = total - reserved)',
        true,
        `All ${allInventory.length} inventory records strictly comply with non-negative bounds and formula: available = total - reserved.`
      );
    } else {
      logTest(
        6,
        'Non-Negative Inventory & Constraint Invariance',
        false,
        `Found invalid inventory items violating constraints: ${JSON.stringify(invalidItems)}`
      );
    }
  } catch (err: any) {
    logTest(6, 'Non-Negative Inventory & Constraint Invariance', false, `Error: ${err.message}`);
  }

  // Final Summary
  console.log('\n================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Phase 9 Reservation Test Results: ${passedCount}/${results.length} PASSED`);
  console.log('================================================================\n');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runPhase9ReservationTests().catch(err => {
  console.error('Unhandled error in Phase 9 test suite:', err);
  process.exit(1);
});
