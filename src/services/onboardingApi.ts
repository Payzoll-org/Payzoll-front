import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export type TypeOfUser = "individual" | "soleproprietorship";

export type ReferralSource =
  | "Telegram"
  | "Instagram"
  | "YouTube"
  | "Community"
  | "Twitter/X"
  | "LinkedIn"
  | "Friend/Referral"
  | "Google"
  | "Other";

export const REFERRAL_SOURCES: ReferralSource[] = [
  "Telegram",
  "Instagram",
  "YouTube",
  "Community",
  "Twitter/X",
  "LinkedIn",
  "Friend/Referral",
  "Google",
  "Other",
];

export interface OnboardingPayload {
  legalName: string;
  typeOfUser: TypeOfUser;
  dateOfBirth: string;
  phoneNumber: string;
  monthlyVolume: string;
  yearlyVolume: string;
  referralSource: ReferralSource;
  isTermAndConditionAccepted: boolean;
}

const ROUTES = API_ROUTES.onboarding;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

/**
 * Submitted after OTP verification, so the request carries the access
 * token set by verifyOtp and the backend identifies the user via req.user.
 */
export async function submitOnboarding(payload: OnboardingPayload) {
  const response = await http(ROUTES.submit, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.onboarding;
}

export async function getOnboarding() {
  const response = await http(ROUTES.get, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.onboarding;
}

export async function updateOnboarding(payload: OnboardingPayload) {
  const response = await http(ROUTES.update, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.onboarding;
}
