import { http, refreshSession } from "../lib/httpClient";
import type { User } from "../Zustand/userStore";
import { useAuthStore} from "../Zustand/userStore";
import { API_ROUTES } from "../config/apiConfig";

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

interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

const ROUTES = API_ROUTES.auth;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    // Validation failures put the actual specific reason(s) in `errors`
    // (an array) - `message` on those responses is just the generic
    // "Validation failed" wrapper, which told the user nothing about what
    // was actually wrong (e.g. why their password was rejected).
    const message =
      (Array.isArray(data?.errors) && data.errors.length > 0 ? data.errors.join(" ") : null) ||
      data?.message ||
      data?.error ||
      "Request failed";
    throw new Error(message);
  }
}

export async function registerUser(payload: RegisterPayload) {
  const response = await http(ROUTES.register, {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data;
}

export async function verifyOtp(payload: VerifyOtpPayload) {
  const response = await http(ROUTES.verifyOtp, {
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
  const response = await http(ROUTES.resendOtp, {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data;
}

export async function loginUser(payload: LoginPayload) {
  const response = await http(ROUTES.login, {
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

/**
 * Sends a password reset OTP to the given email - reused here for the
 * logged-in "Change Password" flow in Settings (send a code to your own
 * email, then confirm it via resetPassword below), since the backend has
 * no separate "change password while authenticated" endpoint.
 */
export async function requestPasswordReset(email: string) {
  const response = await http(ROUTES.forgotPassword, {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  assertData(response, data);
  return data;
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const response = await http(ROUTES.resetPassword, {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);

  // Backend now logs the user straight in on their new password (same
  // shape as loginUser's response) - set the session here too so a
  // successful reset lands the caller in the app immediately instead of
  // back at a login form they'd just have to fill in again.
  const { setSession } = useAuthStore.getState();
  const user: User = data?.data?.user;
  const accessToken: string = data?.data?.accessToken;

  if (user && accessToken) {
    setSession({ user, accessToken });
  }

  return data;
}

/**
 * Sends a login-verification OTP - only for accounts the backend has
 * flagged needsPasswordRecovery (an unknown/randomly-generated password
 * from a restore). Never changes the password, unlike
 * requestPasswordReset/resetPassword above.
 */
export async function requestLoginRecovery(email: string) {
  const response = await http(ROUTES.loginRecoverySend, {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  assertData(response, data);
  return data;
}

export async function verifyLoginRecovery(email: string, otp: string) {
  const response = await http(ROUTES.loginRecoveryVerify, {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, otp }),
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

/**
 * Toggle Two-Factor Authentication (Settings' "Two-Factor Authentication"
 * row) - authenticated, doesn't touch the password.
 */
export async function updateTwoFactor(enabled: boolean) {
  const response = await http(ROUTES.twoFactor, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });

  const data = await response.json();
  assertData(response, data);

  const { updateUser } = useAuthStore.getState();
  const user: User = data?.data?.user;
  if (user) {
    updateUser(user);
  }

  return data;
}

// Clearing the local session must never depend on the server call
// succeeding - if the request itself fails (network loss, endpoint
// unavailable), the old code exited before clearSession() ran at all,
// leaving the browser fully authenticated even though the user believed
// they'd logged out (both callers navigate to /auth in a finally
// regardless, so nothing else surfaced the failure). Remote revocation is
// now best-effort: attempted, but the local session always clears either
// way, and a failure is reported back to the caller to show separately.
export async function logoutUser() {
  try {
    await http(ROUTES.logout, { method: "POST" });
  } catch (error) {
    console.error("Logout request failed (session cleared locally anyway):", error);
    useAuthStore.getState().clearSession();
    throw error;
  }
  useAuthStore.getState().clearSession();
}

export async function logoutAllSessions() {
  try {
    await http(ROUTES.logoutAll, { method: "POST" });
  } catch (error) {
    console.error("Logout-all request failed (session cleared locally anyway):", error);
    useAuthStore.getState().clearSession();
    throw error;
  }
  useAuthStore.getState().clearSession();
}

export async function getActiveSessions() {
  const response = await http(ROUTES.sessions, {
    method: "GET",
  });
  const data = await response.json();
  assertData(response, data);
  return data?.data || [];
}

export async function revokeSession(sessionId: string) {
  const response = await http(ROUTES.revokeSession(sessionId), {
    method: "DELETE",
  });
  const data = await response.json();
  assertData(response, data);
  return data;
}

/**
 * Re-fetches the authenticated user from the backend and syncs the store.
 * kycVerified only ever changes server-side, driven by the real
 * account.status.activated XflowPay webhook (Services/webhook.service.js)
 * - this is how the frontend picks that up without a full reload.
 */
export async function refreshCurrentUser() {
  const response = await http(ROUTES.me, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);

  const user: User = data?.data?.user;
  if (user) {
    useAuthStore.getState().setUser(user);
  }

  return user;
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

