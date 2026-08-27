import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

/**
 * Adds the authenticated user as the owner Person on their XflowPay
 * account, reusing the PAN details already submitted via
 * businessIdentifiersApi - required before activation.
 */
export async function submitOwnerPerson() {
  const response = await http(API_ROUTES.person.owner, {
    method: "POST",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.person;
}

/**
 * Submits ToS acceptance and activates the user's XflowPay account.
 */
export async function activateAccount() {
  const response = await http(API_ROUTES.account.activate, {
    method: "POST",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.account;
}

export interface BalanceEntry {
  amount: string;
  currency: string;
}

export interface Balance {
  account_id: string;
  available: BalanceEntry[];
  pending: BalanceEntry[];
  processing: BalanceEntry[];
  payout_processing: BalanceEntry[];
}

/**
 * Live balance from XflowPay - not cached, changes independently of
 * anything the frontend does.
 */
export async function getBalance(): Promise<Balance> {
  const response = await http(API_ROUTES.account.balance, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.balance;
}

export interface KycProgressAboutBusiness {
  website: string;
  dba: string;
  productDescription: string;
  estimatedMonthlyVolume: string;
  estimatedAnnualRevenue: string;
  purposeCodes: string[];
  businessIndustry?: string;
}

export interface KycProgressBusinessIdentifiers {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  panNumber: string;
  nameOnPan: string;
  gstin?: string;
  hasPanFile: boolean;
  hasAddressFile: boolean;
  hasSourceOfIncomeFile: boolean;
}

export interface KycProgressBankDetails {
  currency: string;
  accountHolderName: string;
  accountNumber: string;
  routingCode: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  hasBankStatementFile: boolean;
}

export interface KycProgress {
  aboutBusiness: KycProgressAboutBusiness | null;
  businessIdentifiers: KycProgressBusinessIdentifiers | null;
  bankDetails: KycProgressBankDetails | null;
}

/**
 * What's already on file for each step of the KYC flow - lets a user who
 * leaves partway through resume instead of re-entering everything.
 */
export async function getKycProgress(): Promise<KycProgress> {
  const response = await http(API_ROUTES.account.kycProgress, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data;
}
