import React from 'react';
import { useChatStore } from '../store';
import { PricingCard } from './cards/PricingCard';
import { NativiqAction } from '../types';

const UI_PRICING_CARD_TAG = '[UI:PRICING_CARD]';

const DEFAULT_PRICING_META = {
  title: 'Pro',
  price: 99,
  features: ['Безлимит чатов', 'AI Ассистент', 'Custom UI Карточки'],
};

export interface MessageListProps {
  onAction?: (action: NativiqAction) => void;
  accentColor?: string;
}

function parseUiPricingTag(content: string): {
  hasPricingCard: boolean;
  cleanText: string;
} {
  const hasPricingCard = content.includes(UI_PRICING_CARD_TAG);
  const cleanText = content.replace(/\[UI:PRICING_CARD\]/g, '').trim();
  return { hasPricingCard, cleanText };
}

export const MessageList = ({ onAction, accentColor }: MessageListProps) => {
  const messages = useChatStore((state) => state.messages);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const currentUserId = useChatStore((state) => state.currentUserId);

  return (
    <div
      className="nc-message-list"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        overflowY: 'auto',
        flex: 1,
      }}
    >
      {messages.map((msg) => {
        const isMe =
          msg.senderId === 'me' ||
          (!!currentUserId && msg.senderId === currentUserId);

        if (msg.type === 'pricing_card') {
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                marginBottom: '8px',
              }}
            >
              <PricingCard
                metadata={{ ...DEFAULT_PRICING_META, ...(msg.metadata || {}) }}
                onAction={onAction}
                accentColor={accentColor}
              />
            </div>
          );
        }

        const { hasPricingCard, cleanText } = parseUiPricingTag(msg.content || '');
        const pricingMeta = {
          ...DEFAULT_PRICING_META,
          ...(msg.metadata || {}),
        };

        return (
          <div
            key={msg.id}
            className={`nc-message ${isMe ? 'nc-message-out' : 'nc-message-in'}`}
            style={{
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              backgroundColor: isMe
                ? accentColor || 'var(--nc-user-bubble, var(--nc-accent, #007aff))'
                : 'var(--nc-agent-bubble, #f1f1f0)',
              color: isMe ? 'white' : 'var(--nc-text, black)',
              padding: '8px 12px',
              borderRadius: 'var(--nc-radius, 12px)',
              maxWidth: '80%',
              fontFamily: 'var(--nc-font, sans-serif)',
              fontSize: '14px',
            }}
          >
            {cleanText ? <div className="nc-message-content">{cleanText}</div> : null}

            {hasPricingCard && (
              <div style={{ marginTop: cleanText ? 12 : 0 }}>
                <PricingCard
                  metadata={pricingMeta}
                  onAction={onAction}
                  accentColor={accentColor}
                />
              </div>
            )}

            {msg.status === 'sending' && (
              <small
                style={{
                  opacity: 0.5,
                  fontSize: '10px',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                Отправка...
              </small>
            )}
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div
          className="nc-typing-indicator"
          style={{
            alignSelf: 'flex-start',
            color: '#888',
            fontSize: '12px',
            fontFamily: 'sans-serif',
          }}
        >
          {typingUsers.map((u) => u.name).join(', ')} печатает...
        </div>
      )}
    </div>
  );
};
