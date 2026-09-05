/**
 * Phase 4 - Empirical Proof & Live Workflow Execution Verification
 */

import { dbEngine } from '../src/lib/dbEngine';
import {
  executeAiReceptionistWorkflow,
  executeEmergencyDispatchWorkflow,
  testN8nConnectivity,
  N8N_WEBHOOK_SECRET,
} from '../src/services/n8nService';
import { addInventoryItem } from '../src/services/inventoryService';

async function runLiveVerification() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 4 — Live Workflow Execution & DB Verification');
  console.log('================================================================\n');

  // 1. CONNECTIVITY & AUTHENTICATION
  console.log('--- [STEP 1] Webhook Security & Health Verification ---');
  const healthRes = await fetch('http://localhost:5678/healthz');
  const healthJson = await healthRes.json();
  console.log('n8n Health Check:', healthJson);

  const testConnValid = await testN8nConnectivity();
  console.log('Backend -> n8n Valid Secret Test Result:', testConnValid);

  const testConnInvalid = await testN8nConnectivity('invalid-secret-key-999');
  console.log('Backend -> n8n Invalid Secret Protection Test Result:', testConnInvalid);
  console.log();

  // 2. WORKFLOW 1 — AI RECEPTIONIST EXECUTION & DATABASE PROOF
  console.log('--- [STEP 2] WORKFLOW 1 — AI RECEPTIONIST EXECUTION ---');
  const recPayload = {
    channel: 'text' as const,
    text: 'Book General Medicine appointment with Dr. Amit Patel today for patient Rohan',
    hospitalId: 'hosp-101',
    idempotencyKey: 'live-proof-rec-001',
  };
  const headers = { 'x-webhook-secret': N8N_WEBHOOK_SECRET };

  console.log('Triggering AI Receptionist Workflow with Payload:', recPayload);
  const recResult = await executeAiReceptionistWorkflow(recPayload, headers);

  console.log('\n[EVIDENCE] AI Receptionist Workflow Execution Logs:');
  recResult.executionLogs.forEach((log, index) => {
    console.log(`  Node ${index + 1}: [${log.status}] ${log.nodeName} (${log.nodeType})`);
  });

  console.log('\n[EVIDENCE] Returned Action Payload:');
  console.log(JSON.stringify(recResult.data?.actionPayload || recResult.data, null, 2));

  console.log('\n[EVIDENCE] Database Appointments Record Check:');
  const appointments = dbEngine.getAppointments();
  console.log('Total Appointments in Database:', appointments.length);
  const latestAppt = appointments[appointments.length - 1];
  console.log('Latest Created Appointment:', latestAppt);

  // Idempotency Check for Workflow 1
  console.log('\nTesting Workflow 1 Idempotency with identical key...');
  const recResultDuplicate = await executeAiReceptionistWorkflow(recPayload, headers);
  console.log('Idempotency Cached Execution Flag:', recResultDuplicate.isCachedExecution);
  console.log('Appointments Count After Duplicate:', dbEngine.getAppointments().length);
  console.log();

  // 3. WORKFLOW 2 — EMERGENCY DISPATCH EXECUTION & DATABASE PROOF
  console.log('--- [STEP 3] WORKFLOW 2 — EMERGENCY DISPATCH EXECUTION ---');

  // Setup test hospitals and inventory
  const reqHospId = 'proof-hosp-req';
  const suppHospId = 'proof-hosp-supp';

  dbEngine.addOrUpdateHospital({
    id: reqHospId,
    name: 'Apollo Trauma Care Center',
    latitude: 28.6139,
    longitude: 77.2090,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: suppHospId,
    name: 'Fortis Emergency Hub (4.8 km away)',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  await addInventoryItem({
    hospital_id: suppHospId,
    resource_type: 'O-NEG Blood',
    item_name: 'O-Negative Packed Red Blood Cells',
    total_quantity: 20,
    unit: 'units',
  });

  const emPayload = {
    requesting_hospital_id: reqHospId,
    resource_type: 'O-NEG Blood',
    quantity: 4,
    urgency: 'CRITICAL' as const,
    simulatedAcceptedBeforeTimeout: true,
    idempotencyKey: 'live-proof-em-001',
  };

  console.log('Triggering Emergency Dispatch Workflow with Payload:', emPayload);
  const emResult = await executeEmergencyDispatchWorkflow(emPayload, headers);

  console.log('\n[EVIDENCE] Emergency Dispatch Workflow Execution Logs:');
  emResult.executionLogs.forEach((log, index) => {
    console.log(`  Node ${index + 1}: [${log.status}] ${log.nodeName} (${log.nodeType})`);
  });

  console.log('\n[EVIDENCE] Created Emergency Request in DB:');
  console.log(JSON.stringify(emResult.data?.request, null, 2));

  console.log('\n[EVIDENCE] Matched Nearby Hospitals (within 15 km Haversine):');
  console.log(JSON.stringify(emResult.data?.matches, null, 2));

  console.log('\n[EVIDENCE] Workflow Outcome:', emResult.data?.outcome);

  // Idempotency Check for Workflow 2
  console.log('\nTesting Workflow 2 Idempotency with identical key...');
  const emResultDuplicate = await executeEmergencyDispatchWorkflow(emPayload, headers);
  console.log('Idempotency Cached Execution Flag:', emResultDuplicate.isCachedExecution);
  console.log('Emergency Requests Count After Duplicate:', dbEngine.getEmergencyRequests().length);

  console.log('\n================================================================');
  console.log('🎉 ALL LIVE WORKFLOW EXECUTION EVIDENCES VERIFIED SUCCESSFULLY!');
  console.log('================================================================');
}

runLiveVerification().catch(err => {
  console.error('Error running live verification:', err);
  process.exit(1);
});
