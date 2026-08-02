import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../store';

export interface UseChatConfig {
  token: string;
  conversationId: string;
  wsUrl?: string;
  apiUrl?: string;
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
    addTypingUser, removeTypingUser
  } = useChatStore();

  // 1. Загрузка истории сообщений при старте
  useEffect(() => {
    fetch(`${apiUrl}/api/conversations/${conversationId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages);
        }
      })
      .catch(console.error);
  }, [conversationId, apiUrl, setMessages]);

  // 2. Управление WebSocket соединением
  useEffect(() => {
    const ws = new WebSocket(`${wsUrl}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        type: 'join_room',
        payload: { conversationId }
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'new_message':
          addMessage(data.payload);
          break;
        case 'typing_start':
          addTypingUser(data.payload);
          break;
        case 'typing_stop':
          removeTypingUser(data.payload.userId);
          break;
      }
    };

    ws.onclose = () => setConnected(false);

    return () => {
      ws.close();
    };
  }, [token, conversationId, wsUrl, setConnected, addMessage, addTypingUser, removeTypingUser]);

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
