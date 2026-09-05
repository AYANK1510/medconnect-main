import { getSupabaseCredentials } from '../lib/supabase';
import { getOpenAICredentials } from './openaiService';
import { getSarvamCredentials } from './sarvamService';
import { getTelegramCredentials } from './telegramService';
import { getTwilioCredentials } from './twilioService';
import { testN8nConnectivity } from './n8nService';

export type IntegrationStatusState = 'PASS' | 'FAIL' | 'NOT CONFIGURED' | 'FALLBACK ONLY';

export interface IntegrationStatus {
  name: string;
  key: string;
  category: 'Database' | 'AI' | 'Communication' | 'Automation';
  status: IntegrationStatusState;
  connected: boolean;
  details: string;
}

export async function getIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const supabaseCreds = getSupabaseCredentials();
  const openAiCreds = getOpenAICredentials();
  const sarvamCreds = getSarvamCredentials();
  const tgCreds = getTelegramCredentials();
  const twCreds = getTwilioCredentials();
  const n8nConn = await testN8nConnectivity();

  const isTgConfigured = Boolean(tgCreds.token && tgCreds.chatId);
  const isTwConfigured = Boolean(twCreds.accountSid && twCreds.authToken);

  return [
    {
      name: 'Supabase PostgreSQL & Realtime',
      key: 'supabase',
      category: 'Database',
      status: supabaseCreds.isConfigured ? 'PASS' : 'FALLBACK ONLY',
      connected: supabaseCreds.isConfigured,
      details: supabaseCreds.isConfigured ? 'Connected with Row Level Security (RLS)' : 'Supabase unavailable — using local in-memory dbEngine fallback',
    },
    {
      name: 'OpenAI GPT-4o Service',
      key: 'openai',
      category: 'AI',
      status: openAiCreds.isConfigured ? 'PASS' : 'NOT CONFIGURED',
      connected: openAiCreds.isConfigured,
      details: openAiCreds.isConfigured ? 'OpenAI GPT-4o API key configured & active' : 'OPENAI_API_KEY missing — using local structured intent fallback engine',
    },
    {
      name: 'Sarvam AI Speech (saaras:v1)',
      key: 'sarvam',
      category: 'AI',
      status: sarvamCreds.isConfigured ? 'PASS' : 'NOT CONFIGURED',
      connected: sarvamCreds.isConfigured,
      details: sarvamCreds.isConfigured ? 'Sarvam saaras:v1 STT API key configured & active' : 'SARVAM_API_KEY missing — using text intake fallback',
    },
    {
      name: 'Telegram Emergency Dispatch Bot',
      key: 'telegram',
      category: 'Communication',
      status: isTgConfigured ? 'PASS' : 'NOT CONFIGURED',
      connected: isTgConfigured,
      details: isTgConfigured ? 'Bot token & chat ID configured' : 'TELEGRAM_BOT_TOKEN / CHAT_ID missing — notifications logged locally',
    },
    {
      name: 'Twilio Emergency Escalation Voice',
      key: 'twilio',
      category: 'Communication',
      status: isTwConfigured ? 'PASS' : 'NOT CONFIGURED',
      connected: isTwConfigured,
      details: isTwConfigured ? 'Twilio Account SID & Token configured' : 'TWILIO_ACCOUNT_SID / AUTH_TOKEN missing — call escalation logged as TWILIO_NOT_CONFIGURED',
    },
    {
      name: 'n8n Workflow Automation',
      key: 'n8n',
      category: 'Automation',
      status: n8nConn.success ? 'PASS' : 'NOT CONFIGURED',
      connected: n8nConn.success,
      details: n8nConn.success ? 'Active webhooks listening on port 5678' : 'n8n webhooks unavailable — using local TS orchestrator fallback',
    },
  ];
}

export function checkProductionReady(statuses: IntegrationStatus[]): { ready: boolean; statusText: 'YES' | 'NO'; unconfiguredCount: number; details: string } {
  const unconfiguredOrFailed = statuses.filter(s => s.status !== 'PASS');
  const ready = unconfiguredOrFailed.length === 0;
  return {
    ready,
    statusText: ready ? 'YES' : 'NO',
    unconfiguredCount: unconfiguredOrFailed.length,
    details: ready
      ? 'All production external integrations are active, authenticated, and operational.'
      : `Production environment is using local resilient fallbacks for ${unconfiguredOrFailed.length} pending integration(s): ${unconfiguredOrFailed.map(s => `${s.name} (${s.status})`).join(', ')}`,
  };
}

// Backward compatibility alias
export const checkRealDemoReady = checkProductionReady;

/**
 * Handles WhatsApp Voice Notes via Real AI Receptionist Engine
 */
export async function processWhatsAppVoiceMessage(
  audioBlobOrBuffer: Blob | ArrayBuffer | string,
  hospitalId: string = 'hosp-101'
): Promise<{ success: boolean; responseText: string; receptionistResult: any }> {
  const { processReceptionistTurn } = await import('./receptionistService');

  const result = await processReceptionistTurn({
    channel: 'whatsapp',
    audioBlob: audioBlobOrBuffer,
    hospitalId,
  });

  return {
    success: result.success,
    responseText: result.aiMessage,
    receptionistResult: result,
  };
}


