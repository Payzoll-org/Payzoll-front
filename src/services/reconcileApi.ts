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
  return {
    receivable: data?.data?.receivable,
    reconcileEventId: data?.data?.reconcileEventId as string,
  };
}

/**
 * Fetches the FIRA certificate PDF as a blob and triggers a browser
 * download - a plain <a href> can't be used since the endpoint requires
 * the Authorization header the browser won't attach to a bare link click.
 */
export async function downloadFiraCertificate(reconcileEventId: string) {
  const response = await http(ROUTES.certificate(reconcileEventId), {
    method: "GET",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Failed to download FIRA certificate");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FIRA-Certificate-${reconcileEventId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
