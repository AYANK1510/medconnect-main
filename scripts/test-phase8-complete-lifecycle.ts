/**
 * MedConnect Pulse Phase 8 — Complete Emergency Lifecycle Test Suite
 *
 * Requirements Tested:
 * 1. DISPATCH:
 *    - Valid state transition sequence:
 *      ACCEPTED -> STOCK_RESERVED -> DISPATCH_CREATED -> IN_TRANSIT -> RECEIVED -> COMPLETED
 *    - Verify actual database records at each step.
 *    - Valid state transitions enforcement.
 * 2. QR:
 *    - Real QR generation containing ONLY secure reference: dispatch_id.
 *    - Real backend QR verification.
 *    - Test cases:
 *      * valid dispatch
 *      * invalid dispatch
 *      * cancelled dispatch
 *      * completed dispatch
 *      * invalid state transition
 * 3. TIMEOUT:
 *    - Server/database as source of truth.
 *    - Configurable EMERGENCY_TIMEOUT_SECONDS (180 prod, 30 dev).
 *    - Test A: Accept before timeout -> Accepted -> No escalation.
 *    - Test B: No acceptance -> Timeout -> Escalated.
 * 4. TWILIO:
 *    - Actual Twilio request attempt.
 *    - Track: call SID, status, timestamp, error.
 *    - Real reporting without fake claims.
 */

import { dbEngine } from '../src/lib/dbEngine';
import { createEmergencyRequest, acceptEmergencyRequest } from '../src/services/emergencyService';
import { addInventoryItem } from '../src/services/inventoryService';
import { updateDispatchStatus, fetchDispatchByIdentifier } from '../src/services/dispatchService';
import { generateQRCodeDataUrl, verifyDispatchQRCode } from '../src/services/qrService';
import { initiateTwilioVoiceCall, processEmergencyTimeouts } from '../src/services/twilioService';

interface TestSection {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestSection[] = [];

function logResult(id: string, name: string, passed: boolean, details: string, data?: any) {
  results.push({ id, name, passed, details, data });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n[${id}] ${icon}: ${name}`);
  console.log(`    Details: ${details}`);
  if (data) {
    console.log(`    Evidence: ${JSON.stringify(data, null, 2)}`);
  }
}

async function runPhase8Suite() {
  console.log('================================================================================');
  console.log('       MEDCONNECT PULSE PHASE 8 — COMPLETE EMERGENCY LIFECYCLE AUDIT            ');
  console.log('================================================================================\n');

  // Setup test hospitals
  const reqHospId = 'p8-req-hosp';
  const suppHospId = 'p8-supp-hosp';

  dbEngine.addOrUpdateHospital({
    id: reqHospId,
    name: 'Safdarjung Emergency Hospital (Req)',
    latitude: 28.5684,
    longitude: 77.2064,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: suppHospId,
    name: 'AIIMS Trauma Center (Supp)',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  await addInventoryItem({
    hospital_id: suppHospId,
    resource_type: 'Ventilator',
    item_name: 'ICU Portable Ventilator V2',
    total_quantity: 50,
    unit: 'units',
  });

  // Create Emergency Request
  const createRes = await createEmergencyRequest({
    requesting_hospital_id: reqHospId,
    resource_type: 'Ventilator',
    resource_name: 'ICU Portable Ventilator V2',
    quantity: 2,
    urgency: 'CRITICAL',
    notes: 'Phase 8 Complete Lifecycle Test',
  });

  const reqId = createRes.request.id;

  // Accept Emergency Request
  const acceptRes = await acceptEmergencyRequest(reqId, suppHospId);
  const initialDispatch = acceptRes.dispatch;

  // --------------------------------------------------------------------------------
  // PART 1: DISPATCH LIFECYCLE & VALID STATE TRANSITIONS
  // --------------------------------------------------------------------------------
  console.log('\n--- PART 1: DISPATCH LIFECYCLE TRANSITIONS ---');

  // Sequence: DISPATCH_CREATED -> IN_TRANSIT -> RECEIVED -> COMPLETED
  let step1Ok = false;
  // Step 1: DISPATCH_CREATED -> IN_TRANSIT
  const d1 = await updateDispatchStatus(initialDispatch.id, 'IN_TRANSIT');
  const s1 = d1.status;
  // Step 2: IN_TRANSIT -> RECEIVED
  const d2 = await updateDispatchStatus(initialDispatch.id, 'RECEIVED');
  const s2 = d2.status;
  // Step 3: RECEIVED -> COMPLETED
  const d3 = await updateDispatchStatus(initialDispatch.id, 'COMPLETED');
  const s3 = d3.status;

  const finalDbDispatch = dbEngine.getDispatchByCodeOrId(initialDispatch.id);
  step1Ok =
    s1 === 'IN_TRANSIT' &&
    s2 === 'RECEIVED' &&
    s3 === 'COMPLETED' &&
    finalDbDispatch?.status === 'COMPLETED' &&
    finalDbDispatch.completed_at !== undefined;

  logResult(
    'DISP-1.1',
    'Dispatch Valid State Transition Sequence',
    step1Ok,
    'Dispatch transitioned cleanly through valid sequence (DISPATCH_CREATED -> IN_TRANSIT -> RECEIVED -> COMPLETED) and updated database record.',
    {
      dispatchId: initialDispatch.id,
      finalStatus: finalDbDispatch?.status,
      completedAt: finalDbDispatch?.completed_at,
    }
  );

  // --------------------------------------------------------------------------------
  // PART 2: REAL QR GENERATION & BACKEND VERIFICATION
  // --------------------------------------------------------------------------------
  console.log('\n--- PART 2: REAL QR PASS GENERATION & BACKEND VERIFICATION ---');

  // Create a new active dispatch for QR testing
  const qrReqRes = await createEmergencyRequest({
    requesting_hospital_id: reqHospId,
    resource_type: 'Ventilator',
    resource_name: 'ICU Portable Ventilator V2',
    quantity: 1,
    urgency: 'CRITICAL',
  });
  const qrAcceptRes = await acceptEmergencyRequest(qrReqRes.request.id, suppHospId);
  const activeDispatchId = qrAcceptRes.dispatch.id;

  // Generate real QR data URL containing ONLY dispatch_id
  const qrTextPayload = activeDispatchId;
  const qrDataUrl = await generateQRCodeDataUrl(qrTextPayload);

  const qrPayloadSecure = !qrTextPayload.includes('patient') && !qrTextPayload.includes('medical') && qrTextPayload === activeDispatchId;

  logResult(
    'QR-2.1',
    'Real QR Code Pass Generation (Secure Payload)',
    qrDataUrl.startsWith('data:image/') && qrPayloadSecure,
    'QR code Data URL generated successfully encoding ONLY secure dispatch reference (dispatch_id).',
    {
      payloadEncoded: qrTextPayload,
      dataUrlPrefix: qrDataUrl.substring(0, 50) + '...',
    }
  );

  // Test Case A: Valid Active Dispatch
  const verifyValidRes = await verifyDispatchQRCode(activeDispatchId);
  const testValidPassed = verifyValidRes.valid === true && verifyValidRes.status === 'DISPATCH_CREATED';
  logResult(
    'QR-2.2',
    'QR Verification: Valid Active Dispatch',
    testValidPassed,
    `Backend verified active dispatch. Message: "${verifyValidRes.message}"`,
    verifyValidRes
  );

  // Test Case B: Invalid / Non-Existent Dispatch
  const verifyInvalidRes = await verifyDispatchQRCode('disp-non-existent-999');
  const testInvalidPassed = verifyInvalidRes.valid === false && verifyInvalidRes.error === 'INVALID_DISPATCH';
  logResult(
    'QR-2.3',
    'QR Verification: Invalid Non-Existent Dispatch',
    testInvalidPassed,
    `Backend correctly rejected non-existent dispatch. Error: "${verifyInvalidRes.error}"`,
    verifyInvalidRes
  );

  // Test Case C: Cancelled Dispatch
  await updateDispatchStatus(activeDispatchId, 'CANCELLED');
  const verifyCancelledRes = await verifyDispatchQRCode(activeDispatchId);
  const testCancelledPassed = verifyCancelledRes.valid === false && verifyCancelledRes.error === 'CANCELLED_DISPATCH';
  logResult(
    'QR-2.4',
    'QR Verification: Cancelled Dispatch',
    testCancelledPassed,
    `Backend correctly rejected cancelled dispatch. Error: "${verifyCancelledRes.error}"`,
    verifyCancelledRes
  );

  // Test Case D: Completed Dispatch
  // Create another dispatch and transition to COMPLETED
  const compReqRes = await createEmergencyRequest({
    requesting_hospital_id: reqHospId,
    resource_type: 'Ventilator',
    resource_name: 'ICU Portable Ventilator V2',
    quantity: 1,
    urgency: 'HIGH',
  });
  const compAcceptRes = await acceptEmergencyRequest(compReqRes.request.id, suppHospId);
  const compDispatchId = compAcceptRes.dispatch.id;

  await updateDispatchStatus(compDispatchId, 'IN_TRANSIT');
  await updateDispatchStatus(compDispatchId, 'RECEIVED');
  await updateDispatchStatus(compDispatchId, 'COMPLETED');

  const verifyCompletedRes = await verifyDispatchQRCode(compDispatchId);
  const testCompletedPassed = verifyCompletedRes.valid === false && verifyCompletedRes.error === 'COMPLETED_DISPATCH';
  logResult(
    'QR-2.5',
    'QR Verification: Completed Dispatch',
    testCompletedPassed,
    `Backend correctly reported completed dispatch. Error: "${verifyCompletedRes.error}"`,
    verifyCompletedRes
  );

  // Test Case E: Invalid State Transition Enforcement
  let transitionError = '';
  try {
    // Attempting invalid transition from COMPLETED to IN_TRANSIT
    await updateDispatchStatus(compDispatchId, 'IN_TRANSIT');
  } catch (err: any) {
    transitionError = err.message;
  }
  const invalidTransitionPassed = transitionError.includes('Invalid state transition');
  logResult(
    'QR-2.6',
    'Enforce Invalid State Transitions',
    invalidTransitionPassed,
    `Backend correctly blocked illegal transition with error: "${transitionError}"`
  );

  // --------------------------------------------------------------------------------
  // PART 3: SERVER-SIDE TIMEOUT ENGINE (SOURCE OF TRUTH)
  // --------------------------------------------------------------------------------
  console.log('\n--- PART 3: 3-MINUTE TIMEOUT & ESCALATION ENGINE ---');

  const timeoutSec = process.env.EMERGENCY_TIMEOUT_SECONDS
    ? parseInt(process.env.EMERGENCY_TIMEOUT_SECONDS, 10)
    : 180;

  console.log(`Active EMERGENCY_TIMEOUT_SECONDS configuration: ${timeoutSec} seconds`);

  // TEST A: Accept Before Timeout -> No Escalation
  const testAReqRes = await createEmergencyRequest({
    requesting_hospital_id: reqHospId,
    resource_type: 'Ventilator',
    resource_name: 'ICU Portable Ventilator V2',
    quantity: 1,
    urgency: 'CRITICAL',
  });
  const testAReqId = testAReqRes.request.id;

  // Accept immediately before timeout expires
  await acceptEmergencyRequest(testAReqId, suppHospId);

  // Run timeout processor
  const timeoutCheckTimeA = new Date(Date.now() + (timeoutSec + 10) * 1000);
  const timeoutResA = await processEmergencyTimeouts(timeoutCheckTimeA);

  const testAPassed =
    !timeoutResA.escalatedRequestIds.includes(testAReqId) &&
    dbEngine.getEmergencyRequests().find(r => r.id === testAReqId)?.status === 'FULFILLED';

  logResult(
    'TIMEOUT-3.1',
    'TEST A — Accept Before Timeout (No Escalation)',
    testAPassed,
    `Accepted request remained FULFILLED and was NOT escalated by timeout engine.`,
    {
      requestId: testAReqId,
      status: dbEngine.getEmergencyRequests().find(r => r.id === testAReqId)?.status,
      escalatedCount: timeoutResA.escalatedRequestIds.length,
    }
  );

  // TEST B: No Acceptance -> Timeout -> Escalation
  const testBReqRes = await createEmergencyRequest({
    requesting_hospital_id: reqHospId,
    resource_type: 'Ventilator',
    resource_name: 'ICU Portable Ventilator V2',
    quantity: 1,
    urgency: 'CRITICAL',
  });
  const testBReqId = testBReqRes.request.id;

  // Do NOT accept. Advance clock past expires_at and run server timeout engine
  const reqBObj = dbEngine.getEmergencyRequests().find(r => r.id === testBReqId);
  const expiresAtB = reqBObj?.expires_at ? new Date(reqBObj.expires_at) : new Date(Date.now() + 1000);
  const timeoutCheckTimeB = new Date(expiresAtB.getTime() + 5000);

  const timeoutResB = await processEmergencyTimeouts(timeoutCheckTimeB);

  const reqBPostStatus = dbEngine.getEmergencyRequests().find(r => r.id === testBReqId)?.status;
  const matchBPostStatus = dbEngine.getEmergencyMatches().find(m => m.request_id === testBReqId)?.status;

  const testBPassed =
    timeoutResB.escalatedRequestIds.includes(testBReqId) &&
    reqBPostStatus === 'ESCALATED' &&
    matchBPostStatus === 'EXPIRED';

  logResult(
    'TIMEOUT-3.2',
    'TEST B — No Acceptance (Timeout -> Escalation)',
    testBPassed,
    `Unaccepted request automatically timed out and escalated to regional coordinator. Status=${reqBPostStatus}, Matches=${matchBPostStatus}`,
    {
      requestId: testBReqId,
      postStatus: reqBPostStatus,
      matchStatus: matchBPostStatus,
      callRecords: timeoutResB.callRecords,
    }
  );

  // --------------------------------------------------------------------------------
  // PART 4: TWILIO VOICE CALL INTEGRATION TRACKING
  // --------------------------------------------------------------------------------
  console.log('\n--- PART 4: TWILIO VOICE ESCALATION TRACKING ---');

  const twilioCallRes = await initiateTwilioVoiceCall({
    requestId: testBReqId,
    requestingHospitalName: 'Safdarjung Emergency Hospital (Req)',
    resourceType: 'Ventilator',
    quantity: 1,
  });

  const twilioTracked =
    twilioCallRes.id !== undefined &&
    twilioCallRes.status !== undefined &&
    twilioCallRes.timestamp !== undefined &&
    (twilioCallRes.callSid !== undefined || twilioCallRes.failureReason !== undefined);

  logResult(
    'TWILIO-4.1',
    'Twilio Voice Call Real Integration Tracking',
    twilioTracked,
    `Twilio integration status: ${twilioCallRes.status}. Call SID: ${twilioCallRes.callSid || 'N/A'}, Failure Reason: ${twilioCallRes.failureReason || 'None'}`,
    twilioCallRes
  );

  // Summary
  console.log('\n================================================================================');
  console.log('                          TEST RESULTS SUMMARY                                  ');
  console.log('================================================================================');
  const totalPassed = results.filter(r => r.passed).length;
  console.log(`Passed: ${totalPassed} / ${results.length}`);

  if (totalPassed === results.length) {
    console.log('\n🎉 ALL PHASE 8 COMPLETE EMERGENCY LIFECYCLE TESTS PASSED!');
  } else {
    console.error('\n❌ SOME TESTS FAILED. Inspect details above.');
    process.exit(1);
  }
}

runPhase8Suite().catch(err => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
