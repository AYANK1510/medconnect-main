/**
 * MedConnect Pulse Phase 12 - Real Emergency Timeout & Twilio Escalation Verification Suite
 * Tests core Phase 12 requirements:
 * 1. Request accepted before 3 minutes -> No escalation, matches remain valid & request fulfilled.
 * 2. Request unaccepted after 3-minute response deadline -> Matches expired, request status ESCALATED, Twilio escalation triggered.
 * 3. Twilio failure / missing credentials handling -> TWILIO_NOT_CONFIGURED logged & recorded without fake call claim.
 * 4. Expired request cannot later be accepted -> Attempts to accept expired/escalated request (via Web API or Telegram callback) fail with server error and inventory is protected.
 */

import { dbEngine } from '../src/lib/dbEngine';
import { createEmergencyRequest, acceptEmergencyRequest } from '../src/services/emergencyService';
import { addInventoryItem } from '../src/services/inventoryService';
import {
  initiateTwilioVoiceCall,
  processEmergencyTimeouts,
} from '../src/services/twilioService';
import { validateAndProcessTelegramCallback } from '../src/services/telegramService';

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

async function runPhase12TimeoutTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 12 Emergency Timeout & Twilio Verification');
  console.log('================================================================\n');

  // Setup Test Hospitals & Inventory
  const hospA_Id = 'p12-hosp-A';
  const hospB_Id = 'p12-hosp-B';

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
    total_quantity: 30,
    unit: 'cylinders',
  });

  // TEST 1: Request Accepted Before 3 Minutes -> No Escalation
  try {
    const createRes = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      quantity: 5,
      urgency: 'CRITICAL',
    });

    const reqId = createRes.request.id;

    // Accept request immediately within 3-minute window
    await acceptEmergencyRequest(reqId, hospB_Id);

    // Run backend deadline checker 5 minutes in the future
    const futureTime = new Date(Date.now() + 5 * 60 * 1000);
    const timeoutRes = await processEmergencyTimeouts(futureTime);

    const reqAfter = dbEngine.getEmergencyRequests().find(r => r.id === reqId);
    const isEscalated = timeoutRes.escalatedRequestIds.includes(reqId);

    if (reqAfter?.status === 'FULFILLED' && !isEscalated) {
      logTest(
        1,
        'Accepted Before 3 Minutes (No Escalation Triggered)',
        true,
        `Request ${reqId} accepted in time. Status remained FULFILLED, deadline checker did NOT trigger escalation.`
      );
    } else {
      logTest(
        1,
        'Accepted Before 3 Minutes',
        false,
        `Unexpected result: reqStatus=${reqAfter?.status}, isEscalated=${isEscalated}`
      );
    }
  } catch (err: any) {
    logTest(1, 'Accepted Before 3 Minutes', false, `Error: ${err.message}`);
  }

  // TEST 2: No Acceptance After 3 Minutes -> Matches Expired & Twilio Escalation Triggered
  try {
    const createRes2 = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      quantity: 4,
      urgency: 'CRITICAL',
    });

    const req2Id = createRes2.request.id;

    // Simulate 3 minutes + 5 seconds passing without acceptance
    const deadlinePassedTime = new Date(Date.now() + (3 * 60 + 5) * 1000);

    const timeoutRes2 = await processEmergencyTimeouts(deadlinePassedTime);

    const req2After = dbEngine.getEmergencyRequests().find(r => r.id === req2Id);
    const matches2After = dbEngine.getEmergencyMatches().filter(m => m.request_id === req2Id);
    const matchesExpired = matches2After.length > 0 && matches2After.every(m => m.status === 'EXPIRED');

    if (
      req2After?.status === 'ESCALATED' &&
      matchesExpired &&
      timeoutRes2.escalatedRequestIds.includes(req2Id)
    ) {
      logTest(
        2,
        'No Acceptance After 3-Minute Deadline (Matches Expired & Escalation Triggered)',
        true,
        `Unaccepted request ${req2Id} expired matches and transitioned to ESCALATED after 3 minutes.`
      );
    } else {
      logTest(
        2,
        'No Acceptance After 3-Minute Deadline',
        false,
        `Escalation failed: status=${req2After?.status}, matchesExpired=${matchesExpired}`
      );
    }
  } catch (err: any) {
    logTest(2, 'No Acceptance After 3-Minute Deadline', false, `Error: ${err.message}`);
  }

  // TEST 3: Twilio Credentials Failure Handling (TWILIO_NOT_CONFIGURED Logged & Tracked)
  try {
    // Clear credentials
    const origSid = process.env.TWILIO_ACCOUNT_SID;
    const origToken = process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;

    const callRes = await initiateTwilioVoiceCall({
      requestId: 'test-tw-req-1',
      requestingHospitalName: 'Hospital A',
      resourceType: 'Oxygen',
      quantity: 5,
    });

    // Restore environment
    if (origSid) process.env.TWILIO_ACCOUNT_SID = origSid;
    if (origToken) process.env.TWILIO_AUTH_TOKEN = origToken;

    const activityLogs = dbEngine.getActivityLogs();
    const twLog = activityLogs.find(
      l => l.action === 'TWILIO_ESCALATION_ATTEMPT' && l.entity_id === 'test-tw-req-1'
    );

    if (
      callRes.success === false &&
      callRes.status === 'TWILIO_NOT_CONFIGURED' &&
      callRes.failureReason === 'TWILIO_NOT_CONFIGURED' &&
      twLog
    ) {
      logTest(
        3,
        'Twilio Missing Credentials Handling (TWILIO_NOT_CONFIGURED Logged & No Fake Call Claimed)',
        true,
        `Correctly logged TWILIO_NOT_CONFIGURED status without claiming an automated call occurred.`
      );
    } else {
      logTest(
        3,
        'Twilio Missing Credentials Handling',
        false,
        `Unexpected response: callRes=${JSON.stringify(callRes)}, twLog=${JSON.stringify(twLog)}`
      );
    }
  } catch (err: any) {
    logTest(3, 'Twilio Missing Credentials Handling', false, `Error: ${err.message}`);
  }

  // TEST 4: Expired Request Cannot Later Be Accepted (Inventory Intact)
  try {
    const createRes4 = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Oxygen',
      quantity: 6,
      urgency: 'HIGH',
    });

    const req4Id = createRes4.request.id;

    // Force deadline expiry via processEmergencyTimeouts
    const deadlinePassedTime = new Date(Date.now() + (3 * 60 + 10) * 1000);
    await processEmergencyTimeouts(deadlinePassedTime);

    const initialInvB = dbEngine.getInventory(hospB_Id).find(i => i.resource_type === 'Oxygen');
    const initialAvailable = initialInvB?.available_quantity || 0;

    // Subtest 4A: Attempt acceptance via acceptEmergencyRequest
    let threwExpiredErr1 = false;
    let errMsg1 = '';
    try {
      await acceptEmergencyRequest(req4Id, hospB_Id);
    } catch (err: any) {
      threwExpiredErr1 = true;
      errMsg1 = err.message;
    }

    // Subtest 4B: Attempt acceptance via Telegram callback validator
    let threwExpiredErr2 = false;
    let errMsg2 = '';
    try {
      await validateAndProcessTelegramCallback(`ACCEPT:${req4Id}:${hospB_Id}`);
    } catch (err: any) {
      threwExpiredErr2 = true;
      errMsg2 = err.message;
    }

    const currentInvB = dbEngine.getInventory(hospB_Id).find(i => i.resource_type === 'Oxygen');
    const invIntact = currentInvB?.available_quantity === initialAvailable;

    if (threwExpiredErr1 && threwExpiredErr2 && invIntact) {
      logTest(
        4,
        'Expired Request Cannot Later Be Accepted (Rejection Enforced & Inventory Protected)',
        true,
        `Both Web API and Telegram acceptances on expired request correctly rejected with errors ("${errMsg1}", "${errMsg2}"). Available stock unchanged at ${initialAvailable}.`
      );
    } else {
      logTest(
        4,
        'Expired Request Cannot Later Be Accepted',
        false,
        `Expired acceptance check failed: err1=${threwExpiredErr1}, err2=${threwExpiredErr2}, invIntact=${invIntact}`
      );
    }
  } catch (err: any) {
    logTest(4, 'Expired Request Cannot Later Be Accepted', false, `Error: ${err.message}`);
  }

  // Summary
  console.log('\n================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Phase 12 Emergency Timeout Test Results: ${passedCount}/${results.length} PASSED`);
  console.log('================================================================\n');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runPhase12TimeoutTests().catch(err => {
  console.error('Unhandled error in Phase 12 test suite:', err);
  process.exit(1);
});
