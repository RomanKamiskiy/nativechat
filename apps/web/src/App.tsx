import { useEffect, useState } from 'react';
import { ChatWidget } from '@nativechat/react-sdk';

function App() {
  const [session, setSession] = useState<{ token: string; conversationId: string } | null>(null);

  useEffect(() => {
    // Запрашиваем тестовый токен у нашего API
    fetch('http://localhost:3001/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'test-project', userId: 'user-' + Math.floor(Math.random() * 1000), name: 'Demo User' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token && data.conversationId) {
          setSession({ token: data.token, conversationId: data.conversationId });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', height: '600px' }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>NativeChat Demo</h2>
        {session ? (
          <ChatWidget conversationId={session.conversationId} height="100%" token={session.token} />
        ) : (
          <p style={{ textAlign: 'center', color: '#888' }}>Подключение к серверу...</p>
        )}
      </div>
    </div>
  );
}

export default App;
