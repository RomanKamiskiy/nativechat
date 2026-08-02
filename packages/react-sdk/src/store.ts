import { create } from 'zustand';
import { Message, User } from './types';

interface ChatStore {
  messages: Message[];
  typingUsers: User[];
  isConnected: boolean;
  currentUserId: string | null;

  // Actions
  setConnected: (status: boolean) => void;
  setCurrentUserId: (userId: string | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  updateMessageStatus: (id: string, status: Message['status']) => void;
  addTypingUser: (user: User) => void;
  removeTypingUser: (userId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  typingUsers: [],
  isConnected: false,
  currentUserId: null,

  setConnected: (status) => set({ isConnected: status }),
  setCurrentUserId: (userId) => set({ currentUserId: userId }),
  
  addMessage: (message) => set((state) => {
    if (state.messages.some((m) => m.id === message.id)) {
      return state;
    }

    // Когда приходит реальное сообщение — убираем optimistic "sending"
    const base =
      message.status === 'sending'
        ? state.messages
        : state.messages.filter(
            (m) => !(m.status === 'sending' && m.content === message.content)
          );

    return { messages: [...base, message] };
  }),
  
  setMessages: (messages) => set({ messages }),
  
  updateMessageStatus: (id, status) => set((state) => ({
    messages: state.messages.map((m) => 
      m.id === id ? { ...m, status } : m
    )
  })),
  
  addTypingUser: (user) => set((state) => {
    if (state.currentUserId && user.id === state.currentUserId) return state;
    if (state.typingUsers.some((u) => u.id === user.id)) return state;
    return { typingUsers: [...state.typingUsers, user] };
  }),
  
  removeTypingUser: (userId) => set((state) => ({
    typingUsers: state.typingUsers.filter((u) => u.id !== userId)
  })),
}));
