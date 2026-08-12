import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTelegramUpdate } from './webhook.ts';

test('skips non-text updates', async () => {
  const prisma = {} as any;
  const result = await handleTelegramUpdate(prisma, {});
  assert.equal(result.ok, true);
  assert.equal(result.skipped, 'no_text_message');
});

test('skips when TELEGRAM_BOT_TOKEN missing', async () => {
  const prev = process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_BOT_TOKEN;
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'dummy';
  const result = await handleTelegramUpdate({} as any, {
    message: { text: 'hi', chat: { id: 1 } },
  });
  assert.equal(result.skipped, 'missing_token');
  if (prev !== undefined) process.env.TELEGRAM_BOT_TOKEN = prev;
});
