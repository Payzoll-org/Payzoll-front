import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { getBankAccounts, type BankAccount } from "../services/bankAccountApi";
import { getBalance, type Balance } from "../services/accountActivationApi";
import { getDeposits, PAYMENT_METHOD_LABELS, type Deposit } from "../services/depositApi";
import { useAuthStore } from "../Zustand/userStore";
import WaysToReceiveModal from "./WaysToReceiveModal";
import WalletOfframpWidget from "./WalletOfframpWidget";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    activated: "bg-green-50 text-green-700 border-green-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    verifying: "bg-amber-50 text-amber-700 border-amber-200",
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    requested: "bg-amber-50 text-amber-700 border-amber-200",
    initialized: "bg-amber-50 text-amber-700 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    reversed: "bg-red-50 text-red-700 border-red-200",
    deactivated: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${
        styles[status] || styles.deactivated
      }`}
    >
      {status}
    </span>
  );
}

// Account Summary, Transfer Details, and AI FX Insights sections were
// removed from the dashboard render - see AccountsOverview below.

function DepositRow({ deposit }: { deposit: Deposit }) {
  const fee = (parseFloat(deposit.amount) - parseFloat(deposit.net_amount || deposit.amount)).toFixed(2);
  const hasFee = parseFloat(fee) > 0;

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 px-4 text-sm text-gray-700">
        {new Date(deposit.created * 1000).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </td>
      <td className="py-3 px-4 text-sm text-gray-400">NA</td>
      <td className="py-3 px-4 text-sm text-gray-700">
        {(deposit.payment_method && PAYMENT_METHOD_LABELS[deposit.payment_method]) || "NA"}
      </td>
      <td className="py-3 px-4 text-sm text-gray-400">{hasFee ? `${deposit.currency} ${fee}` : "NA"}</td>
      <td className="py-3 px-4 text-sm font-medium text-gray-900 underline decoration-dotted underline-offset-2">
        {deposit.currency} {deposit.amount}
      </td>
      <td className="py-3 px-4 text-sm text-gray-700">{deposit.statement_descriptor || "NA"}</td>
      <td className="py-3 px-4">
        <StatusBadge status={deposit.status} />
      </td>
    </tr>
  );
}

/**
 * Backed by XflowPay's Deposit object (api-reference.md "Deposits") -
 * "Inferred Sender" is always NA since that field doesn't exist on it, not
 * a placeholder we forgot to fill in.
 */
function PaymentsReceivedTable() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "USD">("all");

  useEffect(() => {
    getDeposits({ limit: 10 })
      .then(({ deposits }) => setDeposits(deposits))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? deposits : deposits.filter((d) => d.currency === filter)),
    [deposits, filter]
  );

  return (
    <section className="mb-100" id="payments-received">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-gray-900">Payments Received from Partners</h2>
          <Info size={15} className="text-gray-400" />
        </div>
        <div className="flex bg-gray-100 rounded-sm p-0.5">
          {(["all", "USD"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1 rounded-sm text-sm font-medium transition-colors ${
                filter === f ? "bg-arc-gold-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 border border-gray-200 rounded-sm">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-sm p-6 text-sm text-gray-500">
          No payments received yet. Incoming deposits will show up here.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-sm overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Received on</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Inferred Sender</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Source</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Fees</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Amount Received</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Details</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <DepositRow key={d.id} deposit={d} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AccountsOverview() {
  const user = useAuthStore((s) => s.user);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalSelection, setModalSelection] = useState<"local" | "stablecoin" | null>(null);

  useEffect(() => {
    Promise.all([getBankAccounts(), getBalance().catch(() => null)])
      .then(([accounts, bal]) => {
        setBankAccounts(accounts);
        setBalance(bal);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const usReceivingAccount = bankAccounts.find(
    (a) => a.category === "xflow_receive" && a.currency === "USD"
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-8 overflow-y-auto h-full">
      {/* Wallet + Offramp Calculator */}
      <WalletOfframpWidget balance={balance} onDeposit={() => setModalSelection("local")} />

      {/* Payments Received from Partners */}
      <PaymentsReceivedTable />

      <WaysToReceiveModal
        key={modalSelection}
        open={modalSelection !== null}
        onClose={() => setModalSelection(null)}
        usReceivingAccount={usReceivingAccount}
        bankAccounts={bankAccounts}
        stablecoinEnabled={!!user?.stablecoinEnabled}
        initialSelection={modalSelection || "local"}
      />
    </div>
  );
}
