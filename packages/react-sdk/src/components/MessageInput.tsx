import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';

export interface MessageInputProps {
  token: string;
  conversationId: string;
}

export const MessageInput = ({ token, conversationId }: MessageInputProps) => {
  const [text, setText] = useState('');
  const { sendMessage, startTyping, stopTyping } = useChat({ token, conversationId });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (e.target.value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(text.trim());
      setText('');
      stopTyping();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="nc-message-input-form" style={{ display: 'flex', gap: '8px', padding: '16px', borderTop: '1px solid #eee' }}>
      <input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder="Введите сообщение..."
        style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
      />
      <button type="submit" style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#007aff', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
        Отправить
      </button>
    </form>
  );
};
