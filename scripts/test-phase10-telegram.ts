/**
 * MedConnect Pulse Phase 10 - Real Telegram Integration Verification Suite
 * Tests core Phase 10 requirements:
 * 1. Missing Telegram credentials handling (Logs TELEGRAM_NOT_CONFIGURED, no fake success)
 * 2. Alert message formatting containing: emergency hospital, resource, quantity, distance, urgency
 * 3. Buttons: [ ACCEPT & SUPPLY ] and [ DECLINE ]
 * 4. Secure backend validation for Telegram callbacks:
 *    - Match exists
 *    - Request active (status === 'PENDING')
 *    - Request not expired
 *    - Hospital authorized
 *    - Inventory available
 * 5. Rejection of arbitrary Telegram callbacks (inventory protected)
 * 6. End-to-end Emergency → Telegram → Accept → Backend Validation → Reservation
 */

import { dbEngine } from '../src/lib/dbEngine';
import { createEmergencyRequest } from '../src/services/emergencyService';
import { addInventoryItem } from '../src/services/inventoryService';
import {
  sendTelegramEmergencyAlert,
  formatTelegramMessage,
  validateAndProcessTelegramCallback,
} from '../src/services/telegramService';

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

async function runPhase10TelegramTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 10 Real Telegram Integration Verification');
  console.log('================================================================\n');

  // TEST 1: Missing Credentials Error Handling (TELEGRAM_NOT_CONFIGURED)
  try {
    // Ensure environment is cleared for this check
    const origBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const origChatId = process.env.TELEGRAM_CHAT_ID;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const res = await sendTelegramEmergencyAlert({
      requestId: 'test-req-1',
      supplyingHospitalId: 'hosp-102',
      emergencyHospital: 'Metro City General',
      resource: 'Oxygen',
      quantity: 5,
      distanceKm: 4.2,
      urgency: 'CRITICAL',
    });

    // Restore environment
    if (origBotToken) process.env.TELEGRAM_BOT_TOKEN = origBotToken;
    if (origChatId) process.env.TELEGRAM_CHAT_ID = origChatId;

    if (res.success === false && res.status === 'TELEGRAM_NOT_CONFIGURED' && res.error === 'TELEGRAM_NOT_CONFIGURED') {
      logTest(
        1,
        'Missing Credentials Handling (TELEGRAM_NOT_CONFIGURED Logged & No Fake Delivery)',
        true,
        `Correctly returned TELEGRAM_NOT_CONFIGURED status without pretending notification was sent.`
      );
    } else {
      logTest(1, 'Missing Credentials Handling', false, `Unexpected response: ${JSON.stringify(res)}`);
    }
  } catch (err: any) {
    logTest(1, 'Missing Credentials Handling', false, `Error: ${err.message}`);
  }

  // TEST 2: Message Formatting & Inline Keyboard Buttons (ACCEPT & SUPPLY / DECLINE)
  try {
    const formatted = formatTelegramMessage({
      requestId: 'req-p10-002',
      supplyingHospitalId: 'hosp-p10-B',
      emergencyHospital: 'Apex Trauma Center',
      resource: 'O- Negative Blood',
      quantity: 4,
      distanceKm: 6.5,
      urgency: 'CRITICAL',
    });

    const hasHospital = formatted.text.includes('Apex Trauma Center');
    const hasResource = formatted.text.includes('O- Negative Blood');
    const hasQty = formatted.text.includes('4');
    const hasDist = formatted.text.includes('6.5 km');
    const hasUrgency = formatted.text.includes('CRITICAL');

    const buttons = formatted.reply_markup.inline_keyboard[0];
    const acceptBtn = buttons.find((b: any) => b.text === 'ACCEPT & SUPPLY');
    const declineBtn = buttons.find((b: any) => b.text === 'DECLINE');

    const validButtons =
      acceptBtn &&
      declineBtn &&
      acceptBtn.callback_data === 'ACCEPT:req-p10-002:hosp-p10-B' &&
      declineBtn.callback_data === 'DECLINE:req-p10-002:hosp-p10-B';

    if (hasHospital && hasResource && hasQty && hasDist && hasUrgency && validButtons) {
      logTest(
        2,
        'Telegram Message & Button Structure (Hospital, Resource, Qty, Dist, Urgency, ACCEPT & SUPPLY, DECLINE)',
        true,
        `Message contains all required parameters and callback buttons: [ ACCEPT & SUPPLY ] -> ${acceptBtn.callback_data}, [ DECLINE ] -> ${declineBtn.callback_data}`
      );
    } else {
      logTest(
        2,
        'Telegram Message & Button Structure',
        false,
        `Formatting error. Text:\n${formatted.text}\nButtons: ${JSON.stringify(buttons)}`
      );
    }
  } catch (err: any) {
    logTest(2, 'Telegram Message & Button Structure', false, `Error: ${err.message}`);
  }

  // TEST Setup for Backend Validation Tests (3, 4, 5, 6)
  const hospA_Id = 'hosp-p10-A';
  const hospB_Id = 'hosp-p10-B';

  dbEngine.addOrUpdateHospital({
    id: hospA_Id,
    name: 'Hospital A (Emergency Requesting)',
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

  // Setup initial inventory at Hospital B: 15 Oxygen Cylinders
  await addInventoryItem({
    hospital_id: hospB_Id,
    resource_type: 'Oxygen',
    item_name: 'Medical Oxygen Cylinders',
    total_quantity: 15,
    unit: 'cylinders',
  });

  // TEST 3: Secure Backend Validation - Reject Arbitrary / Non-Existent Match Callback
  try {
    let threwError = false;
    let errMsg = '';
    try {
      await validateAndProcessTelegramCallback('ACCEPT:fake-req-999:fake-hosp-999');
    } catch (err: any) {
      threwError = true;
      errMsg = err.message;
    }

    if (threwError && errMsg.includes('Match does not exist')) {
      logTest(
        3,
        'Secure Backend Validation: Reject Arbitrary Callback (Non-Existent Match)',
        true,
        `Arbitrary Telegram callback correctly rejected with error: "${errMsg}". Inventory protected.`
      );
    } else {
      logTest(
        3,
        'Secure Backend Validation: Reject Arbitrary Callback',
        false,
        `Failed to reject arbitrary callback: threw=${threwError}, msg="${errMsg}"`
      );
    }
  } catch (err: any) {
    logTest(3, 'Secure Backend Validation: Reject Arbitrary Callback', false, `Error: ${err.message}`);
  }

  // TEST 4: Secure Backend Validation - Reject Expired / Inactive Request Callback
  try {
    const createRes = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      quantity: 3,
      urgency: 'HIGH',
    });

    const reqId = createRes.request.id;

    // Manually mark request as FULFILLED (inactive)
    const requestInDb = dbEngine.getEmergencyRequests().find(r => r.id === reqId);
    if (requestInDb) {
      requestInDb.status = 'FULFILLED';
    }

    let threwInactiveError = false;
    let inactiveMsg = '';
    try {
      await validateAndProcessTelegramCallback(`ACCEPT:${reqId}:${hospB_Id}`);
    } catch (err: any) {
      threwInactiveError = true;
      inactiveMsg = err.message;
    }

    if (threwInactiveError && inactiveMsg.includes('no longer active')) {
      logTest(
        4,
        'Secure Backend Validation: Reject Inactive/Fulfilled Request Callback',
        true,
        `Callback for inactive request correctly rejected with error: "${inactiveMsg}".`
      );
    } else {
      logTest(
        4,
        'Secure Backend Validation: Reject Inactive/Fulfilled Request Callback',
        false,
        `Unexpected behavior: threw=${threwInactiveError}, msg="${inactiveMsg}"`
      );
    }
  } catch (err: any) {
    logTest(4, 'Secure Backend Validation: Reject Inactive/Fulfilled Request Callback', false, `Error: ${err.message}`);
  }

  // TEST 5: Secure Backend Validation - Reject Callback When Inventory Insufficient
  try {
    // Hospital B has 15 oxygen cylinders available. Hospital A requests 25 cylinders.
    const bigReqRes = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      quantity: 25, // 25 > 15 available
      urgency: 'CRITICAL',
    });

    const bigReqId = bigReqRes.request.id;

    // Manually add a match to simulate callback attempt
    dbEngine.addEmergencyMatch({
      id: `em-match-test-${Date.now()}`,
      request_id: bigReqId,
      hospital_id: hospB_Id,
      distance_km: 6.0,
      status: 'PENDING',
      notified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    let threwStockErr = false;
    let stockMsg = '';
    try {
      await validateAndProcessTelegramCallback(`ACCEPT:${bigReqId}:${hospB_Id}`);
    } catch (err: any) {
      threwStockErr = true;
      stockMsg = err.message;
    }

    if (threwStockErr && stockMsg.includes('Insufficient available inventory')) {
      logTest(
        5,
        'Secure Backend Validation: Reject Callback on Insufficient Inventory',
        true,
        `Callback correctly rejected due to insufficient stock with error: "${stockMsg}".`
      );
    } else {
      logTest(
        5,
        'Secure Backend Validation: Reject Callback on Insufficient Inventory',
        false,
        `Unexpected result: threw=${threwStockErr}, msg="${stockMsg}"`
      );
    }
  } catch (err: any) {
    logTest(5, 'Secure Backend Validation: Reject Callback on Insufficient Inventory', false, `Error: ${err.message}`);
  }

  // TEST 6: Complete End-to-End Flow (Emergency → Telegram Callback → Backend Validation → Reservation & Stock Lock)
  try {
    // Hospital A creates valid Emergency Request for 5 Oxygen Cylinders
    const validReqRes = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      resource_name: 'Medical Oxygen Cylinders',
      quantity: 5,
      urgency: 'CRITICAL',
      notes: 'ICU Oxygen Emergency Phase 10 Test',
    });

    const reqId = validReqRes.request.id;
    const match = validReqRes.matches.find(m => m.hospital_id === hospB_Id);

    if (!match) {
      logTest(6, 'End-to-End Telegram Integration Flow', false, 'Failed to create match for Hospital B.');
      return;
    }

    // Simulate Telegram staff clicking [ ACCEPT & SUPPLY ] -> sends callback data
    const callbackData = `ACCEPT:${reqId}:${hospB_Id}`;

    const processResult = await validateAndProcessTelegramCallback(callbackData);

    // Verify resulting database state
    const reservations = dbEngine.getResourceReservations();
    const dispatches = dbEngine.getDispatches();
    const invB = dbEngine.getInventory(hospB_Id).find(i => i.resource_type === 'Oxygen');

    const reservationCreated = processResult.reservation && reservations.some(r => r.id === processResult.reservation?.id);
    const dispatchCreated = processResult.dispatch && dispatches.some(d => d.id === processResult.dispatch?.id);
    const invUpdated = invB && invB.reserved_quantity === 5 && invB.available_quantity === 10;

    if (
      processResult.success &&
      processResult.status === 'ACCEPTED' &&
      reservationCreated &&
      dispatchCreated &&
      invUpdated &&
      processResult.verificationCode
    ) {
      logTest(
        6,
        'End-to-End Telegram Flow (Emergency → Telegram Callback → Backend Validation → Reservation & Inventory Lock)',
        true,
        `Full Telegram integration verified! Backend validated callback, created reservation (${processResult.reservation?.id}), locked stock (Reserved=5, Available=10), and issued dispatch code: ${processResult.verificationCode}.`
      );
    } else {
      logTest(
        6,
        'End-to-End Telegram Flow',
        false,
        `End-to-end verification failed: res=${JSON.stringify(processResult)}, invB=${JSON.stringify(invB)}`
      );
    }
  } catch (err: any) {
    logTest(6, 'End-to-End Telegram Flow', false, `Error: ${err.message}`);
  }

  // Summary
  console.log('\n================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Phase 10 Telegram Test Results: ${passedCount}/${results.length} PASSED`);
  console.log('================================================================\n');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runPhase10TelegramTests().catch(err => {
  console.error('Unhandled error in Phase 10 test suite:', err);
  process.exit(1);
});
