import { useEffect, useState } from 'react';
import {
  ChatWidget,
  type AgentConfigPublic,
  type SetupBudgetPublic,
} from '@nativechat/react-sdk';
import { getDemoApiUrl, getDemoWsUrl } from './demoApi';

type Session = {
  token: string;
  conversationId: string;
  projectId: string;
  agent: AgentConfigPublic;
  setup: SetupBudgetPublic;
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const apiUrl = getDemoApiUrl();
  const wsUrl = getDemoWsUrl();

  useEffect(() => {
    fetch(`${apiUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'test-project',
        userId: 'user-' + Math.floor(Math.random() * 1000),
        name: 'Demo User',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token && data.conversationId && data.projectId) {
          setSession({
            token: data.token,
            conversationId: data.conversationId,
            projectId: data.projectId,
            agent: data.agent,
            setup: data.setup,
          });
        }
      })
      .catch(console.error);
  }, [apiUrl]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: session?.setup?.themeTokens?.background || '#f0f2f5',
        fontFamily: session?.setup?.themeTokens?.fontFamily || 'sans-serif',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px', height: '720px' }}>
        <h2
          style={{
            textAlign: 'center',
            color: session?.setup?.themeTokens?.text || '#333',
            marginBottom: '8px',
          }}
        >
          {session?.setup?.themeTokens?.brandName || 'NativeChat'} Demo
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: '#666',
            fontSize: 13,
            marginTop: 0,
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          Сначала ограниченный бюджет на автонастройку продукта.
          <br />
          Потом GPT Mini (Free) или свой агент через MCP.
        </p>
        {session ? (
          <ChatWidget
            conversationId={session.conversationId}
            projectId={session.projectId}
            agent={session.agent}
            setup={session.setup}
            apiUrl={apiUrl}
            wsUrl={wsUrl}
            height="100%"
            token={session.token}
            onAction={(action) => alert('Экшен вызван: ' + JSON.stringify(action))}
            onAgentChange={(agent) => setSession((s) => (s ? { ...s, agent } : s))}
            onSetupComplete={(setup) => setSession((s) => (s ? { ...s, setup } : s))}
          />
        ) : (
          <p style={{ textAlign: 'center', color: '#888' }}>Подключение к серверу...</p>
        )}
      </div>
    </div>
  );
}

export default App;
