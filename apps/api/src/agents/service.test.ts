import assert from 'node:assert/strict';
import { generateAgentReply, toPublicAgentConfig } from './service';

async function run() {
  const publicCfg = toPublicAgentConfig({
    agentProvider: 'free_mini',
    mcpServerUrl: 'https://secret.example/mcp',
    mcpAuthToken: 'shh',
    mcpToolName: 'chat',
  });
  assert.equal(publicCfg.provider, 'free_mini');
  assert.equal(publicCfg.isFree, true);
  assert.equal(publicCfg.mcpServerUrl, null);
  assert.equal(publicCfg.hasMcpAuth, true);

  const mcpPublic = toPublicAgentConfig({
    agentProvider: 'mcp',
    mcpServerUrl: 'https://agent.example/mcp',
    mcpAuthToken: null,
    mcpToolName: 'ask',
  });
  assert.equal(mcpPublic.provider, 'mcp');
  assert.equal(mcpPublic.isFree, false);
  assert.equal(mcpPublic.mcpServerUrl, 'https://agent.example/mcp');
  assert.equal(mcpPublic.mcpToolName, 'ask');
  assert.equal(mcpPublic.hasMcpAuth, false);

  // Without Gemini / OpenAI keys → clear configuration error (no hardcoded demo stub)
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const reply = await generateAgentReply({
    project: { agentProvider: 'free_mini' },
    userMessage: 'Привет из теста',
    conversationId: 'conv-test',
  });
  assert.equal(reply.provider, 'free_mini');
  assert.match(reply.content, /GEMINI_API_KEY/);
  assert.equal(reply.error, 'missing_gemini_and_openai');

  // MCP without URL → friendly error content
  const mcpMissing = await generateAgentReply({
    project: { agentProvider: 'mcp', mcpServerUrl: null },
    userMessage: 'hi',
    conversationId: 'conv-test',
  });
  assert.equal(mcpMissing.provider, 'mcp');
  assert.equal(mcpMissing.error, 'missing_mcp_url');

  console.log('✓ agent service tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
