import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, Coins, Copy, Check, Wallet, Scale } from "lucide-react";
import { getBankAccounts, type BankAccount } from "../services/bankAccountApi";
import { getBalance, type Balance, type BalanceEntry } from "../services/accountActivationApi";
import { useAuthStore } from "../Zustand/userStore";

function CopyableField({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-black text-left group"
      >
        <span>{value}</span>
        {copied ? (
          <Check size={13} className="text-green-600 shrink-0" />
        ) : (
          <Copy size={13} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
        )}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    activated: "bg-green-50 text-green-700 border-green-200",
    verifying: "bg-amber-50 text-amber-700 border-amber-200",
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    requested: "bg-amber-50 text-amber-700 border-amber-200",
    deactivated: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
        styles[status] || styles.deactivated
      }`}
    >
      {status}
    </span>
  );
}

function nonZero(entries: BalanceEntry[]) {
  return entries.filter((e) => parseFloat(e.amount) > 0);
}

function BalanceRow({ label, hint, entries }: { label: string; hint: string; entries: BalanceEntry[] }) {
  const usd = entries.find((b) => b.currency === "USD");
  const others = entries.filter((b) => b.currency !== "USD" && parseFloat(b.amount) > 0);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        <p className="text-sm">{label}</p>
        <span className="text-xs text-gray-400">({hint})</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">
        ${usd ? usd.amount : "0.00"} <span className="text-base font-normal text-gray-400">USD</span>
      </p>
      {others.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {others.map((b) => (
            <span key={b.currency} className="text-xs text-gray-600">
              {b.amount} <span className="text-gray-400">{b.currency}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Shows available, pending, and processing separately - money that's
 * arrived but not yet reconciled sits in `pending`, not `available`
 * (api-reference.md "The Balance object"), and only showing `available`
 * made freshly-received funds look like they'd never arrived at all.
 */
function BalanceCard() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBalance()
      .then(setBalance)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-xl p-6 flex items-center justify-center h-[104px]">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  const hasPending = nonZero(balance.pending).length > 0;
  const hasProcessing = nonZero(balance.processing).length > 0;
  const visibleCount = 1 + (hasPending ? 1 : 0) + (hasProcessing ? 1 : 0);
  const gridColsClass = visibleCount === 3 ? "sm:grid-cols-3" : visibleCount === 2 ? "sm:grid-cols-2" : "";

  return (
    <div className="border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-2 text-gray-400 mb-4">
        <Wallet size={14} />
        <p className="text-xs uppercase tracking-wide">Balance</p>
      </div>

      <div className={`grid gap-6 grid-cols-1 ${gridColsClass}`}>
        <BalanceRow label="Available" hint="ready for payout" entries={balance.available} />
        {hasPending && (
          <BalanceRow label="Pending" hint="received, not yet reconciled" entries={balance.pending} />
        )}
        {hasProcessing && (
          <BalanceRow label="Processing" hint="in transit" entries={balance.processing} />
        )}
      </div>
    </div>
  );
}

function PaymentMethodRow({
  method,
  routingLabel,
  routingValue,
  accountNumber,
}: {
  method: string;
  routingLabel: string;
  routingValue: string | null;
  accountNumber: string | null;
}) {
  if (!routingValue) return null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-900 w-20 shrink-0">{method}</span>
      <div className="flex gap-8 flex-1 justify-end">
        <CopyableField label={routingLabel} value={routingValue} />
        <CopyableField label="Account number" value={accountNumber} />
      </div>
    </div>
  );
}

/**
 * The USD receiving account (VBAN) supports three separate payment rails
 * sharing one account number - each needs its own routing/BIC code, so
 * they're shown as distinct, clearly labeled rows rather than a flat grid.
 */
function USReceivingAccountCard({ account }: { account: BankAccount }) {
  const bank = account.bankAccount;
  if (!bank) return null;

  return (
    <div className="border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">USD</span>
          {bank.bank_name && <span className="text-sm text-gray-500">{bank.bank_name}</span>}
        </div>
        <StatusBadge status={account.status} />
      </div>

      <div className="mt-2">
        <PaymentMethodRow
          method="ACH"
          routingLabel="Routing number"
          routingValue={bank.domestic_credit}
          accountNumber={bank.number}
        />
        <PaymentMethodRow
          method="Fedwire"
          routingLabel="Routing number"
          routingValue={bank.domestic_wire}
          accountNumber={bank.number}
        />
        <PaymentMethodRow
          method="SWIFT"
          routingLabel="SWIFT / BIC"
          routingValue={bank.global_wire}
          accountNumber={bank.number}
        />
      </div>
    </div>
  );
}

function ReceivingAccountCard({ account }: { account: BankAccount }) {
  const bank = account.bankAccount;
  if (!bank) return null;

  return (
    <div className="border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{account.currency}</span>
          {bank.bank_name && <span className="text-sm text-gray-500">{bank.bank_name}</span>}
        </div>
        <StatusBadge status={account.status} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CopyableField label="Account number" value={bank.number} />
        <CopyableField label="ACH routing (domestic credit)" value={bank.domestic_credit} />
        <CopyableField label="Wire routing" value={bank.domestic_wire} />
        <CopyableField label="SWIFT / BIC" value={bank.global_wire} />
      </div>
    </div>
  );
}

// USDC exists on both EVM chains and Solana; USDT only on Tron
// (guide.md "Add additional information to enable stablecoin acceptance").
// Each currency+network pair is its own slot.
const STABLECOIN_SLOTS: { currency: string; network: string; label: string }[] = [
  { currency: "USDC", network: "EVM", label: "USDC on EVM" },
  { currency: "USDC", network: "SOLANA", label: "USDC on Solana" },
  { currency: "USDT", network: "TRON", label: "USDT on Tron" },
];

function DetailRow({ label, value, shaded }: { label: string; value: string; shaded?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${shaded ? "bg-indigo-50/60" : "bg-white"}`}>
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right break-all">{value}</span>
    </div>
  );
}

/**
 * XflowPay auto-provisions these once stablecoin_exports_v1 activates -
 * asynchronously, not instantly (confirmed live: they showed up 10-40
 * minutes after the capability's webhook fired). Receiving Address is
 * address.vpa.id - in test mode this is a "test_liq_id_..." placeholder
 * (same pattern as mock.bridge.tos: a test-mode stand-in, not a real
 * on-chain address); in livemode this is XflowPay's real deposit/
 * liquidation address for that chain. Payments sent there are instantly
 * off-ramped into USD (guide.md "Add additional information to enable
 * stablecoin acceptance") and land in the US Receiving Account above.
 */
function StablecoinAddressCard({
  slot,
  account,
}: {
  slot: (typeof STABLECOIN_SLOTS)[number];
  account?: BankAccount;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">{slot.label}</h3>
        {account && <StatusBadge status={account.status} />}
      </div>

      {!account ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-5 text-sm text-gray-400">
          Not yet available
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          <DetailRow label="Beneficiary" value={account.name || "-"} />
          <DetailRow label="Receiving Token" value={account.currency} shaded />
          <DetailRow label="Network" value={slot.network} />
          <DetailRow label="Receiving Address" value={account.receivingAddress || "-"} shaded />
        </div>
      )}
    </div>
  );
}

export default function AccountsOverview() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBankAccounts()
      .then(setBankAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const usReceivingAccount = bankAccounts.find(
    (a) => a.category === "xflow_receive" && a.currency === "USD"
  );
  const payoutAccounts = bankAccounts.filter((a) => a.category === "user_payout");

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex mb-5 items-center justify-between -mb-4">
        <h1 className="text-4xl text-gray-900">My Accounts</h1>
        <button
          onClick={() => navigate("/reconcile")}
          className="flex items-center gap-2 px-5 h-10 bg-black text-white text-sm font-medium
                    rounded-full hover:scale-105 transition-transform shadow-sm"
        >
          <Scale size={15} />
          Reconcile
        </button>
      </div>

      {/* Balance */}
      <section>
        <BalanceCard />
      </section>

      {/* US Receiving Account */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Landmark size={18} className="text-gray-700" />
          <h2 className="text-lg font-medium text-gray-900">US Receiving Account</h2>
        </div>

        {usReceivingAccount ? (
          <USReceivingAccountCard account={usReceivingAccount} />
        ) : (
          <div className="border border-dashed border-gray-200 rounded-xl p-6 text-sm text-gray-500">
            Your US receiving account will appear here once your account is activated.
          </div>
        )}
      </section>

      {/* Stablecoin Payments */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Coins size={18} className="text-gray-700" />
          <h2 className="text-lg font-medium text-gray-900">Stablecoin Payments</h2>
        </div>

        {user?.stablecoinEnabled ? (
          <div className="flex flex-col gap-6">
            {STABLECOIN_SLOTS.map((slot) => (
              <StablecoinAddressCard
                key={`${slot.currency}-${slot.network}`}
                slot={slot}
                account={bankAccounts.find(
                  (a) =>
                    a.category === "xflow_receive" &&
                    a.currency === slot.currency &&
                    a.network === slot.network
                )}
              />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-xl p-6 text-sm text-gray-500">
            Enable stablecoin payments from your dashboard to accept USDC (EVM, Solana) and USDT (Tron).
          </div>
        )}
      </section>

      {/* Payout Bank Accounts */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Landmark size={18} className="text-gray-700" />
          <h2 className="text-lg font-medium text-gray-900">Payout Bank Accounts</h2>
        </div>

        {payoutAccounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {payoutAccounts.map((account) => (
              <ReceivingAccountCard key={account._id} account={account} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-xl p-6 text-sm text-gray-500">
            No payout bank accounts added yet.
          </div>
        )}
      </section>
    </div>
  );
}
