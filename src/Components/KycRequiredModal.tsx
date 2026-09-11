import { AlertTriangle } from "lucide-react";

// Centered confirm/cancel modal, styled to match the app's other modals
// (HelpSupportModal etc) - shown whenever a not-yet-KYC'd user tries to use
// a feature that needs it (Withdraw, Deposit, Reconcile, Transaction
// History, ...), instead of a plain browser alert().
export default function KycRequiredModal({
  open,
  onCancel,
  onProceed,
}: {
  open: boolean;
  onCancel: () => void;
  onProceed: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-sm shadow-xl w-full max-w-sm p-6 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
          <AlertTriangle size={22} className="text-amber-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Complete your KYC first</h3>
        <p className="text-sm text-gray-500">
          You need to complete KYC verification before you can access this feature.
        </p>
        <div className="flex items-center gap-3 w-full mt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-arc-gold-600 rounded-sm hover:bg-arc-gold-700 transition-colors"
          >
            Complete KYC
          </button>
        </div>
      </div>
    </div>
  );
}
