import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface PayoutFeeRule {
  fixed: string;
  variable: string;
  minimum: string;
  destinationCurrency: string;
}

const ROUTES = API_ROUTES.feePlan;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

/**
 * The connected user's real payout fee rule (fixed + variable %) for a
 * given source currency, straight from their own activated XflowPay
 * FeePlan - not a guessed number.
 */
export async function getPayoutFeeRule(currency: string): Promise<PayoutFeeRule | null> {
  const response = await http(`${ROUTES.payoutFee}?currency=${encodeURIComponent(currency)}`, {
    method: "GET",
  });
  const data = await response.json();
  assertData(response, data);
  return data?.data?.rule ?? null;
}
