/**
 * Simple BYOA webhook client: POST user message to customer's agent URL.
 * Expected response: { text: string, type?: string, metadata?: object }
 */

export interface WebhookAgentRequest {
  conversationId: string;
  message: string;
  projectId?: string;
}

export interface WebhookAgentResponse {
  text: string;
  type?: string;
  metadata?: Record<string, unknown> | null;
}

const FETCH_TIMEOUT_MS = Number(process.env.AGENT_WEBHOOK_TIMEOUT_MS || 15000);

export async function callAgentWebhook(
  agentUrl: string,
  body: WebhookAgentRequest
): Promise<{ ok: true; data: WebhookAgentResponse } | { ok: false; error: string }> {
  const url = agentUrl.trim();
  if (!url) {
    return { ok: false, error: 'empty_agent_url' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        ok: false,
        error: `webhook_http_${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as Partial<WebhookAgentResponse> & {
      content?: string;
      reply?: string;
    };

    const text = (data.text ?? data.content ?? data.reply ?? '').toString().trim();
    if (!text && data.type !== 'pricing_card') {
      return { ok: false, error: 'webhook_empty_text' };
    }

    return {
      ok: true,
      data: {
        text: text || (data.type === 'pricing_card' ? 'Тарифные планы' : ''),
        type: data.type || 'text',
        metadata: data.metadata ?? null,
      },
    };
  } catch (err: any) {
    const msg =
      err?.name === 'AbortError'
        ? `webhook_timeout_${FETCH_TIMEOUT_MS}ms`
        : err?.message || 'webhook_fetch_failed';
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
