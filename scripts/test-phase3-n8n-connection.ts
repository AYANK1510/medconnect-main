/**
 * Phase 3 — Connect Local n8n with Application Verification Suite
 * Verifies:
 * 1. Local n8n instance health check (http://localhost:5678/healthz)
 * 2. Backend HTTP POST call to n8n webhook (http://localhost:5678/webhook/medconnect-test) with valid secret header
 * 3. n8n workflow execution and response: { "success": true, "source": "n8n" }
 * 4. Secret authentication enforcement (invalid secret returns 401 status)
 */

import { testN8nConnectivity, N8N_WEBHOOK_SECRET } from '../src/services/n8nService';

async function runPhase3Verification() {
  console.log('================================================================');
  console.log('Phase 3: MedConnect Pulse ↔ Backend ↔ Local n8n Verification');
  console.log('================================================================\n');

  // STEP 1: Verify n8n Server Health
  console.log('[STEP 1] Checking Local n8n Server Health (http://localhost:5678/healthz)...');
  try {
    const healthRes = await fetch('http://localhost:5678/healthz');
    const healthData = await healthRes.json();
    if (healthRes.ok && healthData.status === 'ok') {
      console.log('  ✅ Local n8n server is RUNNING and HEALTHY.\n');
    } else {
      console.error('  ❌ n8n health check failed:', healthData);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`  ❌ Could not connect to local n8n at http://localhost:5678: ${err.message}`);
    process.exit(1);
  }

  // STEP 2: Make Application/Backend HTTP Request to n8n Webhook with Valid Secret
  console.log('[STEP 2] Sending HTTP Request from Application/Backend to Local n8n Webhook...');
  console.log(`  Target URL: http://localhost:5678/webhook/medconnect-test`);
  console.log(`  Header x-webhook-secret: ${N8N_WEBHOOK_SECRET}`);

  const validTestResult = await testN8nConnectivity();

  if (validTestResult.success && validTestResult.source === 'n8n') {
    console.log('  ✅ Application request = RECEIVED');
    console.log('  ✅ n8n workflow = EXECUTED');
    console.log(`  ✅ n8n response = RECEIVED -> ${JSON.stringify(validTestResult)}\n`);
  } else {
    console.error('  ❌ Connectivity test failed with valid secret:', validTestResult);
    process.exit(1);
  }

  // STEP 3: Verify Webhook Secret Protection (Invalid Secret)
  console.log('[STEP 3] Verifying Webhook Authentication Protection (Invalid Secret)...');
  const invalidTestResult = await testN8nConnectivity('invalid-secret-key-xyz');

  if (!invalidTestResult.success && (invalidTestResult.statusCode === 401 || invalidTestResult.error?.includes('UNAUTHORIZED_WEBHOOK_SECRET'))) {
    console.log(`  ✅ Webhook security protected: Unauthorized request rejected (${invalidTestResult.error || '401 Unauthorized'}).\n`);
  } else {
    console.error('  ❌ Security verification failed:', invalidTestResult);
    process.exit(1);
  }

  console.log('================================================================');
  console.log('🎉 PHASE 3 VERIFICATION PASSED SUCCESSFULLY!');
  console.log('Application ↔ Backend ↔ Local n8n connectivity is fully working.');
  console.log('================================================================');
}

runPhase3Verification().catch((err) => {
  console.error('Unhandled error in Phase 3 test:', err);
  process.exit(1);
});
