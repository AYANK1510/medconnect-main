/**
 * MedConnect Pulse Phase 14 - Real n8n Workflows Verification Suite
 * Tests core Phase 14 requirements:
 * 1. Webhook Security & Auth Header Verification (401 Unauthorized on missing/invalid x-webhook-secret)
 * 2. Workflow 1 (AI Receptionist) End-to-End Execution (Webhook -> Validation -> Sarvam -> OpenAI -> Backend -> Supabase -> Appointment/Queue -> Notification -> Response)
 * 3. Workflow 1 Idempotency (Duplicate requests with identical idempotency keys return cached execution without duplicate DB appointments/tokens)
 * 4. Workflow 2 (Emergency Dispatch) End-to-End Pipeline (Webhook -> Validate Request -> Get Coordinates -> Haversine 15km -> Inventory Matches -> DB Sync -> Telegram Alert)
 * 5. Workflow 2 Idempotency (Duplicate emergency payloads return cached request without duplicate DB request creation or double inventory reservation)
 * 6. Workflow 2 Acceptance Check & Stop Node (Accepted request stops gracefully without triggering Twilio voice escalation)
 * 7. Workflow 2 Timeout & Twilio Escalation Node (Unaccepted request after 3-minute wait window marks request ESCALATED and triggers Twilio voice escalation call)
 */

import { dbEngine } from '../src/lib/dbEngine';
import {
  executeAiReceptionistWorkflow,
  executeEmergencyDispatchWorkflow,
  N8N_WEBHOOK_SECRET,
  clearIdempotencyCache,
} from '../src/services/n8nService';
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

async function runPhase14N8nTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 14 Real n8n Workflows Verification');
  console.log('================================================================\n');

  // Reset idempotency state
  clearIdempotencyCache();

  const validHeaders = { 'x-webhook-secret': N8N_WEBHOOK_SECRET };
  const invalidHeaders = { 'x-webhook-secret': 'wrong-unauthorized-secret' };

  // TEST 1: Webhook Security & Secret Header Verification
  try {
    const resNoHeaders = await executeAiReceptionistWorkflow({ channel: 'text', text: 'Hello' });
    const resInvalidHeaders = await executeAiReceptionistWorkflow({ channel: 'text', text: 'Hello' }, invalidHeaders);

    if (
      resNoHeaders.statusCode === 401 &&
      resNoHeaders.error?.includes('UNAUTHORIZED_WEBHOOK_SECRET') &&
      resInvalidHeaders.statusCode === 401 &&
      resInvalidHeaders.error?.includes('UNAUTHORIZED_WEBHOOK_SECRET')
    ) {
      logTest(
        1,
        'Webhook Security & Auth Header Verification (401 Unauthorized on missing/invalid secret)',
        true,
        'Unauthorized webhook triggers were rejected with 401 status code.'
      );
    } else {
      logTest(1, 'Webhook Security & Auth Header Verification', false, `ResNoHeaders: ${resNoHeaders.statusCode}, ResInvalid: ${resInvalidHeaders.statusCode}`);
    }
  } catch (err: any) {
    logTest(1, 'Webhook Security & Auth Header Verification', false, `Error: ${err.message}`);
  }

  // TEST 2: Workflow 1 (AI Receptionist) End-to-End Execution
  try {
    const res = await executeAiReceptionistWorkflow(
      {
        channel: 'text',
        text: 'Book General Medicine appointment with Dr. Amit Patel tomorrow for patient Aarav',
        hospitalId: 'hosp-101',
        idempotencyKey: 'test-rec-wf-001',
      },
      validHeaders
    );

    const nodeNames = res.executionLogs.map(l => l.nodeName);
    const expectedNodes = [
      'Webhook Trigger',
      'Validate Request & Auth',
      'Sarvam Speech-to-Text',
      'OpenAI Intent Engine',
      'Backend DB Validation',
      'Supabase PostgreSQL Sync',
      'Appointment / Queue Token',
      'Notification Dispatcher',
      'Structured Response Handler',
    ];

    const hasAllNodes = expectedNodes.every(n => nodeNames.includes(n));
    const hasToken = Boolean(res.data?.actionPayload?.token || res.data?.actionPayload?.appointment);

    if (res.success && hasAllNodes && hasToken) {
      logTest(
        2,
        'Workflow 1 (AI Receptionist) End-to-End Pipeline Execution',
        true,
        `Executed all 9 n8n pipeline nodes successfully. Appointment/Token generated (${res.data?.actionPayload?.token?.token_number || 'Token Created'}).`
      );
    } else {
      logTest(2, 'Workflow 1 (AI Receptionist) End-to-End Pipeline Execution', false, `Success: ${res.success}, HasAllNodes: ${hasAllNodes}, HasToken: ${hasToken}`);
    }
  } catch (err: any) {
    logTest(2, 'Workflow 1 (AI Receptionist) End-to-End Pipeline Execution', false, `Error: ${err.message}`);
  }

  // TEST 3: Workflow 1 Idempotency
  try {
    const initialAppointmentsCount = dbEngine.getAppointments().length;

    // Call workflow second time with identical idempotencyKey
    const resDuplicate = await executeAiReceptionistWorkflow(
      {
        channel: 'text',
        text: 'Book General Medicine appointment with Dr. Amit Patel tomorrow for patient Aarav',
        hospitalId: 'hosp-101',
        idempotencyKey: 'test-rec-wf-001',
      },
      validHeaders
    );

    const finalAppointmentsCount = dbEngine.getAppointments().length;
    const noDuplicateAppointments = finalAppointmentsCount === initialAppointmentsCount;

    if (resDuplicate.isCachedExecution === true && noDuplicateAppointments) {
      logTest(
        3,
        'Workflow 1 Idempotency Protection (Prevents Duplicate Appointments/Tokens)',
        true,
        'Duplicate n8n execution returned cached response without creating duplicate database records.'
      );
    } else {
      logTest(
        3,
        'Workflow 1 Idempotency Protection',
        false,
        `isCachedExecution: ${resDuplicate.isCachedExecution}, apptCountBefore: ${initialAppointmentsCount}, apptCountAfter: ${finalAppointmentsCount}`
      );
    }
  } catch (err: any) {
    logTest(3, 'Workflow 1 Idempotency Protection', false, `Error: ${err.message}`);
  }

  // Setup Test Hospitals & Inventory for Workflow 2
  const reqHospId = 'p14-hosp-req';
  const suppHospId = 'p14-hosp-supp';

  dbEngine.addOrUpdateHospital({
    id: reqHospId,
    name: 'Phase 14 Requesting Emergency Hospital',
    latitude: 28.6139,
    longitude: 77.2090,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: suppHospId,
    name: 'Phase 14 Supplying Hospital (5 km away)',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  await addInventoryItem({
    hospital_id: suppHospId,
    resource_type: 'ICU Bed',
    item_name: 'ICU Ventilator Bed Unit',
    total_quantity: 15,
    unit: 'beds',
  });

  // TEST 4: Workflow 2 (Emergency Dispatch) 15km Haversine + Inventory Match + Telegram Alert
  try {
    const res = await executeEmergencyDispatchWorkflow(
      {
        requesting_hospital_id: reqHospId,
        resource_type: 'ICU Bed',
        quantity: 2,
        urgency: 'CRITICAL',
        simulatedAcceptedBeforeTimeout: true,
        idempotencyKey: 'test-em-wf-001',
      },
      validHeaders
    );

    const nodeNames = res.executionLogs.map(l => l.nodeName);
    const expectedNodes = [
      'Webhook Trigger',
      'Validate Request & Auth',
      'Get Hospital Coordinates',
      'Haversine 15km Filter',
      'Inventory Matcher',
      'Create DB Request & Matches',
      'Telegram Emergency Alert',
      '3 Minute Wait Node',
      'Database Acceptance Check',
      'Accepted Check Node',
      'Stop Node',
    ];

    const hasExpectedNodes = expectedNodes.every(n => nodeNames.includes(n));
    const createdReq = res.data?.request;

    if (res.success && hasExpectedNodes && createdReq && res.data?.outcome === 'ACCEPTED_IN_TIME') {
      logTest(
        4,
        'Workflow 2 (Emergency Dispatch) 15km Haversine + Inventory + Telegram Execution',
        true,
        `Emergency request created (${createdReq.id}), candidate hospitals matched within 15 km, Telegram alerts dispatched.`
      );
    } else {
      logTest(
        4,
        'Workflow 2 (Emergency Dispatch) Execution',
        false,
        `Success: ${res.success}, HasNodes: ${hasExpectedNodes}, Outcome: ${res.data?.outcome}`
      );
    }
  } catch (err: any) {
    logTest(4, 'Workflow 2 (Emergency Dispatch) Execution', false, `Error: ${err.message}`);
  }

  // TEST 5: Workflow 2 Idempotency Protection
  try {
    const initialRequestsCount = dbEngine.getEmergencyRequests().length;

    const resDuplicate = await executeEmergencyDispatchWorkflow(
      {
        requesting_hospital_id: reqHospId,
        resource_type: 'ICU Bed',
        quantity: 2,
        urgency: 'CRITICAL',
        idempotencyKey: 'test-em-wf-001',
      },
      validHeaders
    );

    const finalRequestsCount = dbEngine.getEmergencyRequests().length;

    if (resDuplicate.isCachedExecution === true && finalRequestsCount === initialRequestsCount) {
      logTest(
        5,
        'Workflow 2 Idempotency Protection (Prevents Duplicate Emergency Requests/Reservations)',
        true,
        'Duplicate n8n emergency dispatch trigger returned cached request without duplicate DB insertions.'
      );
    } else {
      logTest(
        5,
        'Workflow 2 Idempotency Protection',
        false,
        `isCachedExecution: ${resDuplicate.isCachedExecution}, reqCountBefore: ${initialRequestsCount}, reqCountAfter: ${finalRequestsCount}`
      );
    }
  } catch (err: any) {
    logTest(5, 'Workflow 2 Idempotency Protection', false, `Error: ${err.message}`);
  }

  // TEST 6: Workflow 2 Acceptance Check & Stop Node (Accepted Request)
  try {
    const res = await executeEmergencyDispatchWorkflow(
      {
        requesting_hospital_id: reqHospId,
        resource_type: 'ICU Bed',
        quantity: 1,
        urgency: 'HIGH',
        simulatedAcceptedBeforeTimeout: true,
        idempotencyKey: 'test-em-wf-accepted-002',
      },
      validHeaders
    );

    const twilioLog = res.executionLogs.find(l => l.nodeName === 'Twilio Escalation Call');

    if (res.data?.outcome === 'ACCEPTED_IN_TIME' && !twilioLog) {
      logTest(
        6,
        'Workflow 2 Acceptance Check & Stop Node (Accepted Request Stops Gracefully)',
        true,
        'Request accepted within wait window. Workflow gracefully stopped at Stop Node without calling Twilio.'
      );
    } else {
      logTest(
        6,
        'Workflow 2 Acceptance Check & Stop Node',
        false,
        `Outcome: ${res.data?.outcome}, TwilioNodeExecuted: ${Boolean(twilioLog)}`
      );
    }
  } catch (err: any) {
    logTest(6, 'Workflow 2 Acceptance Check & Stop Node', false, `Error: ${err.message}`);
  }

  // TEST 7: Workflow 2 Timeout & Twilio Escalation Node (Unaccepted Request)
  try {
    const res = await executeEmergencyDispatchWorkflow(
      {
        requesting_hospital_id: reqHospId,
        resource_type: 'ICU Bed',
        quantity: 1,
        urgency: 'CRITICAL',
        simulatedAcceptedBeforeTimeout: false,
        idempotencyKey: 'test-em-wf-unaccepted-003',
      },
      validHeaders
    );

    const twilioLog = res.executionLogs.find(l => l.nodeName === 'Twilio Escalation Call');
    const dbReq = dbEngine.getEmergencyRequests().find(r => r.id === res.data?.request?.id);

    if (res.data?.outcome === 'ESCALATED' && twilioLog && dbReq?.status === 'ESCALATED') {
      logTest(
        7,
        'Workflow 2 Timeout & Twilio Escalation Node (Unaccepted Request Escalates)',
        true,
        `Request remained unaccepted after wait window. Status updated to ESCALATED in DB, Twilio escalation call node executed.`
      );
    } else {
      logTest(
        7,
        'Workflow 2 Timeout & Twilio Escalation Node',
        false,
        `Outcome: ${res.data?.outcome}, TwilioLog: ${Boolean(twilioLog)}, DBStatus: ${dbReq?.status}`
      );
    }
  } catch (err: any) {
    logTest(7, 'Workflow 2 Timeout & Twilio Escalation Node', false, `Error: ${err.message}`);
  }

  // Summary
  console.log('\n================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Phase 14 Real n8n Workflows Test Results: ${passedCount}/${results.length} PASSED`);
  console.log('================================================================\n');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runPhase14N8nTests().catch(err => {
  console.error('Unhandled error in Phase 14 test suite:', err);
  process.exit(1);
});
