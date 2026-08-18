import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { useAuthStore } from "../Zustand/userStore";
import { refreshCurrentUser } from "../services/authApi";
import StablecoinModal from "./StablecoinModal";

// accountStatus/stablecoinEnabled only ever change server-side (the real
// XflowPay webhook - Services/webhook.service.js), so this polls the real
// backend state the same way KycBanner does, rather than assuming/toggling
// anything client-side. 60s, not tighter - confirmed live this and
// KycBanner's polling combined were enough to exhaust the backend's
// shared rate limit budget during normal use.
const POLL_INTERVAL_MS = 60000;

export default function StablecoinBanner() {
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user || user.stablecoinEnabled) {
      return;
    }

    const interval = setInterval(() => {
      refreshCurrentUser().catch(() => {
        // Transient network/auth hiccup - next poll retries, nothing to do here.
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user?.id, user?.stablecoinEnabled]);

  if (!user || user.accountStatus !== "activated" || user.stablecoinEnabled) {
    return null;
  }

  return (
    <>
      <div className="w-full bg-indigo-50 border-b border-indigo-200 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 text-indigo-800">
          <Coins size={18} className="shrink-0" />
          <span className="text-sm font-medium">
            Accept USDC and USDT payments by enabling stablecoin payments.
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 px-4 py-1.5 bg-black text-white text-sm font-medium rounded-full hover:scale-105 transition-transform"
        >
          Enable stablecoin payments
        </button>
      </div>

      {showModal && (
        <StablecoinModal
          onClose={() => setShowModal(false)}
          onComplete={() => {
            refreshCurrentUser().catch(() => {});
          }}
        />
      )}
    </>
  );
}
