/**
 * Register / inspect Telegram bot webhook URL.
 */

export function getTelegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim().replace(/^["']|["']$/g, '');
  return token || null;
}

export function getPublicApiBaseUrl(): string | null {
  const raw =
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.TUNNEL_URL?.trim() ||
    process.env.PUBLIC_URL?.trim() ||
    '';
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export async function setTelegramWebhook(
  webhookUrl: string
): Promise<{ ok: boolean; description?: string; result?: unknown; error?: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not set' };
  }

  const endpoint = `https://api.telegram.org/bot${token}/setWebhook`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.description || `HTTP ${res.status}`,
      result: data,
    };
  }
  return { ok: true, description: data.description, result: data.result };
}

export async function getTelegramWebhookInfo(): Promise<any> {
  const token = getTelegramBotToken();
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not set' };
  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  return res.json();
}

/** Call on API boot when PUBLIC_API_URL / TUNNEL_URL is configured. */
export async function registerTelegramWebhookOnBoot(log?: {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
}): Promise<void> {
  const token = getTelegramBotToken();
  const base = getPublicApiBaseUrl();
  if (!token) {
    log?.info({}, 'Telegram webhook: skipped (no TELEGRAM_BOT_TOKEN)');
    return;
  }
  if (!base) {
    log?.info(
      {},
      'Telegram webhook: skipped (set PUBLIC_API_URL or TUNNEL_URL to auto-register)'
    );
    return;
  }

  const webhookUrl = `${base}/api/telegram/webhook`;
  const result = await setTelegramWebhook(webhookUrl);
  if (result.ok) {
    log?.info({ webhookUrl }, 'Telegram webhook registered');
  } else {
    log?.warn({ webhookUrl, error: result.error }, 'Telegram webhook registration failed');
  }
}
