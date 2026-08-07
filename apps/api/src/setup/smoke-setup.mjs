const API = 'http://localhost:3001';

async function main() {
  const auth = await (
    await fetch(`${API}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'setup-smoke-' + Date.now(),
        userId: 'admin-1',
        name: 'Admin',
      }),
    })
  ).json();

  if (!auth.setup || auth.setup.budget < 1000) {
    throw new Error('auth missing setup budget: ' + JSON.stringify(auth.setup));
  }
  console.log('granted setup budget', auth.setup);

  const est = await (
    await fetch(`${API}/api/projects/${auth.projectId}/setup/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productUrl: 'https://example.com',
        productName: 'Example',
      }),
    })
  ).json();

  console.log('estimate', est.estimate.total, 'can', est.setup.canAutoTune);
  if (!est.setup.canAutoTune) throw new Error('should be able to tune');

  const tune = await fetch(`${API}/api/projects/${auth.projectId}/setup/auto-tune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productUrl: 'https://example.com',
      productName: 'Example',
    }),
  });
  const tuneData = await tune.json();
  if (!tune.ok) throw new Error(JSON.stringify(tuneData));

  console.log('tuned', {
    brand: tuneData.setup.themeTokens.brandName,
    charged: tuneData.tokensCharged,
    remaining: tuneData.setup.remaining,
    next: tuneData.nextStep.agents,
  });

  if (!tuneData.setup.completed) throw new Error('setup not completed');
  if (!tuneData.setup.themeTokens.primary) throw new Error('no theme');
  if (!Array.isArray(tuneData.nextStep.agents)) throw new Error('no next agents');

  console.log('✓ setup smoke passed');
}

main().catch((e) => {
  console.error('SETUP SMOKE FAILED', e);
  process.exit(1);
});
