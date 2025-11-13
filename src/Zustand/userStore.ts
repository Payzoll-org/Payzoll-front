import { create } from "zustand";
import api from "../api/axiosInstance";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  loading: true,

  signup: async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("token", res.data.token);
    set({ user: res.data.user, token: res.data.token });
  },

  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    set({ user: res.data.user, token: res.data.token });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data.user });
    } catch {
      set({ user: null, token: null });
    } finally {
      set({ loading: false });
    }
  },
}));