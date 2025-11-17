import { http, refreshSession } from "../lib/httpClient";
import type { User } from "../Zustand/userStore";
import { useAuthStore} from "../Zustand/userStore";

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface VerifyOtpPayload {
  email: string;
  otp: string;
}

interface ResendOtpPayload {
  email: string;
}

const AUTH_BASE = "/api/auth";

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message = data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function registerUser(payload: RegisterPayload) {
  const response = await http(`${AUTH_BASE}/register`, {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data;
}

export async function verifyOtp(payload: VerifyOtpPayload) {
  const response = await http(`${AUTH_BASE}/verify-otp`, {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);

  const { setSession } = useAuthStore.getState();
  const user: User = data?.data?.user;
  const accessToken: string = data?.data?.accessToken;

  if (user && accessToken) {
    setSession({ user, accessToken });
  }

  return data;
}

export async function resendOtp(payload: ResendOtpPayload) {
  const response = await http(`${AUTH_BASE}/resend-otp`, {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data;
}

export async function loginUser(payload: LoginPayload) {
  const response = await http(`${AUTH_BASE}/login`, {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);

  const { setSession } = useAuthStore.getState();
  const user: User = data?.data?.user;
  const accessToken: string = data?.data?.accessToken;

  if (user && accessToken) {
    setSession({ user, accessToken });
  }

  return data;
}

export async function logoutUser() {
  await http(`${AUTH_BASE}/logout`, {
    method: "POST",
  });
  useAuthStore.getState().clearSession();
}

export async function logoutAllSessions() {
  await http(`${AUTH_BASE}/logout-all`, {
    method: "POST",
  });
  useAuthStore.getState().clearSession();
}

export async function getActiveSessions() {
  const response = await http(`${AUTH_BASE}/sessions`, {
    method: "GET",
  });
  const data = await response.json();
  assertData(response, data);
  return data?.data || [];
}

export async function revokeSession(sessionId: string) {
  const response = await http(`${AUTH_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  const data = await response.json();
  assertData(response, data);
  return data;
}

export async function bootstrapSession() {
  const { markHydrated, clearSession } = useAuthStore.getState();
  try {
    const token = await refreshSession(true);
    if (!token) {
      clearSession();
    }
  } catch (error) {
    clearSession();
  } finally {
    markHydrated();
  }
}

