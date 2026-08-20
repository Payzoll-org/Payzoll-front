import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { useAuthStore } from "../Zustand/userStore";
import { refreshCurrentUser } from "../services/authApi";

// kycVerified flips server-side only when XflowPay's account.status.activated
// webhook lands (Services/webhook.service.js) - review can take up to a
// business day in production, so this polls the real backend state rather
// than assuming/toggling anything client-side. 60s (not something
// tighter like 20s) since review taking hours-to-a-day makes a faster
// poll pure overhead - confirmed live this and StablecoinBanner's polling
// combined were enough to exhaust the backend's shared rate limit budget
// during normal use.
const POLL_INTERVAL_MS = 60000;

// Real XflowPay account.status values (api-reference.md "The Account
// object") once activation has actually been submitted - "verifying" is
// XflowPay reviewing it, same status this account sits in for however
// long real review takes (confirmed: up to a business day or two).
const UNDER_REVIEW_STATUSES = ["verifying"];

export default function KycBanner() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.kycVerified) {
      return;
    }

    const interval = setInterval(() => {
      refreshCurrentUser().catch(() => {
        // Transient network/auth hiccup - next poll retries, nothing to do here.
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user?.id, user?.kycVerified]);

  if (!user || user.kycVerified) {
    return null;
  }

  const underReview = UNDER_REVIEW_STATUSES.includes(user.accountStatus || "");

  if (underReview) {
    return (
      <div className="w-full bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 shrink-0">
        <Clock size={18} className="shrink-0 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">
          Your KYC has been submitted to Payzoll for review. This usually takes 1-2 business days.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle size={18} className="shrink-0" />
        <span className="text-sm font-medium">
          Your KYC is pending. Complete your KYC to unlock full access.
        </span>
      </div>
      <button
        onClick={() => navigate("/kyc")}
        className="shrink-0 px-4 py-1 bg-black text-white text-sm font-medium rounded-full hover:scale-105 transition-transform"
      >
        Complete KYC
      </button>
    </div>
  );
}
