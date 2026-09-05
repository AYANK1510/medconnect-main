/**
 * MedConnect Pulse - Real-time Telegram Bot Polling & Callback Processor
 * Listens for incoming callback queries (such as [ ACCEPT & SUPPLY ] and [ DECLINE ])
 * and user text messages, processes them through dbEngine, and provides instant feedback.
 * 
 * Auto-detects if the Vite dev server is running the background listener:
 * - If server listener is active: syncs events via /api/telegram/events (zero 409 conflicts).
 * - If server listener is offline: falls back to browser-side direct Telegram API polling.
 */

import { getTelegramCredentials, validateAndProcessTelegramCallback } from './telegramService';

let isPolling = false;
let stopRequested = false;
let lastUpdateId = 0;
let lastEventTimestamp = Date.now();

export function startTelegramBotListener(): () => void {
  if (isPolling) return () => { stopRequested = true; };
  isPolling = true;
  stopRequested = false;

  const init = async () => {
    // 1. Check if server-side polling is already active
    try {
      const statusRes = await fetch('/api/telegram/status').catch(() => null);
      if (statusRes && statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.running) {
          console.log('[TelegramBotListener] Vite server-side bot worker active. Using event sync mode.');
          syncServerEvents();
          return;
        }
      }
    } catch {
      // Server check failed, fallback to client-side polling
    }

    // 2. Client-side polling fallback
    pollClientSide();
  };

  const syncServerEvents = async () => {
    while (!stopRequested) {
      try {
        const res = await fetch(`/api/telegram/events?since=${lastEventTimestamp}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.events) && data.events.length > 0) {
            for (const ev of data.events) {
              lastEventTimestamp = Math.max(lastEventTimestamp, ev.timestamp);
              if (ev.type === 'ACCEPTED') {
                window.dispatchEvent(new CustomEvent('medconnect:emergency_accepted', { detail: ev }));
              } else if (ev.type === 'DECLINED') {
                window.dispatchEvent(new CustomEvent('medconnect:emergency_declined', { detail: ev }));
              }
            }
          }
        }
      } catch {
        // quiet error
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    isPolling = false;
  };

  const pollClientSide = async () => {
    console.log('[TelegramBotListener] Starting browser-side Telegram getUpdates polling...');
    while (!stopRequested) {
      const { token } = getTelegramCredentials();
      if (!token) {
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }

      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId ? lastUpdateId + 1 : 0}&timeout=15`;
        const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 409) {
            // Server worker took over or another tab is active
            try {
              const statusRes = await fetch('/api/telegram/status');
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.running) {
                  console.log('[TelegramBotListener] 409 detected. Yielding to active server worker and switching to event sync.');
                  syncServerEvents();
                  return;
                }
              }
            } catch {}
            await new Promise(r => setTimeout(r, 6000));
            continue;
          }
          await new Promise(r => setTimeout(r, 4000));
          continue;
        }

        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id);

            // 1. Process Callback Query ([ ACCEPT & SUPPLY ] or [ DECLINE ])
            if (update.callback_query) {
              await handleCallbackQuery(token, update.callback_query);
            }
            // 2. Process incoming direct chat messages (/start, status, etc.)
            else if (update.message && update.message.text) {
              await handleIncomingMessage(token, update.message);
            }
          }
        }
      } catch {
        // Network or fetch error
        await new Promise(r => setTimeout(r, 3000));
      }

      await new Promise(r => setTimeout(r, 1000));
    }
    isPolling = false;
  };

  init();

  return () => {
    stopRequested = true;
  };
}

async function handleCallbackQuery(token: string, cb: any) {
  const cbId = cb.id;
  const cbData = cb.data;
  const message = cb.message;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;

  if (!cbData) return;

  try {
    // Process acceptance or decline in backend
    const result = await validateAndProcessTelegramCallback(cbData);

    const isAccepted = result.status === 'ACCEPTED';
    const isDeclined = result.status === 'DECLINED';

    // Answer the callback query to dismiss the loading spinner immediately
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

    // Update Telegram message to remove buttons and show confirmation banner
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
            reply_markup: { inline_keyboard: [] }, // Remove buttons
          }),
        }).catch(err => console.warn('Message edit warning:', err?.message));
      }
    }
  } catch (err: any) {
    console.error('Telegram Callback Error:', err.message);

    // Provide friendly notice if request was already handled or invalid
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
