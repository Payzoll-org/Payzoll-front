import { useAuthStore } from "../Zustand/userStore";
import { getApiBase } from "../config/apiConfig";
import type { ApiService } from "../config/apiConfig";

interface HttpOptions extends RequestInit {
  auth?: boolean;
  retry?: boolean;
  service?: ApiService;
}



export async function http(
  path: string,
  options: HttpOptions = {}
): Promise<Response> {
  const { auth = true, retry, service = "auth", ...rest } = options;
  const { accessToken } = useAuthStore.getState();

  const headers = new Headers(rest.headers || {});
  if (!(rest.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBase(service)}${path}`, {
    ...rest,
    headers,
    credentials: "include",
  });

  if (auth && response.status === 401 && !retry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return http(path, { ...options, retry: true });
    }
  }

  return response;
}

let refreshPromise: Promise<string | null> | null = null;

export function refreshSession(
  fetchProfile: boolean = false
): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh(fetchProfile).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}


async function performRefresh(fetchProfile: boolean): Promise<string | null> {
  const { setAccessToken, setUser, clearSession } = useAuthStore.getState();

  try {
    const response = await fetch(`${getApiBase("auth")}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const data = await response.json();
    const accessToken = data?.data?.accessToken;
    const nextUser = data?.data?.user;

    if (!accessToken) {
      throw new Error("Missing access token");
    }

    setAccessToken(accessToken);
    if (nextUser) {
      setUser(nextUser);
    } else if (fetchProfile || !useAuthStore.getState().user) {
      await fetchCurrentUser();
    }

    return accessToken;
  } catch (error) {
    clearSession();
    return null;
  }
}


async function fetchCurrentUser() {
  const { setUser, accessToken, clearSession } = useAuthStore.getState();

  if (!accessToken) return null;

  try {
    const response = await fetch(`${getApiBase("auth")}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
      }
      return null;
    }

    const data = await response.json();
    const user = data?.data?.user || data?.data;
    if (user) {
      setUser(user);
    }
    return user;
  } catch (error) {
    return null;
  }
}

