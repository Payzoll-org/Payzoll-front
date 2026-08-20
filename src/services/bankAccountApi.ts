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
  // Only set for stablecoin receiving addresses - USDC exists on both EVM
  // chains and Solana, USDT on Tron, so currency alone doesn't uniquely
  // identify one.
  network?: "EVM" | "SOLANA" | "TRON" | "STELLAR" | null;
  status: string;
  name: string | null;
  // Stablecoin receiving addresses have no bank_account hash - XflowPay
  // instantly off-ramps them to USD instead (they land in the USD address
  // above), so there's no routing/account number to show for these.
  bankAccount: BankAccountDetails | null;
  // Stablecoin receiving addresses only - XflowPay's own address.vpa.id.
  receivingAddress?: string | null;
  // True only for addresses XflowPay never provisioned - deposits to these
  // aren't tracked, reconciled, or reflected in balance/payments-received.
  external?: boolean;
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
