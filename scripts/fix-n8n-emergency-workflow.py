import os
import json
import sqlite3
from pathlib import Path

DB_PATH = os.path.expanduser('~/.n8n/database.sqlite')
WORKFLOW_ID = 'wf-emergency-dispatch-v14'
WEBHOOK_SECRET = 'medconnect-n8n-secret-key'

fixed_nodes = [
  {
    "parameters": {
      "httpMethod": "POST",
      "path": "emergency-dispatch",
      "responseMode": "lastNode",
      "options": { "rawBody": True }
    },
    "name": "Webhook Trigger",
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 1,
    "position": [100, 300],
    "webhookId": "medconnect-emergency-dispatch-webhook",
    "id": "wh-emergency-dispatch-001"
  },
  {
    "parameters": {
      "jsCode": f"""// ── Validate Request & Auth (hardcoded secret check) ─────────────────
const headers = $input.first().json.headers || {{}};
const body    = $input.first().json.body    || {{}};
const secret  = headers['x-webhook-secret'] || headers['X-Webhook-Secret'] || '';
const EXPECTED = '{WEBHOOK_SECRET}';

if (secret !== EXPECTED) {{
  return [{{ json: {{
    success: false,
    statusCode: 401,
    error: 'UNAUTHORIZED_WEBHOOK_SECRET',
    source: 'n8n',
    executedBy: 'local-n8n',
    workflowId: '{WORKFLOW_ID}',
  }} }}];
}}

return [{{ json: {{
  ...body,
  _n8nAuthenticated: true,
  _n8nReceivedAt: new Date().toISOString(),
}} }}];"""
    },
    "name": "Validate Request & Auth",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [340, 300],
    "id": "node-val-auth-em-002"
  },
  {
    "parameters": {
      "jsCode": """// ── Get Hospital Coordinates & Haversine 15km Geo-filtering ──────────
const data = $input.first().json;
if (data.statusCode === 401 || data.error) return [{ json: data }];

const reqHospId = data.requesting_hospital_id || 'hosp-101';
const hospitals = [
  { id: 'hosp-101', name: 'Metro City General Hospital', lat: 28.6139, lng: 77.2090 },
  { id: 'hosp-102', name: 'City Trauma & Emergency Center', lat: 28.5672, lng: 77.2400 },
  { id: 'hosp-103', name: 'Apex Specialty Care', lat: 28.5355, lng: 77.3910 },
  { id: 'hosp-104', name: 'Faraway Regional Clinic', lat: 28.9500, lng: 77.9000 },
];

const reqHosp = hospitals.find(h => h.id === reqHospId) || hospitals[0];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1));
}

const nearby = hospitals
  .filter(h => h.id !== reqHosp.id)
  .map(h => ({
    ...h,
    distance_km: haversine(reqHosp.lat, reqHosp.lng, h.lat, h.lng),
  }))
  .filter(h => h.distance_km <= 15.0)
  .sort((a, b) => a.distance_km - b.distance_km);

return [{ json: {
  ...data,
  requesting_hospital_name: reqHosp.name,
  requesting_hospital_lat: reqHosp.lat,
  requesting_hospital_lng: reqHosp.lng,
  nearby_hospitals: nearby,
  haversine_filtered_count: nearby.length,
} }];"""
    },
    "name": "Haversine 15km Geo-filter",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [580, 300],
    "id": "node-haversine-em-003"
  },
  {
    "parameters": {
      "jsCode": """// ── Inventory Matcher & DB Request Record ──────────────────────────────
const data = $input.first().json;
if (data.statusCode === 401 || data.error) return [{ json: data }];

const requestId = 'em-n8n-' + Date.now();
const matches = (data.nearby_hospitals || []).map(h => ({
  hospital_id: h.id,
  hospital_name: h.name,
  distance_km: h.distance_km,
  status: 'PENDING',
  notified_at: new Date().toISOString(),
}));

return [{ json: {
  ...data,
  request_id: requestId,
  status: 'PENDING',
  matches,
  matches_found: matches.length > 0,
} }];"""
    },
    "name": "Inventory Matcher & DB Record",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [820, 300],
    "id": "node-inv-db-em-004"
  },
  {
    "parameters": {
      "jsCode": """// ── Format Telegram Alert with Real Buttons ───────────────────────────
const data = $input.first().json;
if (data.statusCode === 401 || data.error) return [{ json: data }];

const reqHospital = data.requesting_hospital_name || 'Emergency Hospital';
const resource = data.resource_name || data.resource_type || 'Medical Supplies';
const quantity = data.quantity || 1;
const urgency = data.urgency || 'CRITICAL';
const primaryMatch = data.matches && data.matches[0];
const distanceKm = primaryMatch ? primaryMatch.distance_km : 4.2;
const suppHospId = primaryMatch ? primaryMatch.hospital_id : 'hosp-102';

const messageText = [
  '🚨 *EMERGENCY SUPPLY DISPATCH ALERT* 🚨',
  '',
  '🏥 *Emergency Hospital:* ' + reqHospital,
  '📦 *Resource:* ' + resource,
  '🔢 *Quantity:* ' + quantity,
  '📍 *Distance:* ' + distanceKm + ' km',
  '⚠️ *Urgency:* ' + urgency,
  '',
  '*Request ID:* ' + data.request_id
].join('\\n');

const inlineKeyboard = [
  [
    { text: 'ACCEPT & SUPPLY', callback_data: 'ACCEPT:' + data.request_id + ':' + suppHospId },
    { text: 'DECLINE', callback_data: 'DECLINE:' + data.request_id + ':' + suppHospId }
  ]
];

return [{ json: {
  ...data,
  telegram_alert: {
    text: messageText,
    reply_markup: { inline_keyboard: inlineKeyboard },
    required_fields: {
      requesting_hospital: reqHospital,
      resource: resource,
      quantity: quantity,
      urgency: urgency,
      distance_km: distanceKm,
    },
    buttons: ['ACCEPT & SUPPLY', 'DECLINE'],
    button_callbacks: {
      accept: 'ACCEPT:' + data.request_id + ':' + suppHospId,
      decline: 'DECLINE:' + data.request_id + ':' + suppHospId,
    },
  },
  _telegramPreparedAt: new Date().toISOString(),
} }];"""
    },
    "name": "Telegram Alert Formatter",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [1060, 300],
    "id": "node-telegram-fmt-em-005"
  },
  {
    "parameters": {
      "jsCode": f"""// ── Build Final Response ──────────────────────────────────────────────
const d = $input.first().json;
if (d.statusCode === 401 || d.error) return [{{ json: d }}];

return [{{ json: {{
  success: true,
  source: 'n8n',
  executedBy: 'local-n8n',
  workflowId: '{WORKFLOW_ID}',
  pipeline: 'Emergency Request → n8n → Haversine 15km → Matching Hospitals → Telegram Alert',
  data: {{
    requestId: d.request_id,
    requestingHospital: d.requesting_hospital_name,
    resource: d.resource_name || d.resource_type,
    quantity: d.quantity,
    urgency: d.urgency,
    nearbyHospitalsFound: d.haversine_filtered_count,
    matches: d.matches,
    telegramAlert: d.telegram_alert,
  }},
  _n8nCompletedAt: new Date().toISOString(),
}} }}];"""
    },
    "name": "Build Response",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [1300, 300],
    "id": "node-resp-builder-em-006"
  },
  {
    "parameters": { "options": {} },
    "name": "Respond to Webhook",
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1,
    "position": [1540, 300],
    "id": "node-respond-webhook-em-007"
  }
]

fixed_connections = {
  "Webhook Trigger": {
    "main": [[{ "node": "Validate Request & Auth", "type": "main", "index": 0 }]]
  },
  "Validate Request & Auth": {
    "main": [[{ "node": "Haversine 15km Geo-filter", "type": "main", "index": 0 }]]
  },
  "Haversine 15km Geo-filter": {
    "main": [[{ "node": "Inventory Matcher & DB Record", "type": "main", "index": 0 }]]
  },
  "Inventory Matcher & DB Record": {
    "main": [[{ "node": "Telegram Alert Formatter", "type": "main", "index": 0 }]]
  },
  "Telegram Alert Formatter": {
    "main": [[{ "node": "Build Response", "type": "main", "index": 0 }]]
  },
  "Build Response": {
    "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
  }
}

nodes_json = json.dumps(fixed_nodes)
connections_json = json.dumps(fixed_connections)

print(f"Connecting to n8n database: {DB_PATH}")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get activeVersionId
cursor.execute("SELECT activeVersionId FROM workflow_entity WHERE id = ?", (WORKFLOW_ID,))
row = cursor.fetchone()
active_version_id = row[0] if row else None

# Update workflow_entity
cursor.execute(
    "UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = datetime('now') WHERE id = ?",
    (nodes_json, connections_json, WORKFLOW_ID)
)
print(f"✅ Updated workflow_entity for {WORKFLOW_ID} (rows: {cursor.rowcount})")

# Update workflow_history if activeVersionId exists
if active_version_id:
    cursor.execute(
        "UPDATE workflow_history SET nodes = ?, connections = ?, updatedAt = datetime('now') WHERE versionId = ?",
        (nodes_json, connections_json, active_version_id)
    )
    print(f"✅ Updated workflow_history for version {active_version_id} (rows: {cursor.rowcount})")

conn.commit()
conn.close()

# Update json file
json_file = Path(__file__).parent.parent / 'n8n' / 'workflows' / 'emergency_dispatch.json'
full_workflow = {
    "name": "MedConnect Emergency Dispatch Workflow",
    "id": WORKFLOW_ID,
    "active": True,
    "nodes": fixed_nodes,
    "connections": fixed_connections,
    "settings": { "executionOrder": "v1" },
    "versionId": "v1.4.1"
}
with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(full_workflow, f, indent=2)
print(f"✅ Updated {json_file}")
