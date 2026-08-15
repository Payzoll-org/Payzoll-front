import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuthStore } from "../Zustand/userStore";

export default function KycBanner() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user || user.kycVerified) {
    return null;
  }

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle size={18} className="shrink-0" />
        <span className="text-sm font-medium">
          Your KYC is pending. Complete your KYC to unlock full access.
        </span>
      </div>
      <button
        onClick={() => navigate("/kyc")}
        className="shrink-0 px-4 py-1.5 bg-black text-white text-sm font-medium rounded-full hover:scale-105 transition-transform"
      >
        Complete KYC
      </button>
    </div>
  );
}
