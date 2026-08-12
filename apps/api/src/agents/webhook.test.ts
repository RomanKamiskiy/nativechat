import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { callAgentWebhook } from './webhook.ts';

test('callAgentWebhook parses { text }', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ text: 'hello from agent' }));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };

  const result = await callAgentWebhook(`http://127.0.0.1:${port}/`, {
    conversationId: 'c1',
    message: 'hi',
  });
  server.close();

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.text, 'hello from agent');
});

test('callAgentWebhook fails on empty text', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({}));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };

  const result = await callAgentWebhook(`http://127.0.0.1:${port}/`, {
    conversationId: 'c1',
    message: 'hi',
  });
  server.close();

  assert.equal(result.ok, false);
});
