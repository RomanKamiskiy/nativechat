import { create } from 'zustand';

interface DashboardStore {
  conversations: any[];
  activeConversationId: string | null;
  messages: any[];
  setConversations: (conversations: any[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: any[]) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
}));
