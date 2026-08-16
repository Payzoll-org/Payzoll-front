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

export interface BankAccountDetails {
  bank_name: string | null;
  domestic_credit: string | null;
  domestic_debit: string | null;
  domestic_fast_credit: string | null;
  domestic_wire: string | null;
  global_wire: string | null;
  iban: string | null;
  last4: string | null;
  number: string | null;
  type: string | null;
}

export interface BankAccount {
  _id: string;
  xflowAddressId: string;
  category: "user_payout" | "xflow_receive";
  currency: string;
  // Only set for stablecoin receiving accounts - USDC exists on both EVM
  // chains and Solana, USDT on Tron, so currency alone doesn't uniquely
  // identify one.
  network?: string | null;
  status: string;
  name: string | null;
  bankAccount: BankAccountDetails;
  createdAt: string;
}

const ROUTES = API_ROUTES.bankAccount;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const response = await http(ROUTES.list, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.bankAccounts || [];
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
