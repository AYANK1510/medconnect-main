/**
 * MedConnect Pulse - Background Telegram Bot Worker
 * Runs 24/7 in Node.js via child process or direct launch.
 * Handles incoming emergency alert callbacks (ACCEPT & SUPPLY / DECLINE)
 * even when no browser tabs are open.
 */

import fs from 'fs';
import path from 'path';

// Automatically load .env environment variables in standalone worker
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { validateAndProcessTelegramCallback, getTelegramCredentials } from '../src/services/telegramService';

const cacheDir = path.resolve(process.cwd(), 'node_modules/.cache/medconnect');
if (!fs.existsSync(cacheDir)) {
  try { fs.mkdirSync(cacheDir, { recursive: true }); } catch {}
}
const STATUS_FILE = path.resolve(cacheDir, 'telegram-status.json');
const EVENTS_FILE = path.resolve(cacheDir, 'telegram-events.json');

// Remove legacy root files if present to prevent any watcher triggering
try {
  const legacyStatus = path.resolve(process.cwd(), '.telegram-status.json');
  if (fs.existsSync(legacyStatus)) fs.unlinkSync(legacyStatus);
  const legacyEvents = path.resolve(process.cwd(), '.telegram-events.json');
  if (fs.existsSync(legacyEvents)) fs.unlinkSync(legacyEvents);
} catch {}

let lastUpdateId = 0;
let isPolling = true;

function writeStatus() {
  try {
    fs.writeFileSync(
      STATUS_FILE,
      JSON.stringify({ running: true, pid: process.pid, lastPoll: Date.now() }),
      'utf-8'
    );
  } catch {}
}

function recordEvent(event: any) {
  try {
    let events: any[] = [];
    if (fs.existsSync(EVENTS_FILE)) {
      events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    }
    events.push(event);
    if (events.length > 50) events.shift();
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events), 'utf-8');
  } catch (err: any) {
    console.error('[Worker] Failed to write event:', err?.message);
  }
}

async function startWorker() {
  console.log('[TelegramWorker] Starting 24/7 Telegram Alert Processing Daemon...');
  writeStatus();

  // Status heartbeat every 10s
  setInterval(writeStatus, 10000);

  while (isPolling) {
    const { token } = getTelegramCredentials();
    if (!token) {
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    try {
      const offsetParam = lastUpdateId ? `?offset=${lastUpdateId + 1}&timeout=0` : `?timeout=0`;
      const url = `https://api.telegram.org/bot${token}/getUpdates${offsetParam}`;
      
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        if (res.status === 409) {
          console.warn(`[TelegramWorker] 409 Conflict: ${errText}. Retrying in 5s...`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }

      const data = (await res.json()) as any;
      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);

          if (update.callback_query) {
            await handleCallbackQuery(token, update.callback_query);
          } else if (update.message && update.message.text) {
            await handleIncomingMessage(token, update.message);
          }
        }
      }
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }

    await new Promise(r => setTimeout(r, 1000));
  }
}

async function handleCallbackQuery(token: string, cb: any) {
  const cbId = cb.id;
  const cbData = cb.data;
  const message = cb.message;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;

  if (!cbData) return;
  console.log(`[TelegramWorker] Processing callback: "${cbData}"`);

  try {
    const result = await validateAndProcessTelegramCallback(cbData);
    const isAccepted = result.status === 'ACCEPTED';
    const isDeclined = result.status === 'DECLINED';

    const parts = cbData.split(':');
    const rawReqId = parts[1] || 'em-unknown';
    const rawHospId = result.reservation?.hospital_id || parts[2] || 'hosp-102';

    recordEvent({
      id: cbId,
      type: isAccepted ? 'ACCEPTED' : (isDeclined ? 'DECLINED' : 'ERROR'),
      requestId: rawReqId,
      hospitalId: rawHospId,
      verificationCode: result.verificationCode,
      message: result.message,
      timestamp: Date.now(),
    });

    // 1. Dismiss button spinner immediately
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: cbId,
        text: isAccepted
          ? `✅ Request accepted! Code: ${result.verificationCode || 'VERIFIED'}`
          : `❌ Request declined.`,
        show_alert: false,
      }),
    });

    // 2. Remove buttons and show clean status banner
    if (chatId && messageId) {
      const baseText = (message.text || '🚨 EMERGENCY SUPPLY DISPATCH ALERT')
        .split('═══════════════════════════')[0]
        .trim();

      let updatedText = '';
      if (isAccepted) {
        updatedText = `${baseText}\n\n` +
          `═══════════════════════════\n` +
          `✅ ACCEPTED & DISPATCHED\n` +
          `📦 Status: Inventory Reserved & In Transit\n` +
          `🔑 Verification Passcode: ${result.verificationCode || 'DSP-VERIFIED'}\n` +
          `⏱ Timestamp: ${new Date().toLocaleTimeString()}\n` +
          `═══════════════════════════`;
      } else if (isDeclined) {
        updatedText = `${baseText}\n\n` +
          `═══════════════════════════\n` +
          `❌ DECLINED BY PROVIDER\n` +
          `⚠️ Status: Request declined by provider\n` +
          `⏱ Timestamp: ${new Date().toLocaleTimeString()}\n` +
          `═══════════════════════════`;
      }

      if (updatedText) {
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: updatedText,
            reply_markup: { inline_keyboard: [] },
          }),
        }).catch(() => {});
      }
    }

    console.log(`[TelegramWorker] ✅ Successfully processed ${result.status} for ${rawReqId}`);
  } catch (err: any) {
    console.error('[TelegramWorker] Callback error:', err.message);

    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: cbId,
        text: `Notice: ${err.message || 'Unable to process request.'}`,
        show_alert: true,
      }),
    }).catch(() => {});
  }
}

async function handleIncomingMessage(token: string, msg: any) {
  const chatId = msg.chat?.id;
  const text = (msg.text || '').trim();

  if (!chatId) return;

  if (text.startsWith('/start') || text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello') {
    const reply = `🏥 *MedConnect Pulse Emergency Dispatch Bot*\n\n` +
      `*Connected Facility:* Metro City General Hospital\n` +
      `*System Status:* Active 🟢\n\n` +
      `This bot receives real-time emergency resource alerts (Blood, Oxygen, ICU beds) within a 15 km network radius.\n\n` +
      `When an emergency alert arrives, tap *[ ACCEPT & SUPPLY ]* to reserve stock and generate a verification QR code.`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        parse_mode: 'Markdown',
      }),
    }).catch(() => {});
  }
}

process.on('SIGINT', () => {
  isPolling = false;
  try { fs.unlinkSync(STATUS_FILE); } catch {}
  process.exit(0);
});

startWorker();
