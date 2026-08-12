import React, { useEffect, useState } from 'react';
import type { ThemeTokens } from '../theme';

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

export interface SetupPanelProps {
  projectId: string;
  apiUrl?: string;
  setup?: SetupBudgetPublic | null;
  onSetupComplete?: (setup: SetupBudgetPublic) => void;
}

export const SetupPanel = ({
  projectId,
  apiUrl = 'http://localhost:3001',
  setup: initial,
  onSetupComplete,
}: SetupPanelProps) => {
  const [setup, setSetup] = useState<SetupBudgetPublic | null>(initial ?? null);
  const [productUrl, setProductUrl] = useState(initial?.productUrl || '');
  const [productName, setProductName] = useState(initial?.productName || '');
  const [estimate, setEstimate] = useState<number | null>(initial?.estimateForTune ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSetup(initial ?? null);
    if (initial) {
      setProductUrl(initial.productUrl || '');
      setProductName(initial.productName || '');
      setEstimate(initial.estimateForTune);
    }
  }, [initial]);

  const refreshEstimate = async () => {
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/setup/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productUrl: productUrl.trim() || undefined,
          productName: productName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Не удалось посчитать токены');
        return;
      }
      setEstimate(data.estimate.total);
      setSetup((s) => (s ? { ...s, ...data.setup } : data.setup));
    } catch (e: any) {
      setError(e?.message || 'Network error');
    }
  };

  const runTune = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/setup/auto-tune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productUrl: productUrl.trim() || undefined,
          productName: productName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Автонастройка не удалась');
        if (data.setup) setSetup((s) => ({ ...(s || data.setup), ...data.setup }));
        return;
      }
      setSetup(data.setup);
      onSetupComplete?.(data.setup);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!setup) return null;

  if (setup.completed && setup.themeTokens) {
    return (
      <div
        className="nc-setup-done"
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--nc-border, #eee)',
          background: 'var(--nc-surface, #fff)',
          fontFamily: 'var(--nc-font, sans-serif)',
          fontSize: 12,
          color: 'var(--nc-muted, #666)',
        }}
      >
        <strong style={{ color: 'var(--nc-text, #111)' }}>
          {setup.themeTokens.brandName}
        </strong>
        {' · '}
        автонастройка готова · setup {setup.used}/{setup.budget} ток.
        <div style={{ marginTop: 4 }}>
          Дальше: GPT Mini (Free) или свой агент через MCP
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((setup.used / Math.max(setup.budget, 1)) * 100));

  return (
    <div
      className="nc-setup-panel"
      style={{
        padding: 12,
        borderBottom: '1px solid #eee',
        background: '#fafafa',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ fontSize: 13 }}>Автонастройка продукта</strong>
        <span style={{ fontSize: 11, color: '#666' }}>
          {(setup.tokensLeft ?? setup.remaining)}/{setup.budget} ток. осталось
        </span>
      </div>

      <div
        style={{
          height: 4,
          borderRadius: 999,
          background: '#e5e5e5',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--nc-accent, #007aff)',
          }}
        />
      </div>

      <p style={{ margin: 0, fontSize: 12, color: '#666', lineHeight: 1.4 }}>
        Даём ограниченный бюджет setup-токенов, сразу настраиваем чат под ваш продукт.
        Потом — бесплатный GPT Mini или свой MCP-агент, без тарифов на чат.
      </p>

      <label style={{ fontSize: 11, color: '#555' }}>
        URL продукта
        <input
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          onBlur={() => void refreshEstimate()}
          placeholder="https://your-product.com"
          style={{
            display: 'block',
            width: '100%',
            marginTop: 4,
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid #ddd',
            fontSize: 12,
            boxSizing: 'border-box',
          }}
        />
      </label>

      <label style={{ fontSize: 11, color: '#555' }}>
        Название (если нет URL)
        <input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onBlur={() => void refreshEstimate()}
          placeholder="Acme Shop"
          style={{
            display: 'block',
            width: '100%',
            marginTop: 4,
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid #ddd',
            fontSize: 12,
            boxSizing: 'border-box',
          }}
        />
      </label>

      {estimate != null && (
        <div style={{ fontSize: 12, color: '#333' }}>
          Нужно ≈ <strong>{estimate}</strong> ток. на автонастройку
          {!setup.canAutoTune && (
            <span style={{ color: '#c0392b' }}> — бюджета не хватает</span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => void refreshEstimate()}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#fff',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Посчитать токены
        </button>
        <button
          type="button"
          disabled={loading || (!productUrl.trim() && !productName.trim())}
          onClick={() => void runTune()}
          style={{
            flex: 1.4,
            padding: '8px 10px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--nc-accent, #007aff)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Настраиваем…' : 'Настроить сразу'}
        </button>
      </div>

      {error && <div style={{ fontSize: 12, color: '#c0392b' }}>{error}</div>}
    </div>
  );
};
