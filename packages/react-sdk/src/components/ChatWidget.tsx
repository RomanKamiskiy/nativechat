import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { AgentSelector, AgentConfigPublic } from './AgentSelector';
import { SetupPanel, SetupBudgetPublic } from './SetupPanel';
import { useChat } from '../hooks/useChat';
import { NativiqAction } from '../types';
import { DEFAULT_THEME, ThemeTokens, themeToCssVars } from '../theme';

export interface ChatWidgetProps {
  token: string;
  conversationId: string;
  /** Project UUID — required to show / persist agent selection */
  projectId?: string;
  /** Initial agent config from /api/auth/token */
  agent?: AgentConfigPublic | null;
  /** Setup-token budget + auto-tune state */
  setup?: SetupBudgetPublic | null;
  apiUrl?: string;
  width?: string | number;
  height?: string | number;
  /** Show one-shot product auto-tune (spends limited setup tokens) */
  showSetupPanel?: boolean;
  /** Show agent picker (free GPT Mini vs own MCP agent) */
  showAgentSelector?: boolean;
  onAction?: (action: NativiqAction) => void;
  onAgentChange?: (agent: AgentConfigPublic) => void;
  onSetupComplete?: (setup: SetupBudgetPublic) => void;
}

export const ChatWidget = ({
  token,
  conversationId,
  projectId,
  agent: initialAgent = null,
  setup: initialSetup = null,
  apiUrl = 'http://localhost:3001',
  width = '100%',
  height = '500px',
  showSetupPanel = true,
  showAgentSelector = true,
  onAction,
  onAgentChange,
  onSetupComplete,
}: ChatWidgetProps) => {
  const { sendMessage, startTyping, stopTyping } = useChat({ token, conversationId, apiUrl });
  const [agent, setAgent] = useState<AgentConfigPublic | null>(initialAgent);
  const [setup, setSetup] = useState<SetupBudgetPublic | null>(initialSetup);
  const theme: ThemeTokens = setup?.themeTokens || DEFAULT_THEME;

  return (
    <div
      className="nc-chat-wrapper"
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        overflow: 'hidden',
        backgroundColor: theme.surface,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        fontFamily: theme.fontFamily,
        color: theme.text,
        ...themeToCssVars(theme),
      }}
    >
      {showSetupPanel && projectId && (
        <SetupPanel
          projectId={projectId}
          apiUrl={apiUrl}
          setup={setup}
          onSetupComplete={(next) => {
            setSetup(next);
            onSetupComplete?.(next);
          }}
        />
      )}
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
      {setup?.welcomeMessage && setup.completed && (
        <div
          style={{
            padding: '8px 14px',
            fontSize: 12,
            color: theme.mutedText,
            background: theme.background,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          {setup.welcomeMessage}
        </div>
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
