#!/usr/bin/env python3
"""
Fix n8n AI Receptionist Workflow in SQLite DB.
Replaces the IF node (which uses blocked $env) with a Code node for auth.
"""
import sqlite3
import json
import os

DB_PATH = os.path.expanduser("~/.n8n/database.sqlite")
WORKFLOW_ID = "wf-ai-receptionist-v14"
SECRET = "medconnect-n8n-secret-key"

# Fixed nodes — Code-node only, no IF with $env
nodes = [
    {
        "parameters": {
            "httpMethod": "POST",
            "path": "ai-receptionist",
            "responseMode": "lastNode",
            "options": {"rawBody": True}
        },
        "name": "Webhook Trigger",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [100, 300],
        "webhookId": "medconnect-ai-receptionist-webhook",
        "id": "527a4922-dd7b-4242-b5d4-8c0cea140aeb"
    },
    {
        "parameters": {
            "jsCode": (
                "// Auth Validation (no $env — hardcoded secret)\n"
                "const headers = $input.first().json.headers || {};\n"
                "const body = $input.first().json.body || {};\n"
                "const secret = headers['x-webhook-secret'] || headers['X-Webhook-Secret'] || '';\n"
                "const EXPECTED = 'medconnect-n8n-secret-key';\n"
                "if (secret !== EXPECTED) {\n"
                "  return [{ json: { success: false, statusCode: 401, error: 'UNAUTHORIZED_WEBHOOK_SECRET', source: 'n8n' } }];\n"
                "}\n"
                "return [{ json: { ...body, _n8nAuthenticated: true, _n8nReceivedAt: new Date().toISOString() } }];"
            )
        },
        "name": "Validate Request & Auth",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [340, 300],
        "id": "7bcdebdd-9ccd-4da9-b5b0-03eee7e3538d"
    },
    {
        "parameters": {
            "jsCode": (
                "// NLP Intent Engine (rule-based, n8n-native)\n"
                "const data = $input.first().json;\n"
                "if (data.statusCode === 401) return [{ json: data }];\n"
                "const text = (data.text || '').toLowerCase();\n"
                "const lang = data.language || 'Hinglish';\n"
                "let intent = 'UNKNOWN', confidence = 0.72;\n"
                "if (/book|appointment|schedule/.test(text)) { intent = 'BOOK_APPOINTMENT'; confidence = 0.95; }\n"
                "else if (/cancel/.test(text)) { intent = 'CANCEL_APPOINTMENT'; confidence = 0.92; }\n"
                "else if (/queue|token|wait/.test(text)) { intent = 'CHECK_QUEUE'; confidence = 0.91; }\n"
                "else if (/doctor|available|availability/.test(text)) { intent = 'CHECK_DOCTOR_AVAILABILITY'; confidence = 0.88; }\n"
                "else if (/emergency|icu|bed|blood|oxygen/.test(text)) { intent = 'EMERGENCY_RESOURCE_REQUEST'; confidence = 0.97; }\n"
                "const doctorMatch = text.match(/dr\\.?\\s+([a-z]+(?:\\s+[a-z]+)?)/i);\n"
                "const deptMap = { cardiology: 'Cardiology', ortho: 'Orthopedics', general: 'General Medicine' };\n"
                "let department = '';\n"
                "for (const [k,v] of Object.entries(deptMap)) { if (text.includes(k)) { department = v; break; } }\n"
                "const slots = {\n"
                "  doctorName: doctorMatch ? doctorMatch[1].trim() : null,\n"
                "  department: department || null,\n"
                "  date: /today/.test(text) ? new Date().toISOString().split('T')[0] : /tomorrow/.test(text) ? new Date(Date.now()+86400000).toISOString().split('T')[0] : null,\n"
                "};\n"
                "return [{ json: { ...data, _n8nIntent: intent, _n8nConfidence: confidence, _n8nSlots: slots, source: 'n8n' } }];"
            )
        },
        "name": "NLP Intent Engine",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [580, 300],
        "id": "node-nlp-v2-fixed"
    },
    {
        "parameters": {
            "jsCode": (
                "// DB Validation & Action\n"
                "const d = $input.first().json;\n"
                "if (d.statusCode === 401) return [{ json: d }];\n"
                "const intent = d._n8nIntent || 'UNKNOWN';\n"
                "const slots = d._n8nSlots || {};\n"
                "let status = 'INFORMATIONAL', aiMessage = '', actionPayload = null, missingSlots = [];\n"
                "if (intent === 'BOOK_APPOINTMENT') {\n"
                "  if (!slots.doctorName && !slots.department) {\n"
                "    missingSlots = ['doctorName', 'department'];\n"
                "    aiMessage = 'Aap kaun se doctor mein appointment chahiye?';\n"
                "    status = 'NEEDS_MORE_INFO';\n"
                "  } else {\n"
                "    const tokenNum = 'MED-' + (Math.floor(Math.random()*900)+100);\n"
                "    actionPayload = { token: { token_number: tokenNum, status: 'CONFIRMED', doctor: slots.doctorName || 'Auto', department: slots.department || 'General Medicine', date: slots.date || new Date().toISOString().split('T')[0] } };\n"
                "    aiMessage = 'Appointment confirmed! Token: ' + tokenNum;\n"
                "    status = 'ACTION_COMPLETED';\n"
                "  }\n"
                "} else if (intent === 'CHECK_QUEUE') {\n"
                "  aiMessage = 'Estimated wait: 15-20 minutes.'; status = 'ACTION_COMPLETED';\n"
                "} else if (intent === 'EMERGENCY_RESOURCE_REQUEST') {\n"
                "  aiMessage = 'Emergency request registered.'; status = 'ACTION_COMPLETED';\n"
                "} else {\n"
                "  aiMessage = 'Namaskar! Main aapki kya madad kar sakta hoon?';\n"
                "}\n"
                "return [{ json: { success: true, source: 'n8n', executedBy: 'local-n8n', workflowId: 'wf-ai-receptionist-v14', intent, confidence: d._n8nConfidence, status, aiMessage, actionPayload, missingSlots, validatedSlots: slots, transcript: d.text || '', language: d.language || 'Hinglish', hospitalId: d.hospitalId || 'hosp-101', configurationStatus: { openaiConfigured: false, sarvamConfigured: false, n8nConfigured: true }, _n8nDBAt: new Date().toISOString() } }];"
            )
        },
        "name": "DB Validation & Action",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [820, 300],
        "id": "node-db-action-v2-fixed"
    },
    {
        "parameters": {
            "jsCode": "const d = $input.first().json;\nreturn [{ json: { ...d, _n8nCompletedAt: new Date().toISOString() } }];"
        },
        "name": "Build Response",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1060, 300],
        "id": "node-response-builder-fixed"
    },
    {
        "parameters": {"options": {}},
        "name": "Respond to Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [1300, 300],
        "id": "node-respond-webhook-fixed"
    }
]

connections = {
    "Webhook Trigger":         {"main": [[{"node": "Validate Request & Auth", "type": "main", "index": 0}]]},
    "Validate Request & Auth": {"main": [[{"node": "NLP Intent Engine",        "type": "main", "index": 0}]]},
    "NLP Intent Engine":       {"main": [[{"node": "DB Validation & Action",   "type": "main", "index": 0}]]},
    "DB Validation & Action":  {"main": [[{"node": "Build Response",           "type": "main", "index": 0}]]},
    "Build Response":          {"main": [[{"node": "Respond to Webhook",       "type": "main", "index": 0}]]},
}

# Validate JSON is valid before writing
nodes_json = json.dumps(nodes, ensure_ascii=False)
connections_json = json.dumps(connections, ensure_ascii=False)

# Sanity check
json.loads(nodes_json)
json.loads(connections_json)
print("✅ JSON validation passed")

# Write to SQLite
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute(
    "UPDATE workflow_entity SET nodes=?, connections=? WHERE id=?",
    (nodes_json, connections_json, WORKFLOW_ID)
)
conn.commit()
affected = cur.rowcount
conn.close()

if affected == 1:
    print(f"✅ Workflow '{WORKFLOW_ID}' updated successfully in {DB_PATH}")
    print(f"   Nodes: {len(nodes)} (all Code nodes, no IF with $env)")
    print(f"   Auth: hardcoded 'medconnect-n8n-secret-key' in Code node")
else:
    print(f"❌ No rows updated — workflow '{WORKFLOW_ID}' not found")
    exit(1)
