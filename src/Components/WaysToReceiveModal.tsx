import { useState } from "react";
import { X, Landmark, Coins, Check, Copy } from "lucide-react";
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

type Category = "local" | "stablecoin" | "domestic";

// The user's own INR bank account (the one entered during KYC), shown so
// domestic senders can pay it directly.
export const findDomesticAccount = (bankAccounts: BankAccount[]) =>
  bankAccounts.find((a) => a.category === "user_payout" && a.currency === "INR");

function CopyIconButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
      className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  );
}

function DetailRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const isCopyable = copyable && value && value !== "-";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-semibold text-gray-900 text-right break-all">{value}</span>
        {isCopyable && <CopyIconButton value={value} />}
      </span>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
      <div className="border border-gray-200 rounded-sm overflow-hidden">{children}</div>
    </div>
  );
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  soleproprietorship: "Business",
  individual: "Individual",
};

export function LocalBankDetails({ account }: { account: BankAccount }) {
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
      <div className="flex bg-gray-100 rounded-sm p-0.5 w-fit mb-4">
        {(["local", "swift"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRail(r)}
            className={`px-5 py-1.5 rounded-sm text-sm font-medium transition-colors ${
              rail === r ? "bg-arc-gold-600 text-white" : "text-gray-600 hover:text-gray-900"
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
              <DetailRow label="Account Number" value={bank.number || "-"} copyable />
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
          <DetailRow label="Account Number" value={bank.number || "-"} copyable />
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

export function DomesticAccountDetails({ account }: { account: BankAccount }) {
  const bank = account.bankAccount;
  const ifsc = bank?.domestic_credit || bank?.domestic_wire || bank?.domestic_fast_credit || null;

  return (
    <DetailBlock title="Domestic bank transfer (IMPS / NEFT / RTGS / UPI)">
      <DetailRow label="Beneficiary" value={account.name || "-"} />
      <DetailRow label="Receiving Currency" value={account.currency} />
      <DetailRow label="Account Number" value={bank?.number || "-"} copyable />
      <DetailRow label="IFSC Code" value={ifsc || "-"} copyable />
      {bank?.bank_name && <DetailRow label="Bank" value={bank.bank_name} />}
    </DetailBlock>
  );
}

export function StablecoinDetails({ bankAccounts }: { bankAccounts: BankAccount[] }) {
  const [filter, setFilter] = useState<"all" | "USDC" | "USDT">("all");

  const accountFor = (slot: (typeof STABLECOIN_SLOTS)[number]) =>
    bankAccounts.find(
      (a) => a.category === "xflow_receive" && a.currency === slot.currency && a.network === slot.network
    );

  const slots = STABLECOIN_SLOTS.filter((slot) => {
    if (filter !== "all" && slot.currency !== filter) return false;
    // Stellar isn't an XflowPay-supported network - only ever a manually
    // recorded external address for the specific account it was added for
    // (BankAccount.external: true). Unlike the real XflowPay slots, it
    // shouldn't show as "Not yet available" for every other user.
    if (slot.network === "STELLAR" && !accountFor(slot)) return false;
    return true;
  });

  return (
    <div>
      <div className="flex bg-gray-100 rounded-sm p-0.5 w-fit mb-4">
        {(["all", "USDC", "USDT"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-1.5 rounded-sm text-sm font-medium transition-colors ${
              filter === f ? "bg-arc-gold-600 text-white" : "text-gray-600 hover:text-gray-900"
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
                <DetailRow label="Receiving Address" value={account.receivingAddress || "-"} copyable />
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
  const domesticAccount = findDomesticAccount(bankAccounts);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-sm shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Ways To Receive Payments</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-y-auto sm:overflow-hidden">
          {/* Left panel */}
          <div className="w-full sm:w-64 sm:shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 flex flex-col sm:overflow-y-auto p-4">
            <span className="text-xs text-gray-500">Currency & Senders Country</span>
            <p className="text-sm font-medium text-gray-900 mt-1 mb-5">USD from United States of America</p>

            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Payment Methods</p>
            <div className="flex flex-col gap-2">
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
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0 sm:overflow-y-auto p-4 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {category === "local" ? "Bank Transfers" : category === "domestic" ? "Domestic Account" : "Stablecoin Payments"}
            </h3>

            {category === "domestic" ? (
              domesticAccount ? (
                <DomesticAccountDetails account={domesticAccount} />
              ) : (
                <p className="text-sm text-gray-400">Your domestic bank account will appear here once it is added.</p>
              )
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
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
