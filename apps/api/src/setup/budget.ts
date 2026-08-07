/**
 * Setup-token budget: a small, one-shot platform grant used ONLY to auto-tune
 * the chat widget to the customer's product. Ongoing chat does not spend this —
 * after tune, the project uses free GPT Mini or the customer's MCP agent.
 */

export const DEFAULT_SETUP_TOKEN_BUDGET = Number(
  process.env.SETUP_TOKEN_BUDGET || 8000
);

/** Fixed costs we always reserve for a full auto-tune pass. */
export const AUTO_TUNE_BASE_TOKENS = {
  /** System + instruction prompt for theme synthesis */
  systemPrompt: 450,
  /** Structured theme JSON output */
  themeOutput: 700,
  /** Welcome / onboarding copy */
  welcomeOutput: 350,
  /** Safety buffer for retries / slightly longer pages */
  buffer: 500,
} as const;

export interface SetupBudgetSnapshot {
  budget: number;
  used: number;
  remaining: number;
  completed: boolean;
  /** Tokens we estimate a fresh auto-tune needs right now */
  estimateForTune: number;
  /** Whether remaining budget covers the estimate */
  canAutoTune: boolean;
}

export interface TuneEstimateInput {
  productUrl?: string | null;
  productName?: string | null;
  /** Raw HTML / CSS snippet length if already fetched */
  pageChars?: number;
}

/**
 * Rough token estimate: ~4 chars per token for Latin/HTML, a bit denser for mixed.
 * Cap page context so one site cannot explode the budget.
 */
export function estimateTokensForPage(pageChars: number): number {
  const capped = Math.min(Math.max(pageChars, 0), 24_000);
  return Math.ceil(capped / 4);
}

export function estimateAutoTuneTokens(input: TuneEstimateInput): {
  total: number;
  breakdown: Record<string, number>;
} {
  const nameChars = (input.productName || '').length;
  const urlChars = (input.productUrl || '').length;
  const pageTokens = estimateTokensForPage(input.pageChars ?? guessPageChars(input.productUrl));

  const breakdown = {
    systemPrompt: AUTO_TUNE_BASE_TOKENS.systemPrompt,
    productContext: Math.ceil((nameChars + urlChars) / 4) + 80,
    pageContext: pageTokens,
    themeOutput: AUTO_TUNE_BASE_TOKENS.themeOutput,
    welcomeOutput: AUTO_TUNE_BASE_TOKENS.welcomeOutput,
    buffer: AUTO_TUNE_BASE_TOKENS.buffer,
  };

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { total, breakdown };
}

function guessPageChars(productUrl?: string | null): number {
  // Typical marketing landing snippet we would send to the model
  if (!productUrl) return 4_000;
  return 8_000;
}

export function toSetupBudgetSnapshot(
  project: {
    setupTokenBudget: number;
    setupTokensUsed: number;
    setupCompletedAt?: Date | null;
  },
  estimateInput: TuneEstimateInput = {}
): SetupBudgetSnapshot {
  const remaining = Math.max(0, project.setupTokenBudget - project.setupTokensUsed);
  const { total } = estimateAutoTuneTokens(estimateInput);
  return {
    budget: project.setupTokenBudget,
    used: project.setupTokensUsed,
    remaining,
    completed: Boolean(project.setupCompletedAt),
    estimateForTune: total,
    canAutoTune: remaining >= total,
  };
}
