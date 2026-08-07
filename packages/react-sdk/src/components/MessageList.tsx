import React from 'react';
import { useChatStore } from '../store';
import { PricingCard } from './cards/PricingCard';
import { NativiqAction } from '../types';

export interface MessageListProps {
  onAction?: (action: NativiqAction) => void;
}

export const MessageList = ({ onAction }: MessageListProps) => {
  const messages = useChatStore((state) => state.messages);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const currentUserId = useChatStore((state) => state.currentUserId);

  return (
    <div className="nc-message-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', overflowY: 'auto', flex: 1 }}>
      {messages.map((msg) => {
        const isMe = msg.senderId === 'me' || (!!currentUserId && msg.senderId === currentUserId);
        
        // Рендер кастомной карточки
        if (msg.type === 'pricing_card') {
          return (
            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
              <PricingCard metadata={msg.metadata || {}} onAction={onAction} />
            </div>
          );
        }

        // Стандартный текстовый рендер
        return (
          <div key={msg.id} className={`nc-message ${isMe ? 'nc-message-out' : 'nc-message-in'}`} style={{
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            backgroundColor: isMe ? 'var(--nc-user-bubble, #007aff)' : 'var(--nc-agent-bubble, #f1f1f0)',
            color: isMe ? 'white' : 'var(--nc-text, black)',
            padding: '8px 12px',
            borderRadius: 'var(--nc-radius, 12px)',
            maxWidth: '80%',
            fontFamily: 'var(--nc-font, sans-serif)',
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
