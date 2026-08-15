import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface InrBankAccountPayload {
  accountHolderName: string;
  ifsc: string;
  accountNumber: string;
  city: string;
  line1: string;
  postalCode: string;
  state: string;
}

export interface EefcBankAccountPayload {
  accountHolderName: string;
  globalWire: string;
  accountNumber: string;
  city: string;
  line1: string;
  postalCode: string;
  state: string;
}

const ROUTES = API_ROUTES.bankAccount;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function submitInrBankAccount(payload: InrBankAccountPayload) {
  const response = await http(ROUTES.inr, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.bankAccount;
}

export async function submitEefcBankAccount(
  payload: EefcBankAccountPayload,
  bankStatement: File
) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
  formData.append("bankStatement", bankStatement);

  const response = await http(ROUTES.eefc, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.bankAccount;
}
