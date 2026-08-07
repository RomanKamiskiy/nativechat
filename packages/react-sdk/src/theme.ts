import type { CSSProperties } from 'react';

export interface ThemeTokens {
  brandName: string;
  primary: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  radius: string;
  fontFamily: string;
  userBubble: string;
  agentBubble: string;
}

export const DEFAULT_THEME: ThemeTokens = {
  brandName: 'NativeChat',
  primary: '#007aff',
  background: '#f4f6f8',
  surface: '#ffffff',
  text: '#14181f',
  mutedText: '#5c6672',
  border: '#e2e6eb',
  radius: '12px',
  fontFamily: 'sans-serif',
  userBubble: '#007aff',
  agentBubble: '#f1f1f0',
};

export function themeToCssVars(theme: ThemeTokens): CSSProperties {
  return {
    ['--nc-primary' as string]: theme.primary,
    ['--nc-bg' as string]: theme.background,
    ['--nc-surface' as string]: theme.surface,
    ['--nc-text' as string]: theme.text,
    ['--nc-muted' as string]: theme.mutedText,
    ['--nc-border' as string]: theme.border,
    ['--nc-radius' as string]: theme.radius,
    ['--nc-font' as string]: theme.fontFamily,
    ['--nc-user-bubble' as string]: theme.userBubble,
    ['--nc-agent-bubble' as string]: theme.agentBubble,
  };
}
