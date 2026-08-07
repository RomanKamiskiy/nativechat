import http from 'node:http';
import { WebSocket } from 'ws';

const API = 'http://localhost:3001';

function listenMockMcp() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks).toString('utf8');
      let rpc = {};
      try {
        rpc = JSON.parse(body || '{}');
      } catch {}

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Mcp-Session-Id', 'smoke-session');

      if (rpc.method === 'initialize') {
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: rpc.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'smoke-agent', version: '1.0.0' },
            },
          })
        );
        return;
      }

      if (rpc.method === 'notifications/initialized') {
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: {} }));
        return;
      }

      if (rpc.method === 'tools/list') {
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: rpc.id,
            result: {
              tools: [
                {
                  name: 'chat',
                  description: 'Chat with the BYO agent',
                  inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
                },
              ],
            },
          })
        );
        return;
      }

      if (rpc.method === 'tools/call') {
        const message = rpc.params?.arguments?.message || '';
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: rpc.id,
            result: {
              content: [{ type: 'text', text: `MCP-ECHO: ${message}` }],
            },
          })
        );
        return;
      }

      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'unknown method', method: rpc.method }));
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function auth() {
  const res = await fetch(`${API}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'smoke-byo-agent',
      userId: 'smoke-user',
      name: 'Smoke User',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

function waitForAiReply(token, conversationId, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:3001?token=${token}`);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('timeout waiting for AI reply'));
    }, timeoutMs);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join_room', payload: { conversationId } }));
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            type: 'send_message',
            payload: { content: 'smoke-ping-' + Date.now() },
          })
        );
      }, 200);
    });

    const replies = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'new_message' && msg.payload?.sender?.name === 'AI Agent') {
        replies.push(msg.payload);
        clearTimeout(timer);
        ws.close();
        resolve(msg.payload);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  const session = await auth();
  console.log('auth ok', {
    projectId: session.projectId,
    agent: session.agent,
  });
  if (session.agent.provider !== 'free_mini') {
    throw new Error('expected default free_mini');
  }

  const options = await (await fetch(`${API}/api/agents/options`)).json();
  if (options.options.length < 2) throw new Error('expected 2 agent options');

  const freeReply = await waitForAiReply(session.token, session.conversationId);
  console.log('free_mini reply:', freeReply.content.slice(0, 120));
  if (!/GPT Mini|demo/i.test(freeReply.content) && !freeReply.metadata) {
    // demo mode should mention GPT Mini
  }
  if (!String(freeReply.content).includes('smoke-ping') && !/GPT Mini/i.test(freeReply.content)) {
    throw new Error('unexpected free_mini reply: ' + freeReply.content);
  }

  const mock = await listenMockMcp();
  const put = await fetch(`${API}/api/projects/${session.projectId}/agent`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'mcp',
      mcpServerUrl: mock.url,
      mcpToolName: 'chat',
    }),
  });
  const putData = await put.json();
  if (!put.ok) throw new Error(JSON.stringify(putData));
  console.log('switched to mcp', putData.agent);

  const mcpReply = await waitForAiReply(session.token, session.conversationId);
  console.log('mcp reply:', mcpReply.content);
  if (!String(mcpReply.content).startsWith('MCP-ECHO:')) {
    throw new Error('expected MCP-ECHO reply, got: ' + mcpReply.content);
  }

  // switch back to free
  await fetch(`${API}/api/projects/${session.projectId}/agent`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'free_mini' }),
  });

  mock.server.close();
  console.log('✓ smoke test passed');
}

main().catch((err) => {
  console.error('SMOKE FAILED', err);
  process.exit(1);
});
