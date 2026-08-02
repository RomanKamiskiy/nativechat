import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../store';

export interface UseChatConfig {
  token: string;
  conversationId: string;
  wsUrl?: string;
  apiUrl?: string;
}

function decodeJwtPayload(token: string): { userId?: string; name?: string } | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export const useChat = ({ 
  token, 
  conversationId, 
  wsUrl = 'ws://localhost:3001', 
  apiUrl = 'http://localhost:3001' 
}: UseChatConfig) => {
  const wsRef = useRef<WebSocket | null>(null);
  
  const { 
    messages, typingUsers, isConnected,
    setConnected, setMessages, addMessage, 
    addTypingUser, removeTypingUser, setCurrentUserId
  } = useChatStore();

  useEffect(() => {
    const payload = decodeJwtPayload(token);
    setCurrentUserId(payload?.userId ?? null);
  }, [token, setCurrentUserId]);

  const loadHistory = useCallback(() => {
    fetch(`${apiUrl}/api/conversations/${conversationId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages);
        }
      })
      .catch(console.error);
  }, [apiUrl, conversationId, setMessages]);

  // 1. Загрузка истории сообщений при старте
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 2. Управление WebSocket соединением + reconnect
  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = () => {
      if (disposed) return;

      const ws = new WebSocket(`${wsUrl}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
        ws.send(JSON.stringify({
          type: 'join_room',
          payload: { conversationId }
        }));
        // После реконнекта подтягиваем историю
        loadHistory();
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'new_message':
            addMessage(data.payload);
            break;
          case 'typing_start':
            addTypingUser({
              id: data.payload.userId,
              name: data.payload.name,
            });
            break;
          case 'typing_stop':
            removeTypingUser(data.payload.userId);
            break;
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (disposed) return;

        const delay = Math.min(1000 * 2 ** attempt, 10000);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [token, conversationId, wsUrl, setConnected, addMessage, addTypingUser, removeTypingUser, loadHistory]);

  // 3. Методы для отправки данных (с Optimistic UI)
  const sendMessage = useCallback((content: string) => {
    const tempId = `temp_${Date.now()}`;
    addMessage({
      id: tempId,
      content,
      senderId: 'me', // Заменится реальным с бэкенда
      createdAt: new Date().toISOString(),
      type: 'text',
      status: 'sending'
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_message',
        payload: { content }
      }));
    }
  }, [addMessage]);

  const startTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing_start' }));
    }
  }, []);

  const stopTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing_stop' }));
    }
  }, []);

  return {
    messages,
    typingUsers,
    isConnected,
    sendMessage,
    startTyping,
    stopTyping
  };
};
