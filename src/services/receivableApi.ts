import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface ReceivablePayload {
  partnerId: string;
  transactionType: string;
  purposeCode: string;
  invoiceNumber: string;
  description?: string;
  invoiceAmount: string;
  currency: string;
  amountMaximumReconcilable: string;
  invoiceDate: string;
  dueDate?: string;
  metadata?: Record<string, string>;
}

export interface Receivable {
  _id: string;
  xflowReceivableId: string;
  partner: string;
  transactionType: string;
  purposeCode: string;
  purposeCodeDescription: string | null;
  description: string | null;
  currency: string;
  amountMaximumReconcilable: string;
  invoice: {
    referenceNumber: string | null;
    amount: string | null;
    currency: string | null;
    creationDate: string | null;
    dueDate: string | null;
  };
  status: string;
  createdAt: string;
}

// api-reference.md "The Receivable object" -> transaction_type enum
export const TRANSACTION_TYPE_OPTIONS = [
  { value: "goods", label: "Goods" },
  { value: "services", label: "Services" },
  { value: "software", label: "Software" },
];

const ROUTES = API_ROUTES.receivable;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function createReceivable(payload: ReceivablePayload, invoiceDocument: File) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    formData.append(key, typeof value === "object" ? JSON.stringify(value) : value);
  });
  formData.append("invoiceDocument", invoiceDocument);

  const response = await http(ROUTES.create, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.receivable;
}

export async function getReceivables(): Promise<Receivable[]> {
  const response = await http(ROUTES.list, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.receivables || [];
}
