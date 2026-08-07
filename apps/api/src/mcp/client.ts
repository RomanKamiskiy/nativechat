/**
 * Minimal MCP JSON-RPC client over Streamable HTTP / simple POST.
 * Used to call a customer's own agent exposed as an MCP server.
 */

export interface McpClientOptions {
  serverUrl: string;
  authToken?: string | null;
  toolName?: string | null;
  timeoutMs?: number;
}

export interface McpToolCallResult {
  ok: true;
  text: string;
  raw: unknown;
}

export interface McpToolCallError {
  ok: false;
  error: string;
}

type McpResult = McpToolCallResult | McpToolCallError;

let rpcId = 1;

async function mcpRequest(
  serverUrl: string,
  method: string,
  params: Record<string, unknown> | undefined,
  authToken?: string | null,
  sessionId?: string | null,
  timeoutMs = 30000
): Promise<{ body: any; sessionId: string | null }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: rpcId++,
        method,
        ...(params ? { params } : {}),
      }),
      signal: controller.signal,
    });

    const nextSession = res.headers.get('mcp-session-id') || sessionId || null;
    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    if (!res.ok) {
      throw new Error(`MCP HTTP ${res.status}: ${rawText.slice(0, 300)}`);
    }

    let body: any;
    if (contentType.includes('text/event-stream')) {
      body = parseSseJsonRpc(rawText);
    } else {
      body = rawText ? JSON.parse(rawText) : null;
    }

    if (body?.error) {
      throw new Error(body.error.message || JSON.stringify(body.error));
    }

    return { body, sessionId: nextSession };
  } finally {
    clearTimeout(timer);
  }
}

/** Extract the last JSON-RPC response from an SSE stream body. */
function parseSseJsonRpc(raw: string): any {
  const events = raw.split(/\n\n+/);
  let last: any = null;
  for (const event of events) {
    const dataLines = event
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.replace(/^data:\s?/, ''));
    if (!dataLines.length) continue;
    const payload = dataLines.join('\n');
    try {
      last = JSON.parse(payload);
    } catch {
      // ignore non-JSON SSE chunks
    }
  }
  if (!last) {
    throw new Error('MCP SSE stream contained no JSON-RPC response');
  }
  return last;
}

function extractTextFromToolResult(result: any): string {
  if (!result) return '';

  // MCP tools/call result shape: { content: [{ type: 'text', text: '...' }], ... }
  const content = result.content ?? result.result?.content;
  if (Array.isArray(content)) {
    const texts = content
      .filter((c) => c && (c.type === 'text' || typeof c.text === 'string'))
      .map((c) => c.text)
      .filter(Boolean);
    if (texts.length) return texts.join('\n');
  }

  if (typeof result === 'string') return result;
  if (typeof result.text === 'string') return result.text;
  if (typeof result.message === 'string') return result.message;
  if (typeof result.output === 'string') return result.output;

  return JSON.stringify(result, null, 2);
}

/**
 * Initialize session (best-effort), resolve tool name, call it with the user message.
 */
export async function callMcpAgent(
  options: McpClientOptions,
  userMessage: string,
  context?: { conversationId?: string; history?: Array<{ role: string; content: string }> }
): Promise<McpResult> {
  const { serverUrl, authToken, timeoutMs } = options;
  let toolName = options.toolName || 'chat';

  if (!serverUrl) {
    return { ok: false, error: 'MCP server URL is not configured' };
  }

  try {
    let sessionId: string | null = null;

    // Best-effort initialize (some servers require it for Streamable HTTP)
    try {
      const init = await mcpRequest(
        serverUrl,
        'initialize',
        {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'nativechat', version: '1.0.0' },
        },
        authToken,
        null,
        timeoutMs
      );
      sessionId = init.sessionId;
      // notifications/initialized — ignore failures
      try {
        await mcpRequest(
          serverUrl,
          'notifications/initialized',
          {},
          authToken,
          sessionId,
          timeoutMs
        );
      } catch {
        // optional
      }
    } catch {
      // Some simple MCP gateways accept tools/call without initialize
    }

    // If default tool missing, pick a sensible one from tools/list
    try {
      const listed = await mcpRequest(
        serverUrl,
        'tools/list',
        {},
        authToken,
        sessionId,
        timeoutMs
      );
      const tools: Array<{ name: string }> =
        listed.body?.result?.tools || listed.body?.tools || [];
      if (tools.length && !tools.some((t) => t.name === toolName)) {
        const preferred =
          tools.find((t) =>
            /^(chat|ask|message|respond|generate|agent)/i.test(t.name)
          ) || tools[0];
        toolName = preferred.name;
      }
    } catch {
      // proceed with configured tool name
    }

    const call = await mcpRequest(
      serverUrl,
      'tools/call',
      {
        name: toolName,
        arguments: {
          message: userMessage,
          content: userMessage,
          conversationId: context?.conversationId,
          history: context?.history,
        },
      },
      authToken,
      sessionId,
      timeoutMs
    );

    const resultPayload = call.body?.result ?? call.body;
    const text = extractTextFromToolResult(resultPayload).trim();

    if (!text) {
      return { ok: false, error: 'MCP agent returned an empty response' };
    }

    return { ok: true, text, raw: resultPayload };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.name === 'AbortError' ? 'MCP agent timed out' : err?.message || String(err),
    };
  }
}
