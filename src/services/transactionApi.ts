import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface TransactionAmount {
  amount: string;
  currency: string;
}

export interface Transaction {
  id: string;
  created: number;
  type: string;
  from: TransactionAmount;
  to: TransactionAmount;
  linked_object: string | null;
  linked_id: string | null;
  is_exchange_rate_applicable: boolean;
}

// api-reference.md "Payments" -> type enum. Plain-language labels for what
// each payment type actually represents.
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  adjustment_negative: "Balance adjustment (debit)",
  adjustment_positive: "Balance adjustment (credit)",
  deposit_reversal: "Deposit reversed",
  fee_advance_debit: "Fee advance debit",
  funds_credit: "Funds received",
  funds_debit: "Reconciled to payout",
  fx_fee: "FX fee",
  payout: "Payout sent",
  payout_failure: "Payout failed - funds returned",
  payout_fee: "Payout fee",
  platform_currency_credit: "Currency balance credit",
  platform_currency_debit: "Currency balance debit",
  platform_partner_debit: "Platform partner debit",
  processing_fee: "Processing fee",
  quote_lock_live_booking_fx_fee: "Live FX booking fee",
  reconcile: "Reconciled",
  reconcile_paypal: "Reconciled via PayPal",
  transfer: "Transfer",
};

const ROUTES = API_ROUTES.transaction;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function getTransactions(params: { limit?: number; startingAfter?: string } = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.startingAfter) query.set("startingAfter", params.startingAfter);
  const queryString = query.toString();

  const response = await http(`${ROUTES.list}${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);
  return {
    transactions: (data?.data?.transactions || []) as Transaction[],
    hasNext: !!data?.data?.hasNext,
  };
}
