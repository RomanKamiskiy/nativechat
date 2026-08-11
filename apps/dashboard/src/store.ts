import { create } from 'zustand';

interface DashboardStore {
  conversations: any[];
  activeConversationId: string | null;
  messages: any[];
  setConversations: (conversations: any[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: any[]) => void;
  appendMessage: (message: any) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),
}));
