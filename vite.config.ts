import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// https://vite.dev/config/
// MedConnect Pulse - Production Configuration
export default defineConfig(({ mode }) => {
  // Load environment variables from .env
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'medconnect-integrations-api',
        configureServer(server) {
          server.middlewares.use('/api/integrations/save', (req, res) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  const envPath = path.resolve(process.cwd(), '.env');
                  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
                  for (const [k, v] of Object.entries(data)) {
                    if (v !== undefined) {
                      const keysToUpdate = [k];
                      if (!k.startsWith('VITE_')) {
                        keysToUpdate.push(`VITE_${k}`);
                      }
                      for (const key of keysToUpdate) {
                        const regex = new RegExp(`^${key}=.*$`, 'm');
                        if (regex.test(content)) {
                          content = content.replace(regex, `${key}=${v}`);
                        } else {
                          content += `\n${key}=${v}`;
                        }
                      }
                    }
                  }
                  fs.writeFileSync(envPath, content, 'utf-8');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, message: 'Saved to .env' }));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: e.message }));
                }
              });
            } else {
              res.statusCode = 405;
              res.end();
            }
          });

          const cacheDir = path.resolve(process.cwd(), 'node_modules/.cache/medconnect');
          if (!fs.existsSync(cacheDir)) {
            try { fs.mkdirSync(cacheDir, { recursive: true }); } catch {}
          }
          const statusFile = path.resolve(cacheDir, 'telegram-status.json');
          const eventsFile = path.resolve(cacheDir, 'telegram-events.json');

          server.middlewares.use('/api/telegram/status', (_req, res) => {
            let isRunning = false;
            let lastPoll = 0;
            if (fs.existsSync(statusFile)) {
              try {
                const info = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
                if (Date.now() - info.lastPoll < 25000) {
                  isRunning = true;
                  lastPoll = info.lastPoll;
                }
              } catch {}
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ running: isRunning, lastPoll }));
          });

          server.middlewares.use('/api/telegram/events', (req, res) => {
            let events: any[] = [];
            if (fs.existsSync(eventsFile)) {
              try {
                events = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
              } catch {}
            }
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const since = parseInt(url.searchParams.get('since') || '0', 10);
            const filtered = events.filter((e: any) => e.timestamp > since);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ events: filtered }));
          });

          // Automatically launch 24/7 background Telegram bot listener in Node
          if (env.TELEGRAM_BOT_TOKEN || env.VITE_TELEGRAM_BOT_TOKEN) {
            let isAlreadyRunning = false;
            if (fs.existsSync(statusFile)) {
              try {
                const info = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
                if (info.pid && Date.now() - info.lastPoll < 20000) {
                  try {
                    process.kill(info.pid, 0);
                    isAlreadyRunning = true;
                  } catch {}
                }
              } catch {}
            }

            if (!isAlreadyRunning) {
              try {
                const workerScript = path.resolve(process.cwd(), 'scripts/telegram-worker.ts');
                const worker = spawn('npx', ['tsx', '--env-file=.env', workerScript], {
                  stdio: 'inherit',
                  detached: false,
                  env: { ...process.env, ...env },
                });
                console.log('[vite] Started 24/7 background Telegram Bot worker (PID: ' + worker.pid + ')');
              } catch (err: any) {
                console.warn('[vite] Failed to start background telegram bot server:', err?.message || err);
              }
            }
          }
        },
      },
    ],
    define: {
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || ''),
      'process.env.SARVAM_API_KEY': JSON.stringify(env.SARVAM_API_KEY || ''),
      'process.env.TELEGRAM_BOT_TOKEN': JSON.stringify(env.TELEGRAM_BOT_TOKEN || ''),
      'process.env.TELEGRAM_CHAT_ID': JSON.stringify(env.TELEGRAM_CHAT_ID || ''),
      'process.env.TWILIO_ACCOUNT_SID': JSON.stringify(env.TWILIO_ACCOUNT_SID || ''),
      'process.env.TWILIO_AUTH_TOKEN': JSON.stringify(env.TWILIO_AUTH_TOKEN || ''),
      'process.env.TWILIO_FROM_PHONE': JSON.stringify(env.TWILIO_FROM_PHONE || ''),
      'process.env.TWILIO_TO_PHONE': JSON.stringify(env.TWILIO_TO_PHONE || ''),
      'process.env.N8N_BASE_URL': JSON.stringify(env.N8N_BASE_URL || 'http://localhost:5678'),
      'process.env.N8N_WEBHOOK_URL': JSON.stringify(env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'),
      'process.env.N8N_WEBHOOK_SECRET': JSON.stringify(env.N8N_WEBHOOK_SECRET || 'medconnect-n8n-secret-key'),
    },
    server: {
      watch: {
        ignored: [
          '**/.telegram*',
          '**/.telegram/**',
          '**/.telegram-cache/**',
          '**/.telegram-status.json',
          '**/.telegram-events.json',
          '**/.env*',
          '**/scripts/**',
        ],
      },
      proxy: {
        // Proxy /api/openai → https://api.openai.com with Authorization injected server-side
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = env.OPENAI_API_KEY;
              if (key) {
                proxyReq.setHeader('Authorization', `Bearer ${key}`);
              }
            });
          },
        },
        // Proxy /api/sarvam → https://api.sarvam.ai with api-subscription-key injected server-side
        '/api/sarvam': {
          target: 'https://api.sarvam.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/sarvam/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = env.SARVAM_API_KEY;
              if (key) {
                proxyReq.setHeader('api-subscription-key', key);
              }
            });
          },
        },
        // Proxy /api/n8n → remote n8n to avoid browser CORS restrictions
        '/api/n8n': {
          target: env.N8N_BASE_URL || 'https://ayankkkk.app.n8n.cloud',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
        },
      },
    },
  };
});
