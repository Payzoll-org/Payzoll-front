import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface LiveRate {
  currencyPair: string;
  midMarket: string;
  userRate: string;
  validFrom: number;
  validTo: number;
  fetchedAt: string;
}

export interface RateHistoryPoint {
  midMarket: string;
  userRate: string;
  fetchedAt: string;
}

const ROUTES = API_ROUTES.fxRate;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

/**
 * A live indicative quote from XflowPay's own Quotes endpoint - the actual
 * rate a reconciliation would use, not a third-party FX feed.
 */
export async function getLiveRate(): Promise<LiveRate> {
  const response = await http(ROUTES.live, { method: "GET" });
  const data = await response.json();
  assertData(response, data);
  return data?.data?.rate;
}

/**
 * Real rate snapshots recorded over time (Services/fxRate.service.js) -
 * never synthesized. Can be short or empty until enough usage accumulates.
 */
export async function getRateHistory(limit = 50): Promise<RateHistoryPoint[]> {
  const response = await http(`${ROUTES.history}?limit=${limit}`, { method: "GET" });
  const data = await response.json();
  assertData(response, data);
  return data?.data?.history || [];
}
