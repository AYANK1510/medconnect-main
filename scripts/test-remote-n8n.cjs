#!/usr/bin/env node
/**
 * TEST REMOTE N8N INTEGRATION
 * Tests live webhooks on the remote n8n Cloud instance:
 * 1. POST /webhook/medconnect-test
 * 2. POST /webhook/ai-receptionist
 * 3. POST /webhook/emergency-dispatch
 * 4. Unauthorized secret rejection (HTTP 401)
 */

const https = require('https');

const N8N_BASE = process.env.VITE_N8N_BASE_URL || 'https://ayankkkk.app.n8n.cloud';
const N8N_WEBHOOK_URL = process.env.VITE_N8N_WEBHOOK_URL || `${N8N_BASE}/webhook`;
const SECRET = process.env.VITE_N8N_WEBHOOK_SECRET || 'medconnect-n8n-secret-key';

function post(endpoint, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers,
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log('='.repeat(60));
  console.log(`🌐 Testing Remote n8n Cloud Integration`);
  console.log(`URL: ${N8N_WEBHOOK_URL}`);
  console.log('='.repeat(60));

  let passed = 0;
  let total = 4;

  // 1. Connectivity Ping
  try {
    const res = await post(`${N8N_WEBHOOK_URL}/medconnect-test`, { 'x-webhook-secret': SECRET }, { test: true });
    if (res.status === 200 && res.body.success) {
      console.log('✅ TEST 1 PASSED: Ping Webhook (/medconnect-test) responded 200 OK');
      passed++;
    } else {
      console.log('❌ TEST 1 FAILED:', res);
    }
  } catch (e) {
    console.log('❌ TEST 1 ERROR:', e.message);
  }

  // 2. AI Receptionist
  try {
    const res = await post(`${N8N_WEBHOOK_URL}/ai-receptionist`, { 'x-webhook-secret': SECRET }, {
      text: 'Book appointment with Dr. Sharma for Cardiology today at 11am',
      language: 'Hinglish',
      hospitalId: 'hosp-101',
    });
    if (res.status === 200 && res.body.success && res.body.intent === 'BOOK_APPOINTMENT') {
      console.log(`✅ TEST 2 PASSED: AI Receptionist (/ai-receptionist) confirmed appointment [Token: ${res.body.actionPayload?.token?.token_number}]`);
      passed++;
    } else {
      console.log('❌ TEST 2 FAILED:', res);
    }
  } catch (e) {
    console.log('❌ TEST 2 ERROR:', e.message);
  }

  // 3. Emergency Dispatch
  try {
    const res = await post(`${N8N_WEBHOOK_URL}/emergency-dispatch`, { 'x-webhook-secret': SECRET }, {
      requesting_hospital_id: 'hosp-101',
      resource_type: 'OXYGEN',
      quantity: 5,
      urgency: 'CRITICAL',
    });
    if (res.status === 200 && res.body.success && res.body.data?.matches) {
      console.log(`✅ TEST 3 PASSED: Emergency Dispatch (/emergency-dispatch) triggered 15km geo-matching [Request ID: ${res.body.data.requestId}]`);
      passed++;
    } else {
      console.log('❌ TEST 3 FAILED:', res);
    }
  } catch (e) {
    console.log('❌ TEST 3 ERROR:', e.message);
  }

  // 4. Unauthorized Secret Rejection
  try {
    const res = await post(`${N8N_WEBHOOK_URL}/ai-receptionist`, { 'x-webhook-secret': 'wrong-secret' }, { text: 'Hello' });
    if (res.status === 401 || (res.body && res.body.statusCode === 401)) {
      console.log('✅ TEST 4 PASSED: Unauthorized request properly rejected with HTTP 401');
      passed++;
    } else {
      console.log('❌ TEST 4 FAILED: Expected 401, got:', res);
    }
  } catch (e) {
    console.log('❌ TEST 4 ERROR:', e.message);
  }

  console.log('='.repeat(60));
  console.log(`Summary: ${passed}/${total} Tests Passed`);
  console.log('='.repeat(60));

  process.exit(passed === total ? 0 : 1);
}

run();
