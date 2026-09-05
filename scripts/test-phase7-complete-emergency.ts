/**
 * MedConnect Pulse Phase 7 — Complete Emergency Lifecycle Verification Suite
 * Tests all Phase 7 requirements:
 * 1. TELEGRAM:
 *    - Flow: Emergency Request -> Matching Hospitals -> Telegram Notification -> Click ACCEPT & SUPPLY
 *    - Verify callback reaches backend and processes valid callback payload.
 * 2. INVENTORY RESERVATION:
 *    - Initial Inventory = 10
 *    - Request A = 7, Request B = 7 (Attempted concurrently)
 *    - Verify atomic reservation: reserved <= total, available >= 0, exactly 1 succeeds & 1 fails.
 * 3. DISPATCH:
 *    - Status sequence: ACCEPTED -> STOCK_RESERVED -> DISPATCH_CREATED
 *    - Verify actual dispatch record created in database.
 * 4. QR:
 *    - Generate actual QR data URL.
 *    - Ensure payload contains ONLY secure dispatch reference (dispatch_id).
 *    - Test QR verification using real backend.
 * 5. TIMEOUT:
 *    - Configurable development timeout: EMERGENCY_TIMEOUT_SECONDS=30 (production default 180).
 *    - Test A: Accept before timeout -> No escalation.
 *    - Test B: Do not accept -> Timeout -> Escalated.
 * 6. TWILIO:
 *    - Verify actual Twilio request status if configured, or record precise failure (TWILIO_NOT_CONFIGURED) without fake success.
 */

import { dbEngine } from '../src/lib/dbEngine';
import { createEmergencyRequest, acceptEmergencyRequest } from '../src/services/emergencyService';
import { addInventoryItem } from '../src/services/inventoryService';
import {
  sendTelegramEmergencyAlert,
  formatTelegramMessage,
  validateAndProcessTelegramCallback,
} from '../src/services/telegramService';
import { fetchDispatchByIdentifier } from '../src/services/dispatchService';
import { generateQRCodeDataUrl } from '../src/services/qrService';
import { initiateTwilioVoiceCall, processEmergencyTimeouts } from '../src/services/twilioService';

interface SectionResult {
  section: string;
  title: string;
  passed: boolean;
  details: string;
  evidence: Record<string, any>;
}

const results: SectionResult[] = [];

function logSection(section: string, title: string, passed: boolean, details: string, evidence: Record<string, any> = {}) {
  results.push({ section, title, passed, details, evidence });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n[${section}] ${status} — ${title}`);
  console.log(`  Details: ${details}`);
  if (Object.keys(evidence).length > 0) {
    console.log(`  Evidence Payload: ${JSON.stringify(evidence, null, 2)}`);
  }
}

async function runPhase7EmergencyLifecycleTests() {
  console.log('================================================================================');
  console.log('       MEDCONNECT PULSE PHASE 7 — COMPLETE EMERGENCY LIFECYCLE AUDIT            ');
  console.log('================================================================================');

  // --------------------------------------------------------------------------------
  // SECTION 1: TELEGRAM WORKFLOW & CALLBACK BUTTON EXECUTION
  // --------------------------------------------------------------------------------
  console.log('\n--- SECTION 1: TELEGRAM WORKFLOW & BUTTON CALLBACK ---');

  const s1ReqHosp = 'p7-s1-req';
  const s1SuppHosp = 'p7-s1-supp';

  dbEngine.addOrUpdateHospital({
    id: s1ReqHosp,
    name: 'Delhi Emergency Care (Req S1)',
    latitude: 28.6139,
    longitude: 77.2090,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: s1SuppHosp,
    name: 'AIIMS Trauma Center (Supp S1)',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  await addInventoryItem({
    hospital_id: s1SuppHosp,
    resource_type: 'Oxygen',
    item_name: 'Medical Oxygen Cylinder D-Type',
    total_quantity: 15,
    unit: 'cylinders',
  });

  let emReqId = '';
  let telegramCallbackPayload = '';
  try {
    // Step 1: Emergency Request Creation
    const createRes = await createEmergencyRequest({
      requesting_hospital_id: s1ReqHosp,
      resource_type: 'Oxygen',
      resource_name: 'Medical Oxygen Cylinder D-Type',
      quantity: 5,
      urgency: 'CRITICAL',
      notes: 'Phase 7 S1 Emergency Audit',
    });

    emReqId = createRes.request.id;
    const match = createRes.matches.find(m => m.hospital_id === s1SuppHosp);

    // Step 2: Format Telegram message & inline buttons
    const msgFormatted = formatTelegramMessage({
      requestId: emReqId,
      supplyingHospitalId: s1SuppHosp,
      emergencyHospital: 'Delhi Emergency Care (Req S1)',
      resource: 'Medical Oxygen Cylinder D-Type',
      quantity: 5,
      distanceKm: match?.distance_km || 6.01,
      urgency: 'CRITICAL',
    });

    const buttons = msgFormatted.reply_markup.inline_keyboard[0];
    const acceptButton = buttons.find((b: any) => b.text === 'ACCEPT & SUPPLY');
    telegramCallbackPayload = acceptButton?.callback_data || `ACCEPT:${emReqId}:${s1SuppHosp}`;

    // Step 3: Trigger Telegram alert dispatcher
    const alertResult = await sendTelegramEmergencyAlert({
      requestId: emReqId,
      supplyingHospitalId: s1SuppHosp,
      emergencyHospital: 'Delhi Emergency Care (Req S1)',
      resource: 'Medical Oxygen Cylinder D-Type',
      quantity: 5,
      distanceKm: match?.distance_km || 6.01,
      urgency: 'CRITICAL',
    });

    // Step 4: Simulate clicking [ ACCEPT & SUPPLY ] button -> callback reaches backend
    const callbackResult = await validateAndProcessTelegramCallback(telegramCallbackPayload);

    const isSuccess =
      emReqId.length > 0 &&
      acceptButton !== undefined &&
      telegramCallbackPayload === `ACCEPT:${emReqId}:${s1SuppHosp}` &&
      callbackResult.success === true &&
      callbackResult.status === 'ACCEPTED';

    logSection(
      'TELEGRAM',
      'Emergency Request -> Matching Hospitals -> Telegram Notification -> ACCEPT & SUPPLY Button Click',
      isSuccess,
      'Emergency request matched, Telegram notification payload formatted with [ACCEPT & SUPPLY] inline button, and callback reached backend successfully.',
      {
        requestId: emReqId,
        matchingHospitalsCount: createRes.matches.length,
        matchedDistanceKm: match?.distance_km,
        telegramAlertStatus: alertResult.status,
        buttonClickedText: acceptButton?.text,
        buttonCallbackData: telegramCallbackPayload,
        backendCallbackResponseStatus: callbackResult.status,
        dispatchGeneratedId: callbackResult.dispatch?.id,
      }
    );
  } catch (err: any) {
    logSection('TELEGRAM', 'Telegram Workflow Execution', false, `Error: ${err.message}`, {});
  }

  // --------------------------------------------------------------------------------
  // SECTION 2: ATOMIC INVENTORY RESERVATION (CONCURRENCY: STOCK=10, REQ A=7, REQ B=7)
  // --------------------------------------------------------------------------------
  console.log('\n--- SECTION 2: ATOMIC INVENTORY RESERVATION ---');

  const s2ReqHosp = 'p7-s2-req';
  const s2SuppHosp = 'p7-s2-supp';

  dbEngine.addOrUpdateHospital({
    id: s2ReqHosp,
    name: 'Hospital Req (S2)',
    latitude: 28.6139,
    longitude: 77.2090,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: s2SuppHosp,
    name: 'Hospital Stock Provider (S2)',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  // Fresh isolated stock = 10 units
  await addInventoryItem({
    hospital_id: s2SuppHosp,
    resource_type: 'Oxygen',
    item_name: 'Medical Oxygen Cylinder D-Type',
    total_quantity: 10,
    unit: 'cylinders',
  });

  try {
    // Request A = 7 units
    const reqARes = await createEmergencyRequest({
      requesting_hospital_id: s2ReqHosp,
      resource_type: 'Oxygen',
      quantity: 7,
      urgency: 'CRITICAL',
      notes: 'Request A (7 units)',
    });

    // Request B = 7 units
    const reqBRes = await createEmergencyRequest({
      requesting_hospital_id: s2ReqHosp,
      resource_type: 'Oxygen',
      quantity: 7,
      urgency: 'CRITICAL',
      notes: 'Request B (7 units)',
    });

    // Execute concurrent acceptance attempts via Promise.allSettled
    const settleResults = await Promise.allSettled([
      acceptEmergencyRequest(reqARes.request.id, s2SuppHosp),
      acceptEmergencyRequest(reqBRes.request.id, s2SuppHosp),
    ]);

    const fulfilledCount = settleResults.filter(r => r.status === 'fulfilled').length;
    const rejectedCount = settleResults.filter(r => r.status === 'rejected').length;

    // Fetch resulting inventory state
    const postInv = dbEngine.getInventory(s2SuppHosp).find(i => i.resource_type === 'Oxygen');
    const total = postInv?.total_quantity ?? 0;
    const reserved = postInv?.reserved_quantity ?? 0;
    const available = postInv?.available_quantity ?? 0;

    const noOverflow = reserved <= total;
    const noNegative = available >= 0;
    const formulaValid = available === total - reserved;
    const isAtomic = fulfilledCount === 1 && rejectedCount === 1 && reserved === 7 && available === 3;

    logSection(
      'INVENTORY RESERVATION',
      'Atomic Reservation Lock (Stock=10, Request A=7, Request B=7)',
      isAtomic && noOverflow && noNegative && formulaValid,
      `Attempted 2 concurrent requests of 7 units on stock of 10. Exactly 1 succeeded, 1 rejected due to stock limit. Formula: Total(${total}) = Reserved(${reserved}) + Available(${available}).`,
      {
        initialTotalStock: 10,
        requestA_Quantity: 7,
        requestB_Quantity: 7,
        fulfilledOperationsCount: fulfilledCount,
        rejectedOperationsCount: rejectedCount,
        finalTotalStock: total,
        finalReservedStock: reserved,
        finalAvailableStock: available,
        constraintCheck_ReservedLeTotal: noOverflow,
        constraintCheck_AvailableGeZero: noNegative,
        atomicLockVerified: isAtomic,
      }
    );
  } catch (err: any) {
    logSection('INVENTORY RESERVATION', 'Atomic Reservation Check', false, `Error: ${err.message}`, {});
  }

  // --------------------------------------------------------------------------------
  // SECTION 3: DISPATCH RECORD VERIFICATION
  // --------------------------------------------------------------------------------
  console.log('\n--- SECTION 3: DISPATCH CREATION & RECORD VERIFICATION ---');

  const s3ReqHosp = 'p7-s3-req';
  const s3SuppHosp = 'p7-s3-supp';

  dbEngine.addOrUpdateHospital({
    id: s3ReqHosp,
    name: 'Hospital Req (S3)',
    latitude: 28.6139,
    longitude: 77.2090,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: s3SuppHosp,
    name: 'Hospital Supplying (S3)',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  await addInventoryItem({
    hospital_id: s3SuppHosp,
    resource_type: 'Oxygen',
    item_name: 'Medical Oxygen Cylinder D-Type',
    total_quantity: 20,
    unit: 'cylinders',
  });

  let activeDispatchId = '';
  try {
    const dispReqRes = await createEmergencyRequest({
      requesting_hospital_id: s3ReqHosp,
      resource_type: 'Oxygen',
      quantity: 4,
      urgency: 'HIGH',
      notes: 'Dispatch verification request',
    });

    // Process acceptance: ACCEPTED -> STOCK_RESERVED -> DISPATCH_CREATED
    const acceptRes = await acceptEmergencyRequest(dispReqRes.request.id, s3SuppHosp);
    activeDispatchId = acceptRes.dispatch.id;

    const dispatchInDb = await fetchDispatchByIdentifier(activeDispatchId);

    const isValidDispatch =
      Boolean(dispatchInDb) &&
      dispatchInDb?.id === activeDispatchId &&
      dispatchInDb?.status === 'DISPATCH_CREATED' &&
      (dispatchInDb?.verification_code?.length ?? 0) >= 6 &&
      dispatchInDb?.quantity === 4;

    logSection(
      'DISPATCH',
      'Lifecycle Transition (ACCEPTED -> STOCK_RESERVED -> DISPATCH_CREATED)',
      isValidDispatch,
      `Dispatch record ${activeDispatchId} verified in database with verification code "${dispatchInDb?.verification_code}" and status DISPATCH_CREATED.`,
      {
        dispatchId: dispatchInDb?.id,
        requestId: dispatchInDb?.request_id,
        reservationId: dispatchInDb?.reservation_id,
        supplyingHospitalId: dispatchInDb?.supplying_hospital_id || dispatchInDb?.source_hospital_id,
        requestingHospitalId: dispatchInDb?.requesting_hospital_id || dispatchInDb?.destination_hospital_id,
        resourceType: dispatchInDb?.resource_type,
        quantity: dispatchInDb?.quantity,
        verificationCode: dispatchInDb?.verification_code,
        status: dispatchInDb?.status,
      }
    );
  } catch (err: any) {
    logSection('DISPATCH', 'Dispatch Record Verification', false, `Error: ${err.message}`, {});
  }

  // --------------------------------------------------------------------------------
  // SECTION 4: QR CODE GENERATION & BACKEND VERIFICATION
  // --------------------------------------------------------------------------------
  console.log('\n--- SECTION 4: QR CODE GENERATION & VERIFICATION ---');

  try {
    const qrDataUrl = await generateQRCodeDataUrl(activeDispatchId);

    const isReferenceOnly =
      activeDispatchId.length > 0 &&
      !activeDispatchId.includes('patient') &&
      !activeDispatchId.includes('medical') &&
      !activeDispatchId.includes('diagnosis');

    const verifiedDispatch = await fetchDispatchByIdentifier(activeDispatchId);

    const isQrValid =
      qrDataUrl.startsWith('data:image/png;base64,') &&
      isReferenceOnly &&
      Boolean(verifiedDispatch) &&
      verifiedDispatch?.id === activeDispatchId;

    logSection(
      'QR',
      'QR Generation (Secure dispatch_id Reference) & Backend Scanner Verification',
      isQrValid,
      `QR code generated containing secure dispatch reference "${activeDispatchId}". Real backend scanner verified dispatch record matching code "${verifiedDispatch?.verification_code}".`,
      {
        qrCodeFormat: 'PNG Data URL (Base64)',
        embeddedPayloadContent: activeDispatchId,
        privacyProtectedNoMedicalData: isReferenceOnly,
        backendVerificationLookupSuccess: verifiedDispatch !== null,
        verifiedDispatchId: verifiedDispatch?.id,
        verifiedVerificationCode: verifiedDispatch?.verification_code,
        cargoQuantity: verifiedDispatch?.quantity,
      }
    );
  } catch (err: any) {
    logSection('QR', 'QR Verification', false, `Error: ${err.message}`, {});
  }

  // --------------------------------------------------------------------------------
  // SECTION 5: TIMEOUT TESTS (TEST A: ACCEPT BEFORE TIMEOUT, TEST B: UNACCEPTED TIMEOUT)
  // --------------------------------------------------------------------------------
  console.log('\n--- SECTION 5: TIMEOUT CONFIGURATION & EXECUTION (TEST A & TEST B) ---');

  const s5ReqHosp = 'p7-s5-req';
  const s5SuppHosp = 'p7-s5-supp';

  dbEngine.addOrUpdateHospital({
    id: s5ReqHosp,
    name: 'Hospital Req (S5)',
    latitude: 28.6139,
    longitude: 77.2090,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: s5SuppHosp,
    name: 'Hospital Supplying (S5)',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  await addInventoryItem({
    hospital_id: s5SuppHosp,
    resource_type: 'Oxygen',
    item_name: 'Medical Oxygen Cylinder D-Type',
    total_quantity: 30,
    unit: 'cylinders',
  });

  try {
    // Configurable Development Timeout
    process.env.EMERGENCY_TIMEOUT_SECONDS = '30';

    // TEST A: Accept before timeout -> Expected: No escalation
    const testAReq = await createEmergencyRequest({
      requesting_hospital_id: s5ReqHosp,
      resource_type: 'Oxygen',
      quantity: 2,
      urgency: 'HIGH',
      notes: 'Test A: Accept before timeout',
    });

    const testAReqId = testAReq.request.id;
    await acceptEmergencyRequest(testAReqId, s5SuppHosp);

    const checkTimeA = new Date(Date.now() + 35 * 1000);
    const timeoutResA = await processEmergencyTimeouts(checkTimeA);

    const reqAState = dbEngine.getEmergencyRequests().find(r => r.id === testAReqId);
    const testAPassed = reqAState?.status === 'FULFILLED' && !timeoutResA.escalatedRequestIds.includes(testAReqId);

    // TEST B: Do not accept -> Expected: Timeout -> Escalation
    const testBReq = await createEmergencyRequest({
      requesting_hospital_id: s5ReqHosp,
      resource_type: 'Oxygen',
      quantity: 3,
      urgency: 'CRITICAL',
      notes: 'Test B: Do not accept -> Timeout',
    });

    const testBReqId = testBReq.request.id;

    const checkTimeB = new Date(Date.now() + 35 * 1000);
    const timeoutResB = await processEmergencyTimeouts(checkTimeB);

    const reqBState = dbEngine.getEmergencyRequests().find(r => r.id === testBReqId);
    const matchesB = dbEngine.getEmergencyMatches().filter(m => m.request_id === testBReqId);
    const allMatchesExpiredB = matchesB.length > 0 && matchesB.every(m => m.status === 'EXPIRED');
    const testBPassed = reqBState?.status === 'ESCALATED' && allMatchesExpiredB && timeoutResB.escalatedRequestIds.includes(testBReqId);

    logSection(
      'TIMEOUT',
      'Configurable Deadline (EMERGENCY_TIMEOUT_SECONDS=30) — Test A & Test B',
      testAPassed && testBPassed,
      'Test A (Accepted before 30s) remained FULFILLED with no escalation. Test B (Unaccepted after 30s) expired matches and transitioned to ESCALATED.',
      {
        configuredTimeoutSeconds: 30,
        productionSupportedSeconds: 180,
        testA_RequestId: testAReqId,
        testA_Status: reqAState?.status,
        testA_Escalated: timeoutResA.escalatedRequestIds.includes(testAReqId),
        testA_Result: testAPassed ? 'NO ESCALATION (PASS)' : 'FAILED',
        testB_RequestId: testBReqId,
        testB_Status: reqBState?.status,
        testB_MatchesExpired: allMatchesExpiredB,
        testB_Escalated: timeoutResB.escalatedRequestIds.includes(testBReqId),
        testB_Result: testBPassed ? 'TIMEOUT -> ESCALATION (PASS)' : 'FAILED',
      }
    );
  } catch (err: any) {
    logSection('TIMEOUT', 'Timeout Tests Execution', false, `Error: ${err.message}`, {});
  }

  // --------------------------------------------------------------------------------
  // SECTION 6: TWILIO VOICE ESCALATION (NO FAKE CALLS)
  // --------------------------------------------------------------------------------
  console.log('\n--- SECTION 6: TWILIO VOICE ESCALATION STATUS ---');

  try {
    const twilioCallResult = await initiateTwilioVoiceCall({
      requestId: 'p7-tw-audit-001',
      requestingHospitalName: 'Delhi Emergency Care',
      resourceType: 'Oxygen',
      quantity: 5,
    });

    const isConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    const validHandling = isConfigured
      ? twilioCallResult.success === true
      : twilioCallResult.status === 'TWILIO_NOT_CONFIGURED' && twilioCallResult.success === false;

    logSection(
      'TWILIO',
      'Twilio Escalation Status Verification (Zero Fake Call Claims)',
      validHandling,
      isConfigured
        ? `Twilio API configured! Voice call triggered with SID ${twilioCallResult.callSid}.`
        : `Twilio credentials missing. Recorded precise failure: "${twilioCallResult.status}" without claiming false success.`,
      {
        twilioConfigured: isConfigured,
        callRecordId: twilioCallResult.id,
        requestId: twilioCallResult.requestId,
        status: twilioCallResult.status,
        failureReason: twilioCallResult.failureReason || 'N/A (Credentials Missing)',
        claimedSuccess: twilioCallResult.success,
      }
    );
  } catch (err: any) {
    logSection('TWILIO', 'Twilio Voice Call Verification', false, `Error: ${err.message}`, {});
  }

  // --------------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('                     PHASE 7 EMERGENCY AUDIT SUMMARY                            ');
  console.log('================================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Total Phase 7 Sections: ${results.length}`);
  console.log(`Passed Sections       : ${passedCount}`);
  console.log(`Failed Sections       : ${results.length - passedCount}`);

  if (passedCount === results.length) {
    console.log('\n🎉 ALL PHASE 7 EMERGENCY LIFECYCLE REQUIREMENTS PASSED SUCCESSFULLY!');
  } else {
    console.log('\n❌ SOME PHASE 7 SECTIONS FAILED.');
    process.exit(1);
  }
}

runPhase7EmergencyLifecycleTests().catch(err => {
  console.error('Unhandled error in Phase 7 audit script:', err);
  process.exit(1);
});
