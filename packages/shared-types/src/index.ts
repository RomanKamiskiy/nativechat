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
      'Built-in lightweight model for ongoing chat after setup. No setup-token spend.',
  },
  mcp: {
    label: 'Your Agent (MCP)',
    isFree: false,
    description:
      'Bring your own agent via MCP after auto-tune. You pay for your own chat tokens.',
  },
};

/** Design tokens produced by product auto-tune. */
export interface ThemeTokens {
  brandName: string;
  primary: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  radius: string;
  fontFamily: string;
  userBubble: string;
  agentBubble: string;
}

/**
 * Limited platform tokens for one-shot product auto-tune only.
 * Chat after setup uses free_mini or MCP — not this budget.
 */
export interface SetupBudgetPublic {
  budget: number;
  used: number;
  remaining: number;
  /** Alias for remaining (E2E / UI) */
  tokensLeft?: number;
  completed: boolean;
  estimateForTune: number;
  canAutoTune: boolean;
  productUrl?: string | null;
  productName?: string | null;
  themeTokens?: ThemeTokens | null;
  welcomeMessage?: string | null;
}
