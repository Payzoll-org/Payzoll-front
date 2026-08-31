import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface Payout {
  id: string;
  created: number;
  arrivalDate: number | null;
  status: string;
  settledAmount: string | null;
  settledCurrency: string | null;
  grossAmount: string | null;
  grossCurrency: string | null;
}

export interface PayoutTrackerStep {
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface PayoutReceivableBreakdown {
  receivableId: string;
  reconcileDate: number | null;
  invoiceNumber: string | null;
  invoiceDescription: string | null;
  amount: string | null;
  currency: string | null;
  partnerName: string | null;
  purposeCode: string | null;
  purposeCodeDescription: string | null;
}

export interface PayoutBankInfo {
  label: string;
  last4: string | null;
}

export interface PayoutDetail {
  id: string;
  created: number;
  arrivalDate: number | null;
  status: string;
  trackingInfo: string | null;
  livemode: boolean;
  settledAmount: string | null;
  settledCurrency: string | null;
  statementDescriptor: string | null;
  utr: string | null;
  hasPaymentAdvice: boolean;
  grossAmount: string | null;
  feesAmount: string | null;
  netAmount: string | null;
  breakdownCurrency: string | null;
  exchangeRate: string | null;
  bankInfo: PayoutBankInfo | null;
  receivables: PayoutReceivableBreakdown[];
  tracker: PayoutTrackerStep[];
}

const ROUTES = API_ROUTES.payout;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function getPayouts(params: { limit?: number; startingAfter?: string } = {}) {
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
    payouts: (data?.data?.payouts || []) as Payout[],
    hasNext: !!data?.data?.hasNext,
  };
}

export async function getPayoutDetail(payoutId: string) {
  const response = await http(ROUTES.detail(payoutId), { method: "GET" });
  const data = await response.json();
  assertData(response, data);
  return data?.data?.payout as PayoutDetail;
}

/**
 * The Payment Advice download route is authenticated (Bearer token), so a
 * plain `<a href>` can't carry the required header - fetch the bytes
 * through the same http() client every other authenticated request uses,
 * then trigger a client-side save.
 */
// A 25MB cap - a real PDF payment advice is a few pages at most; a runaway
// or unexpected body this large is itself a sign something's wrong, same
// ceiling HelpSupportModal already uses for attachments.
const MAX_PAYMENT_ADVICE_BYTES = 25 * 1024 * 1024;

export async function downloadPaymentAdvice(payoutId: string) {
  const response = await http(ROUTES.paymentAdvice(payoutId), { method: "GET" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Failed to download payment advice");
  }

  // A 200 response isn't proof the body is actually a PDF - a proxy/gateway
  // error page, or a misconfigured endpoint, can still return 200 with an
  // unexpected body. Without this check, that body would be saved to disk
  // under a hardcoded .pdf name regardless of what it actually contains,
  // and the OS would try to open it as a PDF.
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/pdf")) {
    throw new Error("The server didn't return a valid PDF for this payment advice.");
  }

  const contentLength = Number(response.headers.get("Content-Length"));
  if (contentLength && contentLength > MAX_PAYMENT_ADVICE_BYTES) {
    throw new Error("The payment advice file is larger than expected.");
  }

  const blob = await response.blob();
  if (blob.size > MAX_PAYMENT_ADVICE_BYTES) {
    throw new Error("The payment advice file is larger than expected.");
  }

  // Prefer the server's own filename (Content-Disposition: attachment;
  // filename="...") when present, falling back to a constructed one.
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `payment-advice-${payoutId}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
