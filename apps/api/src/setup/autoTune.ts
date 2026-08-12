/**
 * One-shot product auto-tune: spend limited setup tokens to brand the widget
 * for the customer's product, then hand off to free_mini / MCP for chat.
 */

import {
  estimateAutoTuneTokens,
  toSetupBudgetSnapshot,
  DISABLE_TOKEN_LIMITS,
} from './budget';

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

export interface AutoTuneResult {
  ok: true;
  themeTokens: ThemeTokens;
  welcomeMessage: string;
  productName: string;
  productUrl: string | null;
  tokensCharged: number;
  estimate: ReturnType<typeof estimateAutoTuneTokens>;
  setup: ReturnType<typeof toSetupBudgetSnapshot>;
}

export interface AutoTuneError {
  ok: false;
  error: string;
  code: 'insufficient_setup_tokens' | 'invalid_input' | 'tune_failed';
  setup?: ReturnType<typeof toSetupBudgetSnapshot>;
  estimate?: ReturnType<typeof estimateAutoTuneTokens>;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const FREE_MINI_MODEL = process.env.FREE_MINI_MODEL || 'gpt-4o-mini';

function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

function brandFromUrl(url: string | null | undefined, fallbackName?: string | null): string {
  if (fallbackName?.trim()) return fallbackName.trim();
  if (!url) return 'NativeChat';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const base = host.split('.')[0] || 'Product';
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return fallbackName?.trim() || 'Product';
  }
}

/** Deterministic theme when no OpenAI key — still "tunes" the product UI. */
export function heuristicTheme(productUrl: string | null, productName: string | null): ThemeTokens {
  const brandName = brandFromUrl(productUrl, productName);
  const hue = hashHue(brandName + (productUrl || ''));
  const primary = `hsl(${hue} 72% 42%)`;
  const userBubble = `hsl(${hue} 72% 42%)`;
  return {
    brandName,
    primary,
    background: '#f4f6f8',
    surface: '#ffffff',
    text: '#14181f',
    mutedText: '#5c6672',
    border: '#e2e6eb',
    radius: '12px',
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    userBubble,
    agentBubble: '#eef1f4',
  };
}

function welcomeFor(theme: ThemeTokens, productUrl: string | null): string {
  const where = productUrl ? ` под ${theme.brandName}` : ` для ${theme.brandName}`;
  return (
    `Готово! Чат настроен${where}. ` +
    `Дальше можно писать через бесплатный GPT Mini или подключить своего агента через MCP — ` +
    `setup-токены на автонастройку больше не тратятся.`
  );
}

async function maybeFetchPageSnippet(productUrl: string | null): Promise<string> {
  if (!productUrl) return '';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(productUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NativeChatAutoTune/1.0' },
    });
    clearTimeout(timer);
    if (!res.ok) return '';
    const text = await res.text();
    // Keep a compact slice for estimate + optional LLM
    return text.replace(/\s+/g, ' ').slice(0, 12_000);
  } catch {
    return '';
  }
}

async function llmPolishTheme(
  base: ThemeTokens,
  productUrl: string | null,
  pageSnippet: string
): Promise<{ theme: ThemeTokens; welcomeMessage: string; tokensUsed: number } | null> {
  if (!OPENAI_API_KEY) return null;

  const prompt = {
    model: FREE_MINI_MODEL,
    temperature: 0.3,
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content:
          'You tune a chat widget theme for a product. Return ONLY JSON with keys: ' +
          'primary, background, surface, text, mutedText, border, radius, fontFamily, userBubble, agentBubble, welcomeMessage. ' +
          'Colors as CSS values. Keep brand readable and UI clean.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          brandName: base.brandName,
          productUrl,
          seedTheme: base,
          pageSnippet: pageSnippet.slice(0, 6000),
        }),
      },
    ],
  };

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(prompt),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as any;
  const raw = data.choices?.[0]?.message?.content || '';
  const usage = data.usage?.total_tokens || 0;

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      theme: {
        brandName: base.brandName,
        primary: parsed.primary || base.primary,
        background: parsed.background || base.background,
        surface: parsed.surface || base.surface,
        text: parsed.text || base.text,
        mutedText: parsed.mutedText || base.mutedText,
        border: parsed.border || base.border,
        radius: parsed.radius || base.radius,
        fontFamily: parsed.fontFamily || base.fontFamily,
        userBubble: parsed.userBubble || base.userBubble,
        agentBubble: parsed.agentBubble || base.agentBubble,
      },
      welcomeMessage:
        typeof parsed.welcomeMessage === 'string' && parsed.welcomeMessage.trim()
          ? parsed.welcomeMessage.trim()
          : welcomeFor(base, productUrl),
      tokensUsed: usage,
    };
  } catch {
    return null;
  }
}

export async function runAutoTune(input: {
  productUrl?: string | null;
  productName?: string | null;
  setupTokenBudget: number;
  setupTokensUsed: number;
  setupCompletedAt?: Date | null;
}): Promise<AutoTuneResult | AutoTuneError> {
  const productUrl = input.productUrl?.trim() || null;
  const productName = input.productName?.trim() || null;

  if (!productUrl && !productName) {
    return {
      ok: false,
      code: 'invalid_input',
      error: 'Укажите productUrl или productName для автонастройки',
    };
  }

  const pageSnippet = await maybeFetchPageSnippet(productUrl);
  const estimate = estimateAutoTuneTokens({
    productUrl,
    productName,
    pageChars: pageSnippet.length || undefined,
  });

  const setupBefore = toSetupBudgetSnapshot(
    {
      setupTokenBudget: input.setupTokenBudget,
      setupTokensUsed: input.setupTokensUsed,
      setupCompletedAt: input.setupCompletedAt,
    },
    { productUrl, productName, pageChars: pageSnippet.length || undefined }
  );

  // TEMP: local E2E — skip insufficient_setup_tokens gate
  // if (!setupBefore.canAutoTune) {
  //   return {
  //     ok: false,
  //     code: 'insufficient_setup_tokens',
  //     error: `Не хватает setup-токенов: нужно ~${estimate.total}, осталось ${setupBefore.remaining}`,
  //     setup: setupBefore,
  //     estimate,
  //   };
  // }
  if (!DISABLE_TOKEN_LIMITS && !setupBefore.canAutoTune) {
    return {
      ok: false,
      code: 'insufficient_setup_tokens',
      error: `Не хватает setup-токенов: нужно ~${estimate.total}, осталось ${setupBefore.remaining}`,
      setup: setupBefore,
      estimate,
    };
  }

  const base = heuristicTheme(productUrl, productName);
  let theme = base;
  let welcomeMessage = welcomeFor(base, productUrl);
  let tokensCharged = estimate.total;

  try {
    const polished = await llmPolishTheme(base, productUrl, pageSnippet);
    if (polished) {
      theme = polished.theme;
      welcomeMessage = polished.welcomeMessage;
      // Charge the higher of estimate vs actual usage (never undercharge the budget)
      tokensCharged = Math.max(estimate.total, polished.tokensUsed);
    }
  } catch {
    // keep heuristic result
  }

  // Clamp to remaining so we never store used > budget from floaty LLM usage
  // TEMP: when limits disabled, still charge estimate but do not clamp to tiny remaining
  if (DISABLE_TOKEN_LIMITS) {
    tokensCharged = Math.max(estimate.total, tokensCharged);
  } else {
    const remaining = input.setupTokenBudget - input.setupTokensUsed;
    tokensCharged = Math.min(tokensCharged, remaining);
  }

  return {
    ok: true,
    themeTokens: theme,
    welcomeMessage,
    productName: theme.brandName,
    productUrl,
    tokensCharged,
    estimate,
    setup: toSetupBudgetSnapshot(
      {
        setupTokenBudget: input.setupTokenBudget,
        setupTokensUsed: input.setupTokensUsed + tokensCharged,
        setupCompletedAt: new Date(),
      },
      { productUrl, productName }
    ),
  };
}

export function publicSetupState(project: {
  setupTokenBudget: number;
  setupTokensUsed: number;
  setupCompletedAt?: Date | null;
  productUrl?: string | null;
  productName?: string | null;
  themeTokens?: unknown;
  welcomeMessage?: string | null;
}) {
  return {
    ...toSetupBudgetSnapshot(project, {
      productUrl: project.productUrl,
      productName: project.productName,
    }),
    productUrl: project.productUrl ?? null,
    productName: project.productName ?? null,
    themeTokens: (project.themeTokens as ThemeTokens | null) ?? null,
    welcomeMessage: project.welcomeMessage ?? null,
  };
}
