/** Which AI backend answers in the chat. */
export type AgentProvider = 'free_mini' | 'mcp';

/** Public agent config returned to clients (no secrets). */
export interface AgentConfigPublic {
  provider: AgentProvider;
  /** Human-readable label for the UI selector. */
  label: string;
  /** True when the platform pays for tokens (free_mini). */
  isFree: boolean;
  /** MCP server URL when provider === 'mcp' (may be masked). */
  mcpServerUrl?: string | null;
  /** Tool name invoked on the MCP agent. */
  mcpToolName?: string | null;
  /** Whether an MCP auth header is configured (never the value). */
  hasMcpAuth: boolean;
}

/** Payload to update project agent settings. */
export interface AgentConfigUpdate {
  provider: AgentProvider;
  mcpServerUrl?: string | null;
  mcpToolName?: string | null;
  /** Bearer token / API key for the MCP server. Pass null to clear. */
  mcpAuthToken?: string | null;
}

export const AGENT_PROVIDER_META: Record<
  AgentProvider,
  { label: string; isFree: boolean; description: string }
> = {
  free_mini: {
    label: 'GPT Mini (Free)',
    isFree: true,
    description:
      'Built-in lightweight model. No tariffs on your side — platform covers tokens.',
  },
  mcp: {
    label: 'Your Agent (MCP)',
    isFree: false,
    description:
      'Bring your own agent via MCP. You pay for your own tokens — NativeChat does not.',
  },
};
