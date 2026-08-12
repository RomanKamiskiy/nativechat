/**
 * Tiny BYOA webhook stub for local Epic 9 demos.
 * POST /agent  →  { text }  or pricing card when message contains "тариф"/"pricing"
 *
 *   node apps/api/src/agents/mockWebhookAgent.mjs
 *   → http://127.0.0.1:3099/agent
 */
import http from 'node:http';

const PORT = Number(process.env.MOCK_AGENT_PORT || 3099);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && (req.url === '/agent' || req.url === '/')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch {
      body = {};
    }

    const message = String(body.message || '');
    const lower = message.toLowerCase();

    let payload;
    if (/тариф|pricing|pro\b|купить/i.test(lower)) {
      payload = {
        text: 'Тарифные планы AcmeCorp',
        type: 'pricing_card',
        metadata: {
          title: 'AcmeCorp Pro',
          price: 99,
          features: ['BYOA webhook', 'UI-карточки', 'Без токенов платформы'],
        },
      };
    } else {
      payload = {
        text:
          `[BYOA · mock] Принял: «${message.slice(0, 200)}». ` +
          `Это ответ кастомного агента клиента (не Gemini / не GPT Mini).`,
      };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
    console.log('←', message.slice(0, 80), '→', payload.type || 'text');
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'mock-byoa-agent' }));
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock BYOA agent on http://127.0.0.1:${PORT}/agent`);
});
