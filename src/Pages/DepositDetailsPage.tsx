import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Landmark, Coins } from "lucide-react";
import { getBankAccounts, type BankAccount } from "../services/bankAccountApi";
import { useAuthStore } from "../Zustand/userStore";
import { DomesticAccountDetails, LocalBankDetails, StablecoinDetails, findDomesticAccount } from "../Components/WaysToReceiveModal";

type Category = "local" | "stablecoin" | "domestic";

// Reached only from the dashboard's mobile-only Deposit button
// (WalletOfframpWidget) - desktop still opens WaysToReceiveModal as a
// dialog; on a phone screen a full page reads better than a modal for this
// much content, so mobile gets its own route instead.
export default function DepositDetailsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("local");

  useEffect(() => {
    getBankAccounts()
      .then(setBankAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const usReceivingAccount = bankAccounts.find(
    (a) => a.category === "xflow_receive" && a.currency === "USD"
  );
  const domesticAccount = findDomesticAccount(bankAccounts);
  const stablecoinEnabled = !!user?.stablecoinEnabled;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
        <button
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
          className="text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Ways To Receive Payments</h1>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <span className="text-xs text-gray-500">Currency & Senders Country</span>
          <p className="text-sm font-medium text-gray-900 mt-1 mb-5">USD from United States of America</p>

          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Payment Methods</p>
          <div className="flex flex-col gap-2 mb-6">
            {usReceivingAccount && (
              <button
                onClick={() => setCategory("local")}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium border ${
                  category === "local"
                    ? "bg-arc-gold-50 text-arc-gold-700 border-arc-gold-200"
                    : "text-gray-700 hover:bg-gray-50 border-gray-200"
                }`}
              >
                <span className="w-6 h-6 rounded-sm bg-gray-900 flex items-center justify-center text-white shrink-0">
                  <Landmark size={13} />
                </span>
                <span className="flex-1 text-left">Local Payment methods</span>
              </button>
            )}

            {domesticAccount && (
              <button
                onClick={() => setCategory("domestic")}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium border ${
                  category === "domestic"
                    ? "bg-arc-gold-50 text-arc-gold-700 border-arc-gold-200"
                    : "text-gray-700 hover:bg-gray-50 border-gray-200"
                }`}
              >
                <span className="w-6 h-6 rounded-sm bg-gray-900 flex items-center justify-center text-white shrink-0">
                  <Landmark size={13} />
                </span>
                <span className="flex-1 text-left">Domestic Account</span>
              </button>
            )}

            {stablecoinEnabled && (
              <button
                onClick={() => setCategory("stablecoin")}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium border ${
                  category === "stablecoin"
                    ? "bg-arc-gold-50 text-arc-gold-700 border-arc-gold-200"
                    : "text-gray-700 hover:bg-gray-50 border-gray-200"
                }`}
              >
                <span className="w-6 h-6 rounded-sm bg-gray-900 flex items-center justify-center text-white shrink-0">
                  <Coins size={15} />
                </span>
                <span className="flex-1 text-left">Stablecoin Payments</span>
              </button>
            )}
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {category === "local" ? "Bank Transfers" : category === "domestic" ? "Domestic Account" : "Stablecoin Payments"}
          </h3>

          {category === "domestic" && domesticAccount ? (
            <DomesticAccountDetails account={domesticAccount} />
          ) : category === "local" ? (
            usReceivingAccount ? (
              <LocalBankDetails account={usReceivingAccount} />
            ) : (
              <p className="text-sm text-gray-400">
                Your US receiving account will appear here once your account is activated.
              </p>
            )
          ) : (
            <StablecoinDetails bankAccounts={bankAccounts} />
          )}
        </div>
      )}
    </div>
  );
}
