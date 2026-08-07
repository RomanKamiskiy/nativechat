import { useEffect, useState } from 'react';
import { ChatWidget, type AgentConfigPublic } from '@nativechat/react-sdk';

type Session = {
  token: string;
  conversationId: string;
  projectId: string;
  agent: AgentConfigPublic;
};

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/auth/token', {
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
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f2f5',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px', height: '640px' }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '8px' }}>NativeChat Demo</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          GPT Mini бесплатно или свой агент через MCP — без тарифов на токены
        </p>
        {session ? (
          <ChatWidget
            conversationId={session.conversationId}
            projectId={session.projectId}
            agent={session.agent}
            height="100%"
            token={session.token}
            onAction={(action) => alert('Экшен вызван: ' + JSON.stringify(action))}
            onAgentChange={(agent) =>
              setSession((s) => (s ? { ...s, agent } : s))
            }
          />
        ) : (
          <p style={{ textAlign: 'center', color: '#888' }}>Подключение к серверу...</p>
        )}
      </div>
    </div>
  );
}

export default App;
