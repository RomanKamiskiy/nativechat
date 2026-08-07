import assert from 'node:assert/strict';
import {
  DEFAULT_SETUP_TOKEN_BUDGET,
  estimateAutoTuneTokens,
  toSetupBudgetSnapshot,
} from './budget';
import { heuristicTheme, runAutoTune } from './autoTune';

async function run() {
  assert.ok(DEFAULT_SETUP_TOKEN_BUDGET >= 5000);

  const estimate = estimateAutoTuneTokens({
    productUrl: 'https://acme.example',
    productName: 'Acme',
  });
  assert.ok(estimate.total > 1000);
  assert.ok(estimate.total <= DEFAULT_SETUP_TOKEN_BUDGET);
  assert.ok(estimate.breakdown.pageContext > 0);

  const snap = toSetupBudgetSnapshot(
    { setupTokenBudget: 8000, setupTokensUsed: 0, setupCompletedAt: null },
    { productUrl: 'https://acme.example' }
  );
  assert.equal(snap.canAutoTune, true);
  assert.equal(snap.remaining, 8000);

  const poor = toSetupBudgetSnapshot(
    { setupTokenBudget: 8000, setupTokensUsed: 7900, setupCompletedAt: null },
    { productUrl: 'https://acme.example' }
  );
  assert.equal(poor.canAutoTune, false);

  const theme = heuristicTheme('https://shop.acme.io', null);
  assert.equal(theme.brandName, 'Shop');
  assert.match(theme.primary, /^hsl\(/);

  delete process.env.OPENAI_API_KEY;
  const tuned = await runAutoTune({
    productUrl: 'https://demo.nativechat.test',
    productName: 'DemoBrand',
    setupTokenBudget: 8000,
    setupTokensUsed: 0,
  });
  assert.equal(tuned.ok, true);
  if (tuned.ok) {
    assert.equal(tuned.productName, 'DemoBrand');
    assert.ok(tuned.tokensCharged > 0);
    assert.ok(tuned.setup.completed);
    assert.ok(tuned.themeTokens.primary);
    assert.match(tuned.welcomeMessage, /GPT Mini|MCP/i);
  }

  const denied = await runAutoTune({
    productUrl: 'https://x.test',
    setupTokenBudget: 100,
    setupTokensUsed: 0,
  });
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.code, 'insufficient_setup_tokens');

  console.log('✓ setup budget / auto-tune tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
