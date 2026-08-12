import React, { useEffect, useState } from 'react';

export type AgentProvider = 'free_mini' | 'mcp';

export interface AgentConfigPublic {
  provider: AgentProvider;
  label: string;
  isFree: boolean;
  mcpServerUrl?: string | null;
  mcpToolName?: string | null;
  hasMcpAuth: boolean;
}

export interface AgentOption {
  provider: AgentProvider;
  label: string;
  isFree: boolean;
  description: string;
}

export interface AgentSelectorProps {
  projectId: string;
  apiUrl?: string;
  agent?: AgentConfigPublic | null;
  onAgentChange?: (agent: AgentConfigPublic) => void;
}

export const AgentSelector = ({
  projectId,
  apiUrl = 'http://localhost:3001',
  agent,
  onAgentChange,
}: AgentSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AgentOption[]>([]);
  const [current, setCurrent] = useState<AgentConfigPublic | null>(agent ?? null);
  const [mcpUrl, setMcpUrl] = useState(agent?.mcpServerUrl || '');
  const [mcpTool, setMcpTool] = useState(agent?.mcpToolName || 'chat');
  const [mcpAuth, setMcpAuth] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(agent ?? null);
    if (agent) {
      setMcpUrl(agent.mcpServerUrl || '');
      setMcpTool(agent.mcpToolName || 'chat');
    }
  }, [agent]);

  useEffect(() => {
    fetch(`${apiUrl}/api/agents/options`)
      .then((r) => r.json())
      .then((data) => {
        if (data.options) setOptions(data.options);
      })
      .catch(() => {
        setOptions([
          {
            provider: 'free_mini',
            label: 'GPT Mini (Free)',
            isFree: true,
            description: 'Built-in lightweight model.',
          },
          {
            provider: 'mcp',
            label: 'Your Agent (MCP)',
            isFree: false,
            description: 'Bring your own agent via MCP.',
          },
        ]);
      });
  }, [apiUrl]);

  const save = async (provider: AgentProvider) => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { provider };
      if (provider === 'mcp') {
        if (!mcpUrl.trim()) {
          setError('Укажите MCP Server URL');
          setSaving(false);
          return;
        }
        body.mcpServerUrl = mcpUrl.trim();
        body.mcpToolName = mcpTool.trim() || 'chat';
        if (mcpAuth.trim()) body.mcpAuthToken = mcpAuth.trim();
      }

      const res = await fetch(`${apiUrl}/api/projects/${projectId}/agent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Не удалось сохранить');
        return;
      }
      setCurrent(data.agent);
      onAgentChange?.(data.agent);
      if (provider === 'free_mini') setOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const label = current?.label || 'GPT Mini (Free)';

  return (
    <div className="nc-agent-selector" style={{ position: 'relative', fontFamily: 'sans-serif' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 14px',
          border: 'none',
          borderBottom: '1px solid #eee',
          background: '#fafafa',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 12, color: '#666', flexShrink: 0 }}>Agent</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111', flex: 1 }}>{label}</span>
        {current?.isFree !== false && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#0a7a3e',
              background: '#e8f8ef',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            FREE
          </span>
        )}
        <span style={{ color: '#999', fontSize: 12 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            background: '#fff',
            borderBottom: '1px solid #eee',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: '#666', lineHeight: 1.4 }}>
            Выберите агента: бесплатный GPT Mini или свой через MCP — без тарифов на токены
            NativeChat.
          </p>

          {options.map((opt) => {
            const active = current?.provider === opt.provider;
            return (
              <button
                key={opt.provider}
                type="button"
                disabled={saving}
                onClick={() => {
                  if (opt.provider === 'free_mini') {
                    void save('free_mini');
                  } else {
                    // reveal MCP form; don't save until URL is set
                    setCurrent((c) =>
                      c
                        ? { ...c, provider: 'mcp', label: opt.label, isFree: false }
                        : {
                            provider: 'mcp',
                            label: opt.label,
                            isFree: false,
                            hasMcpAuth: false,
                          }
                    );
                  }
                }}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: active ? '1.5px solid var(--nc-accent, #007aff)' : '1px solid #e5e5e5',
                  background: active ? '#f0f7ff' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{opt.label}</strong>
                  {opt.isFree && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0a7a3e' }}>FREE</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{opt.description}</div>
              </button>
            );
          })}

          {(current?.provider === 'mcp' || mcpUrl) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              <label style={{ fontSize: 11, color: '#555' }}>
                MCP Server URL
                <input
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="https://your-agent.example/mcp"
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
                Tool name
                <input
                  value={mcpTool}
                  onChange={(e) => setMcpTool(e.target.value)}
                  placeholder="chat"
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
                Auth token (optional)
                <input
                  type="password"
                  value={mcpAuth}
                  onChange={(e) => setMcpAuth(e.target.value)}
                  placeholder={current?.hasMcpAuth ? '•••••••• (unchanged)' : 'Bearer token'}
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
              <button
                type="button"
                disabled={saving}
                onClick={() => void save('mcp')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--nc-accent, #007aff)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Сохранение…' : 'Подключить MCP-агента'}
              </button>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: '#c0392b' }}>{error}</div>
          )}
        </div>
      )}
    </div>
  );
};
