import { AlertTriangle, Clock } from "lucide-react";

// Centered confirm/cancel modal, styled to match the app's other modals
// (HelpSupportModal etc) - shown whenever a not-yet-KYC'd user tries to use
// a feature that needs it (Withdraw, Deposit, Reconcile, Transaction
// History, ...), instead of a plain browser alert().
//
// underReview distinguishes "never started KYC" from "already submitted,
// waiting on XflowPay's review" (KycBanner.tsx's same UNDER_REVIEW_STATUSES
// check) - both are user.kycVerified === false, but telling an already-
// submitted user to "complete your KYC first" is actively wrong and
// confusing, not just imprecise.
export default function KycRequiredModal({
  open,
  underReview = false,
  onCancel,
  onProceed,
}: {
  open: boolean;
  underReview?: boolean;
  onCancel: () => void;
  onProceed: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-sm shadow-xl w-full max-w-sm p-6 flex flex-col items-center text-center gap-3">
        {underReview ? (
          <>
            <div className="w-12 h-12 rounded-full bg-arc-gold-50 flex items-center justify-center">
              <Clock size={22} className="text-arc-gold-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Your KYC is in process</h3>
            <p className="text-sm text-gray-500">
              Your KYC is being reviewed by Payzoll - this usually takes 1-2 business days. Once
              it's confirmed, you'll be able to start using the platform.
            </p>
            <button
              onClick={onCancel}
              className="w-full mt-2 px-4 py-2 text-sm font-medium text-white bg-arc-gold-600 rounded-sm hover:bg-arc-gold-700 transition-colors"
            >
              Got it
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
