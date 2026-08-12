#!/usr/bin/env node
/**
 * Register Telegram webhook against PUBLIC_API_URL / TUNNEL_URL / CLI arg.
 *
 *   PUBLIC_API_URL=https://xxx.trycloudflare.com node apps/api/src/telegram/setWebhook.mjs
 *   node apps/api/src/telegram/setWebhook.mjs https://xxx.trycloudflare.com
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
const argBase = process.argv[2]?.replace(/\/$/, '');
const envBase = (
  process.env.PUBLIC_API_URL ||
  process.env.TUNNEL_URL ||
  process.env.PUBLIC_URL ||
  ''
)
  .trim()
  .replace(/\/$/, '');

const base = argBase || envBase;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is missing in apps/api/.env');
  process.exit(1);
}
if (!base) {
  console.error('Pass public API base URL as argv or set PUBLIC_API_URL / TUNNEL_URL');
  process.exit(1);
}

const webhookUrl = `${base}/api/telegram/webhook`;
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: webhookUrl,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  }),
});
const data = await res.json();
console.log('setWebhook →', webhookUrl);
console.log(JSON.stringify(data, null, 2));

const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const info = await infoRes.json();
console.log('getWebhookInfo →');
console.log(JSON.stringify(info, null, 2));

if (!data.ok) process.exit(1);
