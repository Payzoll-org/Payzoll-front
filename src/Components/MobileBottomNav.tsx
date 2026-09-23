import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Clock, BarChart3, Settings } from "lucide-react";
import { useAuthStore } from "../Zustand/userStore";
import KycRequiredModal from "./KycRequiredModal";

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  route: string;
  requiresKyc?: boolean;
  requiresInternationalBankingReady?: boolean;
}

const TABS: TabItem[] = [
  { id: "dashboard", label: "Home", icon: Home, route: "/dashboard" },
  { id: "transactionshistory", label: "History", icon: Clock, route: "/transactionhistory", requiresKyc: true },
  {
    id: "international-banking",
    label: "Global",
    icon: BarChart3,
    route: "/international-banking",
    requiresInternationalBankingReady: true,
  },
  { id: "settings", label: "Settings", icon: Settings, route: "/settings" },
];

// Mirrors sideBar.tsx's own gates (requiresKyc -> KycRequiredModal,
// requiresInternationalBankingReady -> disabled) so the bottom nav that
// replaces it on mobile doesn't let a user reach a page the desktop sidebar
// would have blocked.
export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [kycModalOpen, setKycModalOpen] = useState(false);

  const internationalBankingReady = !!(user?.accountStatus === "activated" && user?.stablecoinEnabled);

  const handleTap = (tab: TabItem) => {
    if (tab.requiresInternationalBankingReady && !internationalBankingReady) return;
    if (tab.requiresKyc && !user?.kycVerified) {
      setKycModalOpen(true);
      return;
    }
    navigate(tab.route);
  };

  return (
    <>
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
      >
        {TABS.map((tab) => {
          const active = location.pathname === tab.route || location.pathname.startsWith(`${tab.route}/`);
          const disabled = tab.requiresInternationalBankingReady && !internationalBankingReady;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTap(tab)}
              disabled={disabled}
              title={disabled ? "Unlocks once your USD account and stablecoin payments are both active" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                disabled
                  ? "text-gray-300"
                  : active
                    ? "text-arc-gold-600"
                    : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <KycRequiredModal
        open={kycModalOpen}
        underReview={user?.accountStatus === "verifying"}
        onCancel={() => setKycModalOpen(false)}
        onProceed={() => {
          setKycModalOpen(false);
          navigate("/kyc");
        }}
      />
    </>
  );
}
