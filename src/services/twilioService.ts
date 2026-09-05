import { dbEngine } from '../lib/dbEngine';

export interface TwilioVoiceCallPayload {
  requestId?: string;
  reqNumber?: string;
  requestingHospitalName?: string;
  resourceType?: string;
  quantity?: number;
  bloodGroup?: string;
}

export interface TwilioCallRecord {
  id: string;
  requestId: string;
  callSid?: string;
  status: string; // 'TWILIO_NOT_CONFIGURED' | 'INITIATED' | 'QUEUED' | 'FAILED' | 'COMPLETED'
  timestamp: string;
  failureReason?: string;
  toPhone?: string;
  fromPhone?: string;
  success: boolean;
}

export function getTwilioCredentials(): { accountSid: string; authToken: string; fromPhone: string; toPhone: string } {
  let accountSid = '';
  let authToken = '';
  let fromPhone = '';
  let toPhone = '';
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedSid = window.localStorage.getItem('MEDCONNECT_TWILIO_ACCOUNT_SID');
    const storedAuth = window.localStorage.getItem('MEDCONNECT_TWILIO_AUTH_TOKEN');
    const storedFrom = window.localStorage.getItem('MEDCONNECT_TWILIO_FROM_PHONE');
    const storedTo = window.localStorage.getItem('MEDCONNECT_TWILIO_TO_PHONE');
    if (storedSid && storedSid.trim()) accountSid = storedSid.trim();
    if (storedAuth && storedAuth.trim()) authToken = storedAuth.trim();
    if (storedFrom && storedFrom.trim()) fromPhone = storedFrom.trim();
    if (storedTo && storedTo.trim()) toPhone = storedTo.trim();
  }
  if (!accountSid && typeof process !== 'undefined' && process.env) {
    accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  }
  if (!authToken && typeof process !== 'undefined' && process.env) {
    authToken = process.env.TWILIO_AUTH_TOKEN || '';
  }
  if (!fromPhone && typeof process !== 'undefined' && process.env) {
    fromPhone = process.env.TWILIO_FROM_PHONE || '+18005550199';
  }
  if (!toPhone && typeof process !== 'undefined' && process.env) {
    toPhone = process.env.TWILIO_TO_PHONE || '+91999900000';
  }
  if (!accountSid && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    accountSid = (import.meta as any).env.VITE_TWILIO_ACCOUNT_SID || (import.meta as any).env.TWILIO_ACCOUNT_SID || '';
  }
  if (!authToken && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    authToken = (import.meta as any).env.VITE_TWILIO_AUTH_TOKEN || (import.meta as any).env.TWILIO_AUTH_TOKEN || '';
  }
  return {
    accountSid: accountSid.trim(),
    authToken: authToken.trim(),
    fromPhone: (fromPhone || '+18005550199').trim(),
    toPhone: (toPhone || '+91999900000').trim(),
  };
}

export function verifyTwilioWebhookSignature(signature?: string, expectedSecret?: string): boolean {
  if (!signature) return false;
  const { authToken } = getTwilioCredentials();
  const secretToUse = expectedSecret || authToken || 'medconnect-twilio-secret';
  return Boolean(signature && signature.trim() === secretToUse.trim());
}

export async function initiateTwilioVoiceCall(payload: TwilioVoiceCallPayload): Promise<TwilioCallRecord> {
  const { accountSid, authToken, fromPhone, toPhone } = getTwilioCredentials();
  const timestamp = new Date().toISOString();
  const reqId = payload.requestId || payload.reqNumber || 'em-unknown';

  if (!accountSid || !authToken) {
    console.error('TWILIO_NOT_CONFIGURED: Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
    const record: TwilioCallRecord = {
      id: `tw-rec-${Date.now()}`,
      requestId: reqId,
      status: 'TWILIO_NOT_CONFIGURED',
      timestamp,
      failureReason: 'TWILIO_NOT_CONFIGURED',
      success: false,
    };

    dbEngine.logActivity(null, null, 'TWILIO_ESCALATION_ATTEMPT', 'emergency_requests', reqId, {
      status: 'TWILIO_NOT_CONFIGURED',
      failure_reason: 'TWILIO_NOT_CONFIGURED',
      timestamp,
    });

    return record;
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const authHeader = 'Basic ' + (typeof Buffer !== 'undefined'
      ? Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      : btoa(`${accountSid}:${authToken}`));

    const params = new URLSearchParams();
    params.append('To', toPhone);
    params.append('From', fromPhone);
    params.append('Twiml', `<Response><Say voice="alice">Emergency Alert Escalation. Requesting hospital ${payload.requestingHospitalName || 'Hospital'} requires urgent ${payload.quantity || ''} ${payload.resourceType || 'resources'}. Please respond immediately.</Say></Response>`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (response.ok && data.sid) {
      const record: TwilioCallRecord = {
        id: `tw-rec-${Date.now()}`,
        requestId: reqId,
        callSid: data.sid,
        status: data.status || 'INITIATED',
        timestamp,
        toPhone,
        fromPhone,
        success: true,
      };

      dbEngine.logActivity(null, null, 'TWILIO_ESCALATION_CALL', 'emergency_requests', reqId, {
        call_sid: data.sid,
        status: data.status,
        timestamp,
        to_phone: toPhone,
      });

      return record;
    } else {
      const failReason = data.message || data.error_message || 'Twilio API call failed';
      const record: TwilioCallRecord = {
        id: `tw-rec-${Date.now()}`,
        requestId: reqId,
        status: 'FAILED',
        timestamp,
        failureReason: failReason,
        success: false,
      };

      dbEngine.logActivity(null, null, 'TWILIO_ESCALATION_FAILED', 'emergency_requests', reqId, {
        status: 'FAILED',
        failure_reason: failReason,
        timestamp,
      });

      return record;
    }
  } catch (err: any) {
    const record: TwilioCallRecord = {
      id: `tw-rec-${Date.now()}`,
      requestId: reqId,
      status: 'FAILED',
      timestamp,
      failureReason: err.message,
      success: false,
    };

    dbEngine.logActivity(null, null, 'TWILIO_ESCALATION_FAILED', 'emergency_requests', reqId, {
      status: 'FAILED',
      failure_reason: err.message,
      timestamp,
    });

    return record;
  }
}

/**
 * Backend process to validate 3-minute emergency deadlines
 * 1. Finds unaccepted PENDING requests whose expires_at deadline has passed
 * 2. Marks matches as EXPIRED and request status as ESCALATED
 * 3. Triggers server-side Twilio voice escalation
 * 4. Records activity logs & sends notifications
 */
export async function processEmergencyTimeouts(checkTime: Date = new Date()): Promise<{
  processedCount: number;
  escalatedRequestIds: string[];
  callRecords: TwilioCallRecord[];
}> {
  const requests = dbEngine.getEmergencyRequests();
  const escalatedRequestIds: string[] = [];
  const callRecords: TwilioCallRecord[] = [];

  for (const req of requests) {
    if (req.status === 'PENDING' && req.expires_at) {
      const expiresDate = new Date(req.expires_at);
      if (checkTime >= expiresDate) {
        req.status = 'ESCALATED';
        req.updated_at = checkTime.toISOString();

        const matches = dbEngine.getEmergencyMatches();
        matches.forEach(m => {
          if (m.request_id === req.id && m.status === 'PENDING') {
            m.status = 'EXPIRED';
          }
        });

        const hosp = dbEngine.getHospitals().find(h => h.id === req.requesting_hospital_id);
        const hospName = hosp?.name || 'Emergency Hospital';

        const callRecord = await initiateTwilioVoiceCall({
          requestId: req.id,
          reqNumber: req.request_number || req.id,
          requestingHospitalName: hospName,
          resourceType: req.resource_name || req.resource_type,
          quantity: req.quantity,
        });

        callRecords.push(callRecord);
        escalatedRequestIds.push(req.id);

        dbEngine.createNotification({
          hospital_id: req.requesting_hospital_id,
          title: '3-Min Response Timeout: Escalated to Twilio Voice',
          message: `No hospital accepted emergency request within 3 minutes. Escalated to Regional Medical Coordinator via Twilio Voice (Status: ${callRecord.status}).`,
          type: 'EMERGENCY_ESCALATED',
        });
      }
    }
  }

  dbEngine.saveToStorage();
  dbEngine.notifyListeners();

  return {
    processedCount: escalatedRequestIds.length,
    escalatedRequestIds,
    callRecords,
  };
}
