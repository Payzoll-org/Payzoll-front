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
  // Defaults true server-side for every account (Model/user.Model.js) -
  // Settings' "Two-Factor Authentication" toggle.
  twoFactorEnabled?: boolean;
  userType: TypeOfUser | null;
  accountStatus?: string | null;
  stablecoinEnabled?: boolean;
  // Raw XflowPay capability status ("verifying", "activated", etc.) -
  // stablecoinEnabled alone can't distinguish "never requested" from
  // "requested, pending XflowPay's own review".
  stablecoinStatus?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  hasHydrated: boolean;
  // Bumped on every real session change (login, OTP, logout) - a background
  // token refresh (lib/httpClient.ts's performRefresh) captures this when it
  // starts and checks it again before writing its result, so a refresh that
  // was already in flight when the user logged in doesn't later overwrite
  // or clear the newer session it knows nothing about.
  sessionGeneration: number;
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
  sessionGeneration: 0,
  setUser: (user) => set({ user }),
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : state.user,
    })),
  setAccessToken: (accessToken) => set({ accessToken }),
  setSession: ({ user, accessToken }) => {
    set((state) => ({ user, accessToken, sessionGeneration: state.sessionGeneration + 1 }));
  },
  clearSession: () =>
    set((state) => ({ user: null, accessToken: null, sessionGeneration: state.sessionGeneration + 1 })),
  markHydrated: () => set({ hasHydrated: true }),
}));