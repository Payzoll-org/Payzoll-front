import { create } from 'zustand';

interface PromptStore {
  prompt: string;
  setPrompt: (newPrompt: string) => void;
  clearPrompt: () => void;
}

export const usePromptStore = create<PromptStore>((set) => ({
  prompt: '',
  setPrompt: (newPrompt) => set({ prompt: newPrompt }),
  clearPrompt: () => set({ prompt: '' }),
}));