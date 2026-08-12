import React, { useState } from 'react';

export interface MessageInputProps {
  sendMessage: (content: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  accentColor?: string;
  /** Reserved for future token gates — forced false for local E2E */
  isOutOfTokens?: boolean;
}

export const MessageInput = ({
  sendMessage,
  startTyping,
  stopTyping,
  accentColor,
  isOutOfTokens = false,
}: MessageInputProps) => {
  const [text, setText] = useState('');

  // TEMP: local E2E — never disable the composer due to token balance
  const disabled = false; // was: Boolean(isOutOfTokens)
  void isOutOfTokens;

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
    if (disabled) return;
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
        disabled={false}
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
        disabled={false}
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
