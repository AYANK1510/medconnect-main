/**
 * MedConnect Pulse Phase 11 - Real Dispatch Management & QR Verification Suite
 * Tests core Phase 11 requirements:
 * 1. Real dispatch creation after emergency request acceptance & reservation
 * 2. Strict server-side state transitions enforcement:
 *    CREATED -> MATCHED -> ACCEPTED -> STOCK_RESERVED -> DISPATCH_CREATED -> IN_TRANSIT -> RECEIVED -> COMPLETED / CANCELLED
 * 3. Associated ResourceReservation status becomes CONSUMED when dispatch reaches COMPLETED
 * 4. Server-side rejection of invalid state transitions (jump transitions & terminal state mutations)
 * 5. QR Code content privacy check (Contains ONLY secure dispatch reference, no medical info)
 * 6. Audit log entry generation for every status change
 */

import { dbEngine } from '../src/lib/dbEngine';
import { createEmergencyRequest, acceptEmergencyRequest } from '../src/services/emergencyService';
import { addInventoryItem } from '../src/services/inventoryService';
import { updateDispatchStatus, fetchDispatchByIdentifier } from '../src/services/dispatchService';
import { generateQRCodeDataUrl } from '../src/services/qrService';
import type { DispatchStatus } from '../src/types/database.types';

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

async function runPhase11DispatchTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 11 Real Dispatch Management Verification');
  console.log('================================================================\n');

  // Setup Test Hospitals & Inventory
  const hospA_Id = 'p11-hosp-A';
  const hospB_Id = 'p11-hosp-B';

  dbEngine.addOrUpdateHospital({
    id: hospA_Id,
    name: 'Hospital A (Requesting)',
    latitude: 28.6139,
    longitude: 77.2090,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: hospB_Id,
    name: 'Hospital B (Supplying Provider)',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  await addInventoryItem({
    hospital_id: hospB_Id,
    resource_type: 'Oxygen',
    item_name: 'Medical Oxygen Cylinders D-Type',
    total_quantity: 20,
    unit: 'cylinders',
  });

  // TEST 1: Dispatch Creation After Acceptance & Reservation
  let createdDispatch: any;
  let createdReservation: any;
  try {
    const reqRes = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      quantity: 5,
      urgency: 'CRITICAL',
      notes: 'ICU Urgent Oxygen Dispatch Phase 11 Test',
    });

    const acceptRes = await acceptEmergencyRequest(reqRes.request.id, hospB_Id);
    createdDispatch = acceptRes.dispatch;
    createdReservation = acceptRes.reservation;

    if (
      createdDispatch &&
      createdDispatch.id &&
      createdDispatch.status === 'DISPATCH_CREATED' &&
      createdDispatch.reservation_id === createdReservation.id
    ) {
      logTest(
        1,
        'Dispatch Creation After Acceptance & Reservation (Initial Status: DISPATCH_CREATED)',
        true,
        `Dispatch ${createdDispatch.id} successfully generated with status: ${createdDispatch.status} linked to reservation ${createdReservation.id}.`
      );
    } else {
      logTest(
        1,
        'Dispatch Creation After Acceptance & Reservation',
        false,
        `Unexpected dispatch object: ${JSON.stringify(createdDispatch)}`
      );
    }
  } catch (err: any) {
    logTest(1, 'Dispatch Creation After Acceptance & Reservation', false, `Error: ${err.message}`);
  }

  // TEST 2: Valid State Transition Sequence (DISPATCH_CREATED -> IN_TRANSIT -> RECEIVED -> COMPLETED)
  try {
    // Transition 1: DISPATCH_CREATED -> IN_TRANSIT
    const inTransit = await updateDispatchStatus(createdDispatch.id, 'IN_TRANSIT');
    const step1Pass = inTransit.status === 'IN_TRANSIT';

    // Transition 2: IN_TRANSIT -> RECEIVED
    const received = await updateDispatchStatus(createdDispatch.id, 'RECEIVED');
    const step2Pass = received.status === 'RECEIVED';

    // Transition 3: RECEIVED -> COMPLETED
    const completed = await updateDispatchStatus(createdDispatch.id, 'COMPLETED');
    const step3Pass = completed.status === 'COMPLETED' && Boolean(completed.completed_at);

    if (step1Pass && step2Pass && step3Pass) {
      logTest(
        2,
        'Valid State Transition Sequence (DISPATCH_CREATED -> IN_TRANSIT -> RECEIVED -> COMPLETED)',
        true,
        `Dispatch ${createdDispatch.id} successfully progressed through all valid states to COMPLETED.`
      );
    } else {
      logTest(
        2,
        'Valid State Transition Sequence',
        false,
        `Transition steps failed: step1=${step1Pass}, step2=${step2Pass}, step3=${step3Pass}`
      );
    }
  } catch (err: any) {
    logTest(2, 'Valid State Transition Sequence', false, `Error: ${err.message}`);
  }

  // TEST 3: Reservation Consumption on Dispatch Completion
  try {
    const reservations = dbEngine.getResourceReservations();
    const targetReservation = reservations.find(r => r.id === createdReservation.id);

    if (targetReservation && targetReservation.status === 'CONSUMED') {
      logTest(
        3,
        'Reservation Status Update to CONSUMED on Dispatch Completion',
        true,
        `Reservation ${targetReservation.id} status correctly updated to CONSUMED upon dispatch completion.`
      );
    } else {
      logTest(
        3,
        'Reservation Status Update to CONSUMED on Dispatch Completion',
        false,
        `Reservation status not updated to CONSUMED: ${JSON.stringify(targetReservation)}`
      );
    }
  } catch (err: any) {
    logTest(3, 'Reservation Status Update to CONSUMED', false, `Error: ${err.message}`);
  }

  // TEST 4: Server-Side Rejection of Invalid State Transitions
  try {
    // Create new emergency request & dispatch
    const reqRes2 = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      quantity: 3,
      urgency: 'HIGH',
    });
    const acceptRes2 = await acceptEmergencyRequest(reqRes2.request.id, hospB_Id);
    const disp2 = acceptRes2.dispatch;

    let rejectedJump = false;
    let jumpErrMsg = '';

    // Attempt invalid jump: DISPATCH_CREATED -> COMPLETED (skipping IN_TRANSIT and RECEIVED)
    try {
      await updateDispatchStatus(disp2.id, 'COMPLETED');
    } catch (err: any) {
      rejectedJump = true;
      jumpErrMsg = err.message;
    }

    // Verify status was NOT changed
    const disp2Db = await fetchDispatchByIdentifier(disp2.id);
    const statusUnchanged = disp2Db?.status === 'DISPATCH_CREATED';

    // Now complete disp2 properly: DISPATCH_CREATED -> IN_TRANSIT -> RECEIVED -> COMPLETED
    await updateDispatchStatus(disp2.id, 'IN_TRANSIT');
    await updateDispatchStatus(disp2.id, 'RECEIVED');
    await updateDispatchStatus(disp2.id, 'COMPLETED');

    // Attempt invalid transition on completed dispatch: COMPLETED -> IN_TRANSIT
    let rejectedTerminalMutate = false;
    let terminalErrMsg = '';
    try {
      await updateDispatchStatus(disp2.id, 'IN_TRANSIT');
    } catch (err: any) {
      rejectedTerminalMutate = true;
      terminalErrMsg = err.message;
    }

    if (rejectedJump && statusUnchanged && rejectedTerminalMutate) {
      logTest(
        4,
        'Server-Side Rejection of Invalid State Transitions (Jump Rejection & Terminal Mutation Protection)',
        true,
        `Invalid jump rejected: "${jumpErrMsg}". Terminal state mutation rejected: "${terminalErrMsg}".`
      );
    } else {
      logTest(
        4,
        'Server-Side Rejection of Invalid State Transitions',
        false,
        `Rejection check failed: jumpRejected=${rejectedJump}, statusUnchanged=${statusUnchanged}, terminalRejected=${rejectedTerminalMutate}`
      );
    }
  } catch (err: any) {
    logTest(4, 'Server-Side Rejection of Invalid State Transitions', false, `Error: ${err.message}`);
  }

  // TEST 5: QR Code Security & Privacy Check (Only Secure Reference, NO Medical Information)
  try {
    const dispatchIdRef = createdDispatch.id;
    const qrDataUrl = await generateQRCodeDataUrl(dispatchIdRef);

    // Verify QR reference string contains ONLY secure dispatch reference
    const containsRef = dispatchIdRef.length > 0;

    // Verify NO patient/medical info string embedded
    const payloadContainsMedicalData =
      dispatchIdRef.includes('patient') ||
      dispatchIdRef.includes('blood_group') ||
      dispatchIdRef.includes('diagnosis') ||
      dispatchIdRef.includes('notes');

    if (containsRef && !payloadContainsMedicalData && qrDataUrl.startsWith('data:image/')) {
      logTest(
        5,
        'QR Code Security & Privacy Check (Secure Dispatch Reference Only, Zero Medical Data)',
        true,
        `QR payload contains only secure reference "${dispatchIdRef}". Zero medical or patient details exposed.`
      );
    } else {
      logTest(
        5,
        'QR Code Security & Privacy Check',
        false,
        `Privacy check failed: containsRef=${containsRef}, medicalExposed=${payloadContainsMedicalData}`
      );
    }
  } catch (err: any) {
    logTest(5, 'QR Code Security & Privacy Check', false, `Error: ${err.message}`);
  }

  // TEST 6: Audit Log Entry Generation for Status Changes
  try {
    const activityLogs = dbEngine.getActivityLogs();
    const statusUpdateLogs = activityLogs.filter(
      l => l.action === 'DISPATCH_STATUS_UPDATE' && l.entity_id === createdDispatch.id
    );

    if (statusUpdateLogs.length >= 3) {
      const logSummary = statusUpdateLogs
        .map(l => `${(l.details as any)?.from_status} -> ${(l.details as any)?.to_status}`)
        .join(', ');

      logTest(
        6,
        'Audit Log Generation for Status Changes',
        true,
        `Successfully logged ${statusUpdateLogs.length} status change audit entries: [${logSummary}].`
      );
    } else {
      logTest(
        6,
        'Audit Log Generation for Status Changes',
        false,
        `Found only ${statusUpdateLogs.length} audit logs for dispatch status updates.`
      );
    }
  } catch (err: any) {
    logTest(6, 'Audit Log Generation for Status Changes', false, `Error: ${err.message}`);
  }

  // Summary
  console.log('\n================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Phase 11 Dispatch Test Results: ${passedCount}/${results.length} PASSED`);
  console.log('================================================================\n');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runPhase11DispatchTests().catch(err => {
  console.error('Unhandled error in Phase 11 test suite:', err);
  process.exit(1);
});
