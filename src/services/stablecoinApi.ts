import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

const ROUTES = API_ROUTES.stablecoin;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

/**
 * Step 1: get the Bridge ToS URL to embed in an iframe.
 */
export async function startStablecoinTos() {
  const response = await http(ROUTES.start, {
    method: "POST",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.url as string;
}

export interface AcceptStablecoinTosResult {
  account: unknown;
  // true when base account activation hasn't finished XflowPay's review
  // yet - the ToS acceptance is saved and the stablecoin capability gets
  // requested automatically once account.status.activated actually fires,
  // rather than right now.
  deferred: boolean;
}

/**
 * Step 2: complete acceptance with the token captured from the redirect.
 */
export async function acceptStablecoinTos(token: string): Promise<AcceptStablecoinTosResult> {
  const response = await http(ROUTES.accept, {
    method: "POST",
    body: JSON.stringify({ token }),
  });

  const data = await response.json();
  assertData(response, data);
  return { account: data?.data?.account, deferred: !!data?.data?.deferred };
}
