import React from 'react';
import { MessageList } from './MessageList';
import { MessageInput, MessageInputProps } from './MessageInput';

export interface ChatWidgetProps extends MessageInputProps {
  width?: string | number;
  height?: string | number;
}

export const ChatWidget = ({ token, conversationId, width = '100%', height = '500px' }: ChatWidgetProps) => {
  return (
    <div className="nc-chat-wrapper" style={{ width, height, display: 'flex', flexDirection: 'column', border: '1px solid #eaeaea', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <MessageList />
      <MessageInput conversationId={conversationId} token={token} />
    </div>
  );
};
