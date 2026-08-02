import { useEffect, useState } from 'react';
import { ChatWidget } from '@nativechat/react-sdk';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const conversationId = 'demo-room-1';

  useEffect(() => {
    // Запрашиваем тестовый токен у нашего API
    fetch('http://localhost:3001/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'test-project', userId: 'user-' + Math.floor(Math.random() * 1000), name: 'Demo User' })
    })
      .then(res => res.json())
      .then(data => setToken(data.token))
      .catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', height: '600px' }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>NativeChat Demo</h2>
        {token ? (
          <ChatWidget conversationId={conversationId} height="100%" token={token} />
        ) : (
          <p style={{ textAlign: 'center', color: '#888' }}>Подключение к серверу...</p>
        )}
      </div>
    </div>
  );
}

export default App;
