import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { AgentSelector, AgentConfigPublic } from './AgentSelector';
import { useChat } from '../hooks/useChat';
import { NativiqAction } from '../types';

export interface ChatWidgetProps {
  token: string;
  conversationId: string;
  /** Project UUID — required to show / persist agent selection */
  projectId?: string;
  /** Initial agent config from /api/auth/token */
  agent?: AgentConfigPublic | null;
  apiUrl?: string;
  width?: string | number;
  height?: string | number;
  /** Show agent picker (free GPT Mini vs own MCP agent) */
  showAgentSelector?: boolean;
  onAction?: (action: NativiqAction) => void;
  onAgentChange?: (agent: AgentConfigPublic) => void;
}

export const ChatWidget = ({
  token,
  conversationId,
  projectId,
  agent: initialAgent = null,
  apiUrl = 'http://localhost:3001',
  width = '100%',
  height = '500px',
  showAgentSelector = true,
  onAction,
  onAgentChange,
}: ChatWidgetProps) => {
  const { sendMessage, startTyping, stopTyping } = useChat({ token, conversationId, apiUrl });
  const [agent, setAgent] = useState<AgentConfigPublic | null>(initialAgent);

  return (
    <div
      className="nc-chat-wrapper"
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #eaeaea',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
    >
      {showAgentSelector && projectId && (
        <AgentSelector
          projectId={projectId}
          apiUrl={apiUrl}
          agent={agent}
          onAgentChange={(next) => {
            setAgent(next);
            onAgentChange?.(next);
          }}
        />
      )}
      <MessageList onAction={onAction} />
      <MessageInput
        sendMessage={sendMessage}
        startTyping={startTyping}
        stopTyping={stopTyping}
      />
    </div>
  );
};
