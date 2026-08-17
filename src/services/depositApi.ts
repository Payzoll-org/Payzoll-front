import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface Deposit {
  id: string;
  created: number;
  currency: string;
  amount: string;
  net_amount: string;
  payment_method: string | null;
  statement_descriptor: string | null;
  status: string;
}

// api-reference.md "The Deposit object" -> payment_method enum
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  domestic_credit: "ACH",
  domestic_debit: "ACH Debit",
  domestic_fast_credit: "Fast ACH",
  domestic_wire: "Fedwire",
  global_wire: "SWIFT",
  check: "Check",
  affirm: "Affirm",
  afterpay: "Afterpay",
  klarna: "Klarna",
};

const ROUTES = API_ROUTES.deposit;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function getDeposits(params: { limit?: number; startingAfter?: string } = {}) {
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
    deposits: (data?.data?.deposits || []) as Deposit[],
    hasNext: !!data?.data?.hasNext,
  };
}
