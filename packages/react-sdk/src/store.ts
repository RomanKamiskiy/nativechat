import { create } from 'zustand';
import { Message, User } from './types';

interface ChatStore {
  messages: Message[];
  typingUsers: User[];
  isConnected: boolean;

  // Actions
  setConnected: (status: boolean) => void;
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

  setConnected: (status) => set({ isConnected: status }),
  
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  
  setMessages: (messages) => set({ messages }),
  
  updateMessageStatus: (id, status) => set((state) => ({
    messages: state.messages.map((m) => 
      m.id === id ? { ...m, status } : m
    )
  })),
  
  addTypingUser: (user) => set((state) => {
    if (state.typingUsers.some((u) => u.id === user.id)) return state;
    return { typingUsers: [...state.typingUsers, user] };
  }),
  
  removeTypingUser: (userId) => set((state) => ({
    typingUsers: state.typingUsers.filter((u) => u.id !== userId)
  })),
}));
