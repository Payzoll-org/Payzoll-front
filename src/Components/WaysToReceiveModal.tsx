import { useState } from "react";
import { X, Landmark, Coins, Check, AlertTriangle } from "lucide-react";
import type { BankAccount, BankAccountDetails } from "../services/bankAccountApi";
import { useAuthStore } from "../Zustand/userStore";

const STABLECOIN_SLOTS: { currency: string; network: string; label: string }[] = [
  { currency: "USDC", network: "EVM", label: "USDC on EVM" },
  { currency: "USDC", network: "SOLANA", label: "USDC on Solana" },
  { currency: "USDT", network: "TRON", label: "USDT on Tron" },
  // Not an XflowPay-supported network - only ever present as a manually
  // recorded external address (BankAccount.external: true), never synced
  // from XflowPay like the slots above.
  { currency: "USDC", network: "STELLAR", label: "USDC on Stellar" },
];

// The USD receiving account (VBAN) supports three separate payment rails
// sharing one account number - ACH and Fedwire are both "Local", SWIFT is
// its own rail with a BIC instead of a routing number.
const LOCAL_RAILS: {
  key: "ach" | "fedwire";
  label: string;
  routing: (bank: BankAccountDetails) => string | null;
}[] = [
  { key: "ach", label: "ACH", routing: (bank) => bank.domestic_credit },
  { key: "fedwire", label: "Fedwire", routing: (bank) => bank.domestic_wire },
];

type Category = "local" | "stablecoin";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right break-all">{value}</span>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
      <div className="border border-gray-200 rounded-xl overflow-hidden">{children}</div>
    </div>
  );
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  soleproprietorship: "Business",
  individual: "Individual",
};

function LocalBankDetails({ account }: { account: BankAccount }) {
  const [rail, setRail] = useState<"local" | "swift">("local");
  const bank = account.bankAccount;
  const user = useAuthStore((s) => s.user);
  const accountType = (user?.userType && ACCOUNT_TYPE_LABELS[user.userType]) || "-";

  if (!bank) {
    return (
      <p className="text-sm text-gray-400">
        Your US receiving account will appear here once your account is activated.
      </p>
    );
  }

  const availableLocalRails = LOCAL_RAILS.filter((r) => r.routing(bank));

  return (
    <div>
      <div className="flex bg-gray-100 rounded-full p-0.5 w-fit mb-4">
        {(["local", "swift"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRail(r)}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              rail === r ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {r === "local" ? "Local" : "SWIFT"}
          </button>
        ))}
      </div>

      {rail === "local" ? (
        availableLocalRails.length > 0 ? (
          availableLocalRails.map((r) => (
            <DetailBlock key={r.key} title={r.label}>
              <DetailRow label="Beneficiary" value={account.name || "-"} />
              <DetailRow label="Receiving Currency" value={account.currency} />
              <DetailRow label="Account Number" value={bank.number || "-"} />
              <DetailRow label="Routing Number" value={r.routing(bank) || "-"} />
              <DetailRow label="Account Type" value={accountType} />
              {bank.bank_name && <DetailRow label="Bank" value={bank.bank_name} />}
            </DetailBlock>
          ))
        ) : (
          <p className="text-sm text-gray-400">No local routing details available yet.</p>
        )
      ) : bank.global_wire ? (
        <DetailBlock title="SWIFT">
          <DetailRow label="Beneficiary" value={account.name || "-"} />
          <DetailRow label="Receiving Currency" value={account.currency} />
          <DetailRow label="Account Number" value={bank.number || "-"} />
          <DetailRow label="SWIFT / BIC" value={bank.global_wire} />
          <DetailRow label="Account Type" value={accountType} />
          {bank.bank_name && <DetailRow label="Bank" value={bank.bank_name} />}
        </DetailBlock>
      ) : (
        <p className="text-sm text-gray-400">No SWIFT details available yet.</p>
      )}
    </div>
  );
}

function StablecoinDetails({ bankAccounts }: { bankAccounts: BankAccount[] }) {
  const [filter, setFilter] = useState<"all" | "USDC" | "USDT">("all");

  const accountFor = (slot: (typeof STABLECOIN_SLOTS)[number]) =>
    bankAccounts.find(
      (a) => a.category === "xflow_receive" && a.currency === slot.currency && a.network === slot.network
    );

  const slots = STABLECOIN_SLOTS.filter((slot) => filter === "all" || slot.currency === filter);

  return (
    <div>
      <div className="flex bg-gray-100 rounded-full p-0.5 w-fit mb-4">
        {(["all", "USDC", "USDT"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {slots.map((slot) => {
        const account = accountFor(slot);
        return (
          <DetailBlock key={`${slot.currency}-${slot.network}`} title={slot.label}>
            {account ? (
              <>
                <DetailRow label="Beneficiary" value={account.name || "-"} />
                <DetailRow label="Receiving Token" value={account.currency} />
                <DetailRow label="Network" value={slot.network} />
                <DetailRow label="Receiving Address" value={account.receivingAddress || "-"} />
                {account.external && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border-t border-amber-200">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      Not tracked by Payzoll - this network isn't supported by our payment
                      processor. Deposits here won't show up in your balance or payment history.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400">Not yet available</div>
            )}
          </DetailBlock>
        );
      })}
    </div>
  );
}

export default function WaysToReceiveModal({
  open,
  onClose,
  usReceivingAccount,
  bankAccounts,
  stablecoinEnabled,
  initialSelection = "local",
}: {
  open: boolean;
  onClose: () => void;
  usReceivingAccount?: BankAccount;
  bankAccounts: BankAccount[];
  stablecoinEnabled: boolean;
  initialSelection?: Category;
}) {
  const [category, setCategory] = useState<Category>(initialSelection);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Ways To Receive Payments</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left panel */}
          <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col overflow-y-auto p-4">
            <span className="text-xs text-gray-500">Currency & Senders Country</span>
            <p className="text-sm font-medium text-gray-900 mt-1 mb-5">USD from United States of America</p>

            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Payment Methods</p>
            <div className="flex flex-col gap-2">
              {usReceivingAccount && (
                <button
                  onClick={() => setCategory("local")}
                  className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border ${
                    category === "local"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "text-gray-700 hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white shrink-0">
                    <Landmark size={15} />
                  </span>
                  <span className="flex-1 text-left">Local Payment methods</span>
                  {category === "local" && <Check size={14} />}
                </button>
              )}

              {stablecoinEnabled && (
                <button
                  onClick={() => setCategory("stablecoin")}
                  className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border ${
                    category === "stablecoin"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "text-gray-700 hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white shrink-0">
                    <Coins size={15} />
                  </span>
                  <span className="flex-1 text-left">Stablecoin Payments</span>
                  {category === "stablecoin" && <Check size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {category === "local" ? "Bank Transfers" : "Stablecoin Payments"}
            </h3>

            {category === "local" ? (
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
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
