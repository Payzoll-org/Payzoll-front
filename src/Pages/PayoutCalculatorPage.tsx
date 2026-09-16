import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { OfframpCalculatorCard } from "../Components/WalletOfframpWidget";
import KycRequiredModal from "../Components/KycRequiredModal";

// Reached only from the dashboard's mobile-only "Calculator" button
// (WalletOfframpWidget) - the full calculator card doesn't fit alongside
// Withdraw/Deposit on a phone-width screen, so it lives on its own page there.
export default function PayoutCalculatorPage() {
  const navigate = useNavigate();
  const [kycModalOpen, setKycModalOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
          className="text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Payout Calculator</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <OfframpCalculatorCard onRequireKyc={() => setKycModalOpen(true)} />
      </div>

      <KycRequiredModal
        open={kycModalOpen}
        onCancel={() => setKycModalOpen(false)}
        onProceed={() => {
          setKycModalOpen(false);
          navigate("/kyc");
        }}
      />
    </div>
  );
}
