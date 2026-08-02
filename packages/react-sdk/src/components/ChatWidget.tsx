import React from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChat } from '../hooks/useChat';
import { NativiqAction } from '../types';

export interface ChatWidgetProps {
  token: string;
  conversationId: string;
  width?: string | number;
  height?: string | number;
  onAction?: (action: NativiqAction) => void;
}

export const ChatWidget = ({ token, conversationId, width = '100%', height = '500px', onAction }: ChatWidgetProps) => {
  const { sendMessage, startTyping, stopTyping } = useChat({ token, conversationId });

  return (
    <div className="nc-chat-wrapper" style={{ width, height, display: 'flex', flexDirection: 'column', border: '1px solid #eaeaea', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <MessageList onAction={onAction} />
      <MessageInput
        sendMessage={sendMessage}
        startTyping={startTyping}
        stopTyping={stopTyping}
      />
    </div>
  );
};
