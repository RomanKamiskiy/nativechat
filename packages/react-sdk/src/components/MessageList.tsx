import React from 'react';
import { useChatStore } from '../store';

export const MessageList = () => {
  const messages = useChatStore((state) => state.messages);
  const typingUsers = useChatStore((state) => state.typingUsers);

  return (
    <div className="nc-message-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', overflowY: 'auto', flex: 1 }}>
      {messages.map((msg) => {
        const isMe = msg.senderId === 'me';
        return (
          <div key={msg.id} className={`nc-message ${isMe ? 'nc-message-out' : 'nc-message-in'}`} style={{
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            backgroundColor: isMe ? '#007aff' : '#f1f1f0',
            color: isMe ? 'white' : 'black',
            padding: '8px 12px',
            borderRadius: '12px',
            maxWidth: '80%',
            fontFamily: 'sans-serif',
            fontSize: '14px'
          }}>
            <div className="nc-message-content">{msg.content}</div>
            {msg.status === 'sending' && <small style={{ opacity: 0.5, fontSize: '10px', marginTop: '4px', display: 'block' }}>Отправка...</small>}
          </div>
        );
      })}
      
      {typingUsers.length > 0 && (
        <div className="nc-typing-indicator" style={{ alignSelf: 'flex-start', color: '#888', fontSize: '12px', fontFamily: 'sans-serif' }}>
          {typingUsers.map(u => u.name).join(', ')} печатает...
        </div>
      )}
    </div>
  );
};
