/**
 * PHASE 4 — Real Local n8n Integration Service
 * Sends requests to the actual local n8n instance instead of the local JS simulation.
 * 
 * Architecture: Application → Backend → Local n8n → AI Workflow → Backend → Application
 * 
 * Webhook paths registered in n8n (verified from webhook_entity table):
 *   - medconnect-test       → wf-medconnect-test           (connectivity ping)
 *   - ai-receptionist       → wf-ai-receptionist-v14        (AI receptionist)
 *   - emergency-dispatch    → wf-emergency-dispatch-v14     (emergency)
 * 
 * Rules:
 *   - This service REQUIRES n8n to be running at localhost:5678
 *   - It does NOT fall back to the local AI engine — if n8n is unavailable, it throws
 *   - The fallback (processReceptionistTurn) is only used in DEV_FALLBACK mode
 *   - All requests are authenticated with x-webhook-secret header
 */

export function getN8nBaseUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const custom = window.localStorage.getItem('MEDCONNECT_N8N_BASE_URL');
    if (custom) return custom.replace(/\/$/, '');
  }
  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_N8N_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.N8N_BASE_URL) ||
    'http://localhost:5678';
  return envUrl.replace(/\/$/, '');
}

export function getN8nWebhookUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const custom = window.localStorage.getItem('MEDCONNECT_N8N_WEBHOOK_URL');
    if (custom) return custom.replace(/\/$/, '');
  }
  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_N8N_WEBHOOK_URL) ||
    (typeof process !== 'undefined' && process.env?.N8N_WEBHOOK_URL) ||
    `${getN8nBaseUrl()}/webhook`;
  return envUrl.replace(/\/$/, '');
}

export function getN8nWebhookSecret(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const custom = window.localStorage.getItem('MEDCONNECT_N8N_WEBHOOK_SECRET');
    if (custom) return custom;
  }
  return (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_N8N_WEBHOOK_SECRET) ||
    (typeof process !== 'undefined' && process.env?.N8N_WEBHOOK_SECRET) ||
    'medconnect-n8n-secret-key'
  );
}

export function getN8nWebhookPaths() {
  const base = getN8nWebhookUrl();
  return {
    test: `${base}/medconnect-test`,
    aiReceptionist: `${base}/ai-receptionist`,
    emergencyDispatch: `${base}/emergency-dispatch`,
  };
}

export const N8N_WEBHOOK_PATHS = {
  get test() { return `${getN8nWebhookUrl()}/medconnect-test`; },
  get aiReceptionist() { return `${getN8nWebhookUrl()}/ai-receptionist`; },
  get emergencyDispatch() { return `${getN8nWebhookUrl()}/emergency-dispatch`; },
};


export interface N8nRealCallResult {
  success: boolean;
  source: string;
  executedBy: 'local-n8n';
  workflowId: string;
  intent?: string;
  confidence?: number;
  status?: string;
  aiMessage?: string;
  actionPayload?: any;
  missingSlots?: string[];
  validatedSlots?: Record<string, any>;
  transcript?: string;
  language?: string;
  hospitalId?: string;
  context?: Record<string, any>;
  configurationStatus?: {
    openaiConfigured: boolean;
    sarvamConfigured: boolean;
    n8nConfigured: boolean;
  };
  statusCode?: number;
  error?: string;
  _n8nCompletedAt?: string;
  _n8nReceivedAt?: string;
}

export interface N8nHealthResult {
  healthy: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Check if local n8n is alive.
 */
export async function checkN8nHealth(): Promise<N8nHealthResult> {
  const baseUrl = getN8nBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/healthz`, { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      return { healthy: true };
    }
    return { healthy: false, statusCode: res.status, error: `n8n health check returned: ${JSON.stringify(data)}` };
  } catch (err: any) {
    return { healthy: false, error: `Cannot reach n8n at ${baseUrl}: ${err.message}` };
  }
}

/**
 * Send a real HTTP POST to the n8n AI receptionist webhook.
 * This is the actual production integration path.
 * 
 * @throws Error if n8n is unavailable (no fallback — fails explicitly)
 */
export async function callN8nAiReceptionist(payload: {
  channel?: string;
  text?: string;
  language?: string;
  hospitalId?: string;
  context?: Record<string, any>;
}): Promise<N8nRealCallResult> {
  const response = await fetch(N8N_WEBHOOK_PATHS.aiReceptionist, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': getN8nWebhookSecret(),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000), // 15s timeout
  });

  if (!response.ok) {
    let errorBody: any = {};
    try { errorBody = await response.json(); } catch { /* ignore */ }
    throw new Error(
      `n8n webhook returned HTTP ${response.status}: ${errorBody.message || errorBody.error || response.statusText}. ` +
      `Ensure the ai-receptionist workflow is active in n8n.`
    );
  }

  const data: N8nRealCallResult = await response.json();

  // Validate the response came from n8n
  if (data.source !== 'n8n' && !data.executedBy?.includes('n8n')) {
    throw new Error(
      `n8n returned unexpected source="${data.source}" executedBy="${data.executedBy}". ` +
      `Expected response from n8n. Response: ${JSON.stringify(data)}`
    );
  }

  return data;
}

/**
 * Test connectivity to the n8n medconnect-test webhook.
 * Returns { success: true, source: 'n8n' } if the pipeline works.
 */
export async function callN8nConnectivityTest(): Promise<{ success: boolean; source?: string; error?: string }> {
  try {
    const response = await fetch(N8N_WEBHOOK_PATHS.test, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': getN8nWebhookSecret(),
      },
      body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return { success: true, source: data.source };
    }
    return { success: false, error: `HTTP ${response.status}: ${JSON.stringify(data)}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send a real HTTP POST to the n8n Emergency Dispatch webhook.
 * Triggers the 15km Haversine Geo-filtering and Telegram alert workflow in local or remote n8n.
 */
export async function callN8nEmergencyDispatch(payload: {
  requesting_hospital_id: string;
  resource_type: string;
  resource_name?: string;
  quantity: number;
  urgency: string;
  notes?: string;
}): Promise<any> {
  const response = await fetch(N8N_WEBHOOK_PATHS.emergencyDispatch, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': getN8nWebhookSecret(),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    let errorBody: any = {};
    try { errorBody = await response.json(); } catch { /* ignore */ }
    throw new Error(
      `n8n emergency webhook returned HTTP ${response.status}: ${errorBody.message || errorBody.error || response.statusText}. ` +
      `Ensure the emergency-dispatch workflow is active in n8n.`
    );
  }

  return response.json();
}
