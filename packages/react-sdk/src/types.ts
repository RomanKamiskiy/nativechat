export interface User {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender?: User;
  createdAt: string | Date;
  type: string;
  status?: 'sending' | 'sent' | 'error'; // Для Optimistic UI
}
