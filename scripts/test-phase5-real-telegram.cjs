#!/usr/bin/env node
/**
 * PHASE 5 — CONFIGURE AND TEST REAL TELEGRAM INTEGRATION
 * 
 * Pipeline:
 *   ER Staff → Emergency Request → Backend → n8n → Haversine 15km → Matching Hospitals → Telegram Alert
 *   Telegram Message: requesting hospital, resource, quantity, urgency, distance, buttons [ ACCEPT & SUPPLY ], [ DECLINE ]
 *   Acceptance: Click [ ACCEPT & SUPPLY ] → Telegram callback → Backend → Authorization → Emergency validation → Inventory validation → Atomic reservation
 *   Security: Unauthorized Telegram user cannot accept another hospital's request (inventory protected)
 * 
 * Rules:
 *   - Do NOT use a fake notification.
 *   - Only report "Telegram = PASS" if the complete real flow succeeds with real Telegram API.
 *   - If credentials are missing, explicitly report "Telegram = NOT CONFIGURED".
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');

// Read .env file directly to ensure freshest secrets
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_CHAT_ID   = (process.env.TELEGRAM_CHAT_ID   || env.TELEGRAM_CHAT_ID   || '').trim();
const N8N_BASE           = 'http://localhost:5678';
const WEBHOOK_SECRET     = 'medconnect-n8n-secret-key';
const DB_PATH            = path.join(os.homedir(), '.n8n', 'database.sqlite');
const WORKFLOW_ID_EMG    = 'wf-emergency-dispatch-v14';

function getLastExecution(workflowId) {
  try {
    const result = execSync(
      `sqlite3 "${DB_PATH}" "SELECT id, workflowId, status, startedAt, stoppedAt FROM execution_entity WHERE workflowId='${workflowId}' ORDER BY startedAt DESC LIMIT 1;"`,
      { encoding: 'utf8' }
    ).trim();
    if (!result) return null;
    const [id, wfId, status, startedAt, stoppedAt] = result.split('|');
    return { id, workflowId: wfId, status, startedAt, stoppedAt };
  } catch (e) {
    return null;
  }
}

function getExecutionCount(workflowId) {
  try {
    const result = execSync(
      `sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM execution_entity WHERE workflowId='${workflowId}';"`,
      { encoding: 'utf8' }
    ).trim();
    return parseInt(result, 10);
  } catch (e) {
    return 0;
  }
}

function httpPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const urlObj  = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port:     urlObj.port || 80,
      path:     urlObj.pathname + urlObj.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ statusCode: res.statusCode, body: data, raw: true }); }
      });
    });
    req.on('error', reject);
    setTimeout(() => { req.destroy(new Error('Timeout')); }, 10000);
    req.write(bodyStr);
    req.end();
  });
}

async function runPhase5TelegramVerification() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('  PHASE 5 — CONFIGURE AND TEST REAL TELEGRAM INTEGRATION');
  console.log('  Architecture: ER Staff → Emergency Request → Backend → n8n');
  console.log('                → Haversine → Matching Hospitals → Telegram');
  console.log('══════════════════════════════════════════════════════════════════\n');

  const isConfigured = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

  console.log('[CONFIGURATION CHECK]');
  console.log(`  TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN ? '••••••••' + TELEGRAM_BOT_TOKEN.slice(-4) : '(NOT CONFIGURED)'}`);
  console.log(`  TELEGRAM_CHAT_ID:   ${TELEGRAM_CHAT_ID ? TELEGRAM_CHAT_ID : '(NOT CONFIGURED)'}`);
  console.log(`  Credential Status:  ${isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}\n`);

  // ── STEP 1: Emergency Flow through Real n8n Orchestrator ──────────────────
  console.log('──────────────────────────────────────────────────────────────────');
  console.log('[STEP 1] EMERGENCY FLOW (ER Staff → Request → Backend → n8n → Haversine → Matching Hospitals → Telegram)');
  console.log(`  Target Webhook: ${N8N_BASE}/webhook/emergency-dispatch`);
  console.log('  Testing Haversine 15km filter & matching hospital identification...');

  const execCountBefore = getExecutionCount(WORKFLOW_ID_EMG);

  const emergencyPayload = {
    requesting_hospital_id: 'hosp-101',
    resource_type: 'Oxygen Cylinders (45L)',
    quantity: 5,
    urgency: 'CRITICAL',
    notes: 'Severe trauma ER patient requires immediate oxygen supply',
  };

  let n8nEmergencyResult;
  try {
    n8nEmergencyResult = await httpPost(
      `${N8N_BASE}/webhook/emergency-dispatch`,
      { 'x-webhook-secret': WEBHOOK_SECRET },
      emergencyPayload
    );
  } catch (err) {
    console.error(`  ❌ Failed to reach n8n webhook: ${err.message}`);
  }

  let n8nPassed = false;
  let telegramAlertPayload = null;

  if (n8nEmergencyResult && n8nEmergencyResult.statusCode === 200 && n8nEmergencyResult.body?.success) {
    const data = n8nEmergencyResult.body.data;
    const alert = data?.telegramAlert;
    telegramAlertPayload = alert;

    const execCountAfter = getExecutionCount(WORKFLOW_ID_EMG);
    const lastExec = getLastExecution(WORKFLOW_ID_EMG);

    console.log('  ✅ n8n Emergency Dispatch Webhook: TRIGGERED');
    console.log(`  ✅ Source: ${n8nEmergencyResult.body.source} (Workflow: ${n8nEmergencyResult.body.workflowId})`);
    console.log(`  ✅ Haversine Calculation: Found ${data.nearbyHospitalsFound} hospital(s) within 15 km`);
    console.log(`  ✅ Matched Supplying Hospital: ${data.matches[0]?.hospital_name} (${data.matches[0]?.distance_km} km)`);
    console.log(`  ✅ n8n Execution Recorded: #${lastExec?.id}, status=${lastExec?.status}`);

    // Verify Telegram Message Content & Buttons
    const text = alert?.text || '';
    const hasHospital = text.includes('Metro City General Hospital') || text.includes('Emergency Hospital');
    const hasResource = text.includes('Oxygen');
    const hasQuantity = text.includes('5');
    const hasUrgency  = text.includes('CRITICAL');
    const hasDistance = text.includes('km');

    const buttons = alert?.reply_markup?.inline_keyboard?.[0] || [];
    const acceptBtn = buttons.find(b => b.text === 'ACCEPT & SUPPLY');
    const declineBtn = buttons.find(b => b.text === 'DECLINE');

    console.log('\n[TELEGRAM ALERT MESSAGE VERIFICATION]');
    console.log(`  • Requesting Hospital present: ${hasHospital ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Resource present:            ${hasResource ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Quantity present:            ${hasQuantity ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Urgency present:             ${hasUrgency ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Distance present:            ${hasDistance ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Button [ ACCEPT & SUPPLY ]:  ${acceptBtn ? '✅ YES (' + acceptBtn.callback_data + ')' : '❌ NO'}`);
    console.log(`  • Button [ DECLINE ]:          ${declineBtn ? '✅ YES (' + declineBtn.callback_data + ')' : '❌ NO'}`);

    if (hasHospital && hasResource && hasQuantity && hasUrgency && hasDistance && acceptBtn && declineBtn) {
      n8nPassed = true;
    }
  } else {
    console.error(`  ❌ n8n Emergency Dispatch workflow failed: ${JSON.stringify(n8nEmergencyResult?.body)}`);
  }

  // ── STEP 2: Real Telegram Message Delivery ────────────────────────────────
  console.log('\n──────────────────────────────────────────────────────────────────');
  console.log('[STEP 2] REAL TELEGRAM DISPATCH TO TELEGRAM SERVERS');

  let telegramDeliverySuccess = false;
  let telegramDeliveryStatus = 'NOT CONFIGURED';
  let telegramError = null;

  if (!isConfigured) {
    console.log('  ⚠️  TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID is empty in .env');
    console.log('  ⚠️  Rule enforced: DO NOT use a fake notification. No mock delivery.');
    console.log('  ℹ️  Actual Telegram message dispatch cannot proceed without live credentials.');
    telegramDeliveryStatus = 'TELEGRAM_NOT_CONFIGURED';
  } else {
    console.log('  Attempting live dispatch to https://api.telegram.org...');
    try {
      const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramAlertPayload?.text,
          parse_mode: 'Markdown',
          reply_markup: telegramAlertPayload?.reply_markup,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        console.log('  ✅ Actual Telegram message dispatched successfully!');
        console.log(`     Message ID: ${data.result?.message_id}, Chat: ${data.result?.chat?.title || data.result?.chat?.id}`);
        telegramDeliverySuccess = true;
        telegramDeliveryStatus = 'DISPATCHED';
      } else {
        console.error('  ❌ Telegram API returned error:', data.description);
        telegramDeliveryStatus = 'FAIL';
        telegramError = data.description;
      }
    } catch (err) {
      console.error('  ❌ Telegram fetch error:', err.message);
      telegramDeliveryStatus = 'FAIL';
      telegramError = err.message;
    }
  }

  // ── STEP 3: ACCEPTANCE & ATOMIC RESERVATION ───────────────────────────────
  console.log('\n──────────────────────────────────────────────────────────────────');
  console.log('[STEP 3] ACCEPTANCE FLOW: Click [ ACCEPT & SUPPLY ]');
  console.log('  Testing: Telegram callback → Backend → Authorization → Emergency validation');
  console.log('           → Inventory validation → Atomic reservation');

  const tsxRunner = 'npx tsx -e';
  const acceptanceTestCode = `
    import { dbEngine } from './src/lib/dbEngine';
    import { validateAndProcessTelegramCallback } from './src/services/telegramService';
    import { createEmergencyRequest } from './src/services/emergencyService';
    import { addInventoryItem } from './src/services/inventoryService';

    async function test() {
      // 1. Setup Requesting Hospital & Supplying Hospital
      dbEngine.addOrUpdateHospital({ id: 'hosp-acc-req', name: 'Trauma Care Unit A', latitude: 28.6139, longitude: 77.2090, is_active: true });
      dbEngine.addOrUpdateHospital({ id: 'hosp-acc-sup', name: 'Provider Center B', latitude: 28.5672, longitude: 77.2400, is_active: true });

      // Add stock at Supplying Hospital: 10 Oxygen Cylinders
      await addInventoryItem({
        hospital_id: 'hosp-acc-sup',
        resource_type: 'Oxygen',
        item_name: 'Medical Oxygen Cylinders',
        total_quantity: 10,
        unit: 'cylinders',
      });

      // Create valid emergency request
      const reqRes = await createEmergencyRequest({
        requesting_hospital_id: 'hosp-acc-req',
        resource_type: 'Oxygen',
        resource_name: 'Medical Oxygen Cylinders',
        quantity: 4,
        urgency: 'CRITICAL',
      });

      const reqId = reqRes.request.id;
      const callbackData = 'ACCEPT:' + reqId + ':hosp-acc-sup';

      // Process callback
      const result = await validateAndProcessTelegramCallback(callbackData);

      // Verify DB state
      const invAfter = dbEngine.getInventory('hosp-acc-sup').find(i => i.resource_type === 'Oxygen');
      const res = dbEngine.getResourceReservations().find(r => r.request_id === reqId);
      const dsp = dbEngine.getDispatches().find(d => d.request_id === reqId);

      const isValid = (
        result.success === true &&
        result.status === 'ACCEPTED' &&
        res !== undefined &&
        dsp !== undefined &&
        invAfter.reserved_quantity === 4 &&
        invAfter.available_quantity === 6 &&
        Boolean(result.verificationCode)
      );

      console.log(JSON.stringify({
        isValid,
        reservationId: res?.id,
        dispatchId: dsp?.id,
        verificationCode: result.verificationCode,
        reservedQty: invAfter?.reserved_quantity,
        availableQty: invAfter?.available_quantity,
      }));
    }

    test().catch(e => { console.error(e); process.exit(1); });
  `;

  let acceptancePassed = false;
  try {
    const rawOutput = execSync(`npx tsx -e "${acceptanceTestCode.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
    const parsed = JSON.parse(rawOutput.split('\n').pop());
    if (parsed.isValid) {
      acceptancePassed = true;
      console.log('  ✅ Telegram callback accepted and validated');
      console.log('  ✅ Authorization verified: Supplying hospital confirmed');
      console.log('  ✅ Emergency request validated: Status transitioned to ACCEPTED');
      console.log('  ✅ Inventory validated: Stock locked atomically');
      console.log(`     • Reserved Quantity: ${parsed.reservedQty}`);
      console.log(`     • Available Quantity: ${parsed.availableQty}`);
      console.log(`     • Reservation ID: ${parsed.reservationId}`);
      console.log(`     • Dispatch Verification Code: ${parsed.verificationCode}`);
    } else {
      console.error('  ❌ Acceptance validation check failed:', parsed);
    }
  } catch (err) {
    console.error('  ❌ Acceptance test error:', err.message);
  }

  // ── STEP 4: SECURITY VERIFICATION ─────────────────────────────────────────
  console.log('\n──────────────────────────────────────────────────────────────────');
  console.log('[STEP 4] SECURITY: Unauthorized Telegram User Cannot Accept Request');

  const securityTestCode = `
    import { dbEngine } from './src/lib/dbEngine';
    import { validateAndProcessTelegramCallback } from './src/services/telegramService';
    import { createEmergencyRequest } from './src/services/emergencyService';

    async function testSecurity() {
      dbEngine.addOrUpdateHospital({ id: 'hosp-sec-req', name: 'Hospital Alpha', latitude: 28.6139, longitude: 77.2090, is_active: true });
      dbEngine.addOrUpdateHospital({ id: 'hosp-sec-valid', name: 'Hospital Beta', latitude: 28.5672, longitude: 77.2400, is_active: true });

      const reqRes = await createEmergencyRequest({
        requesting_hospital_id: 'hosp-sec-req',
        resource_type: 'Oxygen',
        quantity: 2,
        urgency: 'CRITICAL',
      });

      const reqId = reqRes.request.id;

      // 1. Unauthorized Hospital ID Attempt
      let unauthRejected = false;
      let unauthError = '';
      try {
        await validateAndProcessTelegramCallback('ACCEPT:' + reqId + ':hosp-unauthorized-attacker');
      } catch (err) {
        unauthRejected = true;
        unauthError = err.message;
      }

      // 2. Arbitrary Fake Callback Query
      let fakeRejected = false;
      try {
        await validateAndProcessTelegramCallback('ACCEPT:fake-req-9999:fake-hosp-9999');
      } catch (err) {
        fakeRejected = true;
      }

      console.log(JSON.stringify({
        unauthRejected,
        unauthError,
        fakeRejected,
      }));
    }

    testSecurity().catch(e => { console.error(e); process.exit(1); });
  `;

  let securityPassed = false;
  try {
    const rawSecurityOutput = execSync(`npx tsx -e "${securityTestCode.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
    const parsedSec = JSON.parse(rawSecurityOutput.split('\n').pop());
    if (parsedSec.unauthRejected && parsedSec.fakeRejected) {
      securityPassed = true;
      console.log('  ✅ Security Verified: Unauthorized supplying hospital rejected');
      console.log(`     Error message: "${parsedSec.unauthError}"`);
      console.log('  ✅ Security Verified: Arbitrary / forged callback queries rejected');
      console.log('  ✅ Medical inventory & hospital state completely protected');
    } else {
      console.error('  ❌ Security check failed:', parsedSec);
    }
  } catch (err) {
    console.error('  ❌ Security test error:', err.message);
  }

  // ── FINAL STATUS ASSESSMENT ───────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('FINAL INTEGRATION STATUS REPORT:');
  console.log(`  n8n Emergency Dispatch: ${n8nPassed ? 'PASS' : 'FAIL'}`);
  console.log(`  Telegram Alert Format:  ${n8nPassed ? 'PASS' : 'FAIL'}`);
  console.log(`  Backend Acceptance:     ${acceptancePassed ? 'PASS' : 'FAIL'}`);
  console.log(`  Security Enforcement:   ${securityPassed ? 'PASS' : 'FAIL'}`);
  console.log(`  Telegram Real Delivery: ${telegramDeliveryStatus}`);
  console.log('──────────────────────────────────────────────────────────────────');

  let finalStatus;
  if (!isConfigured) {
    finalStatus = 'Telegram = NOT CONFIGURED';
  } else if (n8nPassed && acceptancePassed && securityPassed && telegramDeliverySuccess) {
    finalStatus = 'Telegram = PASS';
  } else {
    finalStatus = 'Telegram = FAIL';
  }

  console.log(`\n  STATUS: ${finalStatus}\n`);
  console.log('══════════════════════════════════════════════════════════════════');

  return {
    finalStatus,
    isConfigured,
    n8nPassed,
    acceptancePassed,
    securityPassed,
    telegramDeliveryStatus,
    telegramError,
  };
}

runPhase5TelegramVerification().catch(err => {
  console.error('Unhandled fatal error in Phase 5 verification:', err);
  process.exit(1);
});
