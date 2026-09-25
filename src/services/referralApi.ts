import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface ReferralEntry {
  joinedAt: string;
  status: string;
  rewardStatus: "pending" | "granted" | "rejected";
}

export interface ReferralSummary {
  code: string;
  totalReferred: number;
  referrals: ReferralEntry[];
}

/**
 * The signed-in user's own referral code and history. Purely display data:
 * whether a referral is valid is decided by the backend alone, and nothing
 * here is ever sent back to it.
 */
export async function getMyReferrals(): Promise<ReferralSummary> {
  const response = await http(API_ROUTES.referral.me);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Could not load your referral details");
  }

  return data.data as ReferralSummary;
}
