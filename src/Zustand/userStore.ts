// store/useAuthStore.ts
import { create } from "zustand";
import type { TypeOfUser } from "../services/onboardingApi";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  kycVerified: boolean;
  userType: TypeOfUser | null;
  accountStatus?: string | null;
  stablecoinEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
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
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : state.user,
    })),
  setAccessToken: (accessToken) => set({ accessToken }),
  setSession: ({ user, accessToken }) => {
    set({ user, accessToken });
  },
  clearSession: () => set({ user: null, accessToken: null }),
  markHydrated: () => set({ hasHydrated: true }),
}));