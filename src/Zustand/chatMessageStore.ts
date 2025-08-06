import { create } from 'zustand';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  session_id: string | null;
}

interface Session {
  sessionId: string;
  createdAt: string;
}

interface ChatStore {
  messages: Message[];
  sessions: Session[];
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  addSession: (session: Session) => void;
  setSessions: (sessions: Session[]) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  sessions: [],

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
    })),

  setSessions: (sessions) => set({ sessions }),
}));