import React, { useState } from 'react';

export interface MessageInputProps {
  sendMessage: (content: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  accentColor?: string;
}

export const MessageInput = ({
  sendMessage,
  startTyping,
  stopTyping,
  accentColor,
}: MessageInputProps) => {
  const [text, setText] = useState('');

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
    <form
      onSubmit={handleSubmit}
      className="nc-message-input-form"
      style={{
        display: 'flex',
        gap: '8px',
        padding: '16px',
        borderTop: '1px solid var(--nc-border, #eee)',
      }}
    >
      <input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder="Введите сообщение..."
        style={{
          flex: 1,
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid var(--nc-border, #ddd)',
          fontSize: '14px',
          outline: 'none',
          fontFamily: 'var(--nc-font, sans-serif)',
        }}
      />
      <button
        type="submit"
        style={{
          padding: '10px 16px',
          borderRadius: '8px',
          backgroundColor: accentColor || 'var(--nc-accent, var(--nc-primary, #007aff))',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Отправить
      </button>
    </form>
  );
};
