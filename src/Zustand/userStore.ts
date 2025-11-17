// store/useAuthStore.ts
import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setSession: (payload: { user: User; accessToken: string }) => void;
  clearSession: () => void;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hasHydrated: false,
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setSession: ({ user, accessToken }) => {
    console.log("Authenticated user:", user);
    console.log("Access token:", accessToken);
    set({ user, accessToken });
  },
  clearSession: () => set({ user: null, accessToken: null }),
  markHydrated: () => set({ hasHydrated: true }),
}));