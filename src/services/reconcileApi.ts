import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface ReconcileRequest {
  receivableId: string;
  amount: string;
  bankAccountId: string;
}

export interface ReconciliationTimelineEvent {
  date: string;
  description: string;
}

export interface ReconciliationPreview {
  source_currency: string;
  destination_currency: string;
  receivable_id: string;
  payout_settlement_date: string;
  timezone: string;
  timeline: ReconciliationTimelineEvent[];
}

const ROUTES = API_ROUTES.reconcile;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function previewReconciliation(payload: ReconcileRequest): Promise<ReconciliationPreview> {
  const response = await http(ROUTES.preview, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.preview;
}

export async function submitReconciliation(payload: ReconcileRequest) {
  const response = await http(ROUTES.submit, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.receivable;
}
