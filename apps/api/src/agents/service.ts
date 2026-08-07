/**
 * BYO-Agent router: free GPT Mini (platform-paid) or customer's MCP agent.
 * Avoids forcing NativeChat into token tariffs / usage quotas for heavy chat use.
 */

import { callMcpAgent } from '../mcp/client';

export type AgentProvider = 'free_mini' | 'mcp';

export interface ProjectAgentConfig {
  agentProvider: string;
  mcpServerUrl?: string | null;
  mcpToolName?: string | null;
  mcpAuthToken?: string | null;
}

export interface AgentReplyInput {
  project: ProjectAgentConfig;
  userMessage: string;
  conversationId: string;
  history?: Array<{ role: string; content: string }>;
}

export interface AgentReply {
  content: string;
  provider: AgentProvider;
  model?: string;
  error?: string;
}

const FREE_MINI_MODEL = process.env.FREE_MINI_MODEL || 'gpt-4o-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const SYSTEM_PROMPT =
  'You are NativeChat GPT Mini — a lightweight free assistant embedded in a chat widget. ' +
  'Be concise and helpful. Reply in the same language as the user.';

async function replyWithFreeMini(input: AgentReplyInput): Promise<AgentReply> {
  if (!OPENAI_API_KEY) {
    // Demo / offline fallback so install works without platform OpenAI billing setup
    return {
      content:
        `[GPT Mini · free] Привет! Я бесплатный встроенный агент NativeChat.\n\n` +
        `Вы написали: «${truncate(input.userMessage, 280)}»\n\n` +
        `Сейчас ответ идёт в demo-режиме (нет OPENAI_API_KEY). ` +
        `Чтобы не жечь токены платформы на проде — подключите своего агента через MCP в настройках чата.`,
      provider: 'free_mini',
      model: 'demo-free-mini',
    };
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(input.history || []).slice(-12),
    { role: 'user', content: input.userMessage },
  ];

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: FREE_MINI_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      content:
        'Извините, бесплатный GPT Mini временно недоступен. Попробуйте позже или подключите своего агента через MCP.',
      provider: 'free_mini',
      model: FREE_MINI_MODEL,
      error: `OpenAI ${res.status}: ${errText.slice(0, 200)}`,
    };
  }

  const data = (await res.json()) as any;
  const content =
    data.choices?.[0]?.message?.content?.trim() ||
    'Пустой ответ от GPT Mini.';

  return {
    content,
    provider: 'free_mini',
    model: data.model || FREE_MINI_MODEL,
  };
}

async function replyWithMcp(input: AgentReplyInput): Promise<AgentReply> {
  const result = await callMcpAgent(
    {
      serverUrl: input.project.mcpServerUrl || '',
      authToken: input.project.mcpAuthToken,
      toolName: input.project.mcpToolName || 'chat',
    },
    input.userMessage,
    {
      conversationId: input.conversationId,
      history: input.history,
    }
  );

  if (!result.ok) {
    return {
      content:
        `Не удалось получить ответ от вашего MCP-агента: ${result.error}\n\n` +
        `Проверьте URL сервера и tool name в настройках агента, либо переключитесь на бесплатный GPT Mini.`,
      provider: 'mcp',
      error: result.error,
    };
  }

  return {
    content: result.text,
    provider: 'mcp',
    model: input.project.mcpToolName || 'chat',
  };
}

export async function generateAgentReply(input: AgentReplyInput): Promise<AgentReply> {
  const provider = (input.project.agentProvider === 'mcp' ? 'mcp' : 'free_mini') as AgentProvider;

  if (provider === 'mcp') {
    if (!input.project.mcpServerUrl) {
      return {
        content:
          'MCP-агент выбран, но URL сервера не задан. Укажите MCP Server URL в настройках или переключитесь на GPT Mini (Free).',
        provider: 'mcp',
        error: 'missing_mcp_url',
      };
    }
    return replyWithMcp(input);
  }

  return replyWithFreeMini(input);
}

export function toPublicAgentConfig(project: ProjectAgentConfig & { name?: string }) {
  const provider = (project.agentProvider === 'mcp' ? 'mcp' : 'free_mini') as AgentProvider;
  return {
    provider,
    label: provider === 'free_mini' ? 'GPT Mini (Free)' : 'Your Agent (MCP)',
    isFree: provider === 'free_mini',
    mcpServerUrl: provider === 'mcp' ? project.mcpServerUrl ?? null : null,
    mcpToolName: provider === 'mcp' ? project.mcpToolName || 'chat' : null,
    hasMcpAuth: Boolean(project.mcpAuthToken),
  };
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
