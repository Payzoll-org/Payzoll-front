import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Landmark,
  Coins,
  MoreVertical,
  Info,
  RefreshCw,
} from "lucide-react";
import { getBankAccounts, type BankAccount } from "../services/bankAccountApi";
import { getBalance, type Balance, type BalanceEntry } from "../services/accountActivationApi";
import { getDeposits, PAYMENT_METHOD_LABELS, type Deposit } from "../services/depositApi";
import { getLiveRate, getRateHistory, type LiveRate, type RateHistoryPoint } from "../services/fxRateApi";
import { useAuthStore } from "../Zustand/userStore";
import WaysToReceiveModal from "./WaysToReceiveModal";

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

function nonZero(entries: BalanceEntry[]) {
  return entries.filter((e) => parseFloat(e.amount) > 0);
}

/**
 * Top summary card - masked account number, live USD balance, and the
 * primary account actions. Headline figure is the `pending` bucket
 * (received, not yet reconciled - api-reference.md "The Balance object"),
 * matching what "Reconcile" right below it actually acts on.
 */
function AccountSummaryCard({
  usReceivingAccount,
  balance,
  onViewDeposits,
  onBankTransferDetails,
}: {
  usReceivingAccount?: BankAccount;
  balance: Balance | null;
  onViewDeposits: () => void;
  onBankTransferDetails: () => void;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const bank = usReceivingAccount?.bankAccount;
  const last4 = bank?.last4 || bank?.number?.slice(-4) || "----";

  const pendingUsd = balance ? nonZero(balance.pending).find((b) => b.currency === "USD") : undefined;
  const availableUsd = balance ? nonZero(balance.available).find((b) => b.currency === "USD") : undefined;
  const processingUsd = balance ? nonZero(balance.processing).find((b) => b.currency === "USD") : undefined;
  const headline = pendingUsd?.amount || availableUsd?.amount || "0.00";

  return (
    <div className="border border-gray-200 rounded-sm p-3 bg-white max-w-md relative">
      <div className="flex items-center gap-2 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-sm px-4 py-1 mb-8 ">
        <Landmark size={14} />
        <span className="font-medium text-sm tracking-wide">
          {usReceivingAccount ? `**** ${last4}` : "No account yet"}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🇺🇸</span>
        <span className="text-2xl font-semibold text-gray-900">USD {headline}</span>
      </div>

      {(availableUsd || processingUsd) && (
        <p className="text-xs text-gray-400 mb-3">
          {availableUsd && `Available: USD ${availableUsd.amount}`}
          {availableUsd && processingUsd && " · "}
          {processingUsd && `Processing: USD ${processingUsd.amount}`}
        </p>
      )}

      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={() => navigate("/reconcile")}
          disabled={!pendingUsd}
          title={!pendingUsd ? "No balance available to reconcile yet" : undefined}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:text-gray-300"
        >
          Reconcile
        </button>
        <button
          onClick={onViewDeposits}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View Deposits
        </button>

        <div className="relative ml-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="More actions"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-sm shadow-lg py-1 w-56 z-10">
              <button
                onClick={() => {
                  onBankTransferDetails();
                  setMenuOpen(false);
                }}
                disabled={!usReceivingAccount}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Bank Transfer Details
              </button>
              <button
                onClick={() => {
                  navigate("/transactionhistory");
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Transaction History
              </button>
              <button
                disabled
                title="Coming soon"
                className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed flex items-center justify-between"
              >
                Transfer Funds
                <span className="text-xs text-gray-300">Coming soon</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransferMethodCard({
  icon,
  title,
  description,
  onView,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onView: () => void;
}) {
  return (
    <div className="border h-51  border-gray-200 rounded-sm p-5 bg-white min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 ">
          <div className="w-8 h-8 rounded-sm bg-gray-900 flex items-center justify-center text-white shrink-0">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-gray-900 truncate">{title}</h3>
        </div>
        <button
          onClick={onView}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 shrink-0"
        >
          View
        </button>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

/**
 * A simple, transparent estimate of where the rate might sit over the next
 * few days, derived only from real observed quotes (Services/fxRate.
 * service.js's accumulated snapshots) - never a black-box prediction.
 * `band` is the larger of the actual observed spread in recent snapshots
 * or a small floor (0.3% of the current rate) so it isn't zero-width
 * before much history has accumulated. `momentum` compares the earliest
 * vs latest of those same recent snapshots.
 */
function useRateOutlook(rate: LiveRate | null, history: RateHistoryPoint[]) {
  return useMemo(() => {
    if (!rate) return null;

    const current = parseFloat(rate.midMarket);
    const recent = history.slice(-10).map((h) => parseFloat(h.midMarket));
    const samples = recent.length > 0 ? recent : [current];

    const observedMin = Math.min(...samples, current);
    const observedMax = Math.max(...samples, current);
    const floor = current * 0.003;
    const band = Math.max(observedMax - observedMin, floor);

    const low = current - band / 2;
    const high = current + band / 2;

    let momentum: "Positive" | "Negative" | "Neutral" = "Neutral";
    if (samples.length >= 2) {
      const delta = samples[samples.length - 1] - samples[0];
      momentum = delta > 0.0005 ? "Positive" : delta < -0.0005 ? "Negative" : "Neutral";
    }

    return { current, low, high, targetHigh: high, momentum };
  }, [rate, history]);
}

/**
 * Dependency-free SVG chart matching the reference layout - a solid line
 * through real observed rates up to "today", then a shaded band and
 * target-high line projected across the next couple of days using
 * useRateOutlook's real-data-derived range (not a prediction model).
 */
function FxOutlookChart({
  history,
  outlook,
}: {
  history: RateHistoryPoint[];
  outlook: NonNullable<ReturnType<typeof useRateOutlook>>;
}) {
  const width = 460;
  const height = 150;
  const padding = 10;
  const todayX = padding + (width - padding * 2) * 0.42;

  const realValues = history.length > 0 ? history.map((h) => parseFloat(h.midMarket)) : [outlook.current];

  const yMin = Math.min(...realValues, outlook.low) * 0.9995;
  const yMax = Math.max(...realValues, outlook.high) * 1.0005;
  const yRange = yMax - yMin || 1;
  const toY = (v: number) => padding + (1 - (v - yMin) / yRange) * (height - padding * 2);

  const historyPoints = realValues.map((v, i) => {
    const x = padding + (i / Math.max(realValues.length - 1, 1)) * (todayX - padding);
    return { x, y: toY(v) };
  });
  const lastPoint = historyPoints[historyPoints.length - 1];

  const bandTop = toY(outlook.high);
  const bandBottom = toY(outlook.low);
  const targetY = toY(outlook.targetHigh);

  const today = new Date();
  const dayLabels = [0, 1, 2].map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  });

  return (
    <div>
      <div className="flex gap-3 text-xs">
        <span className="text-gray-400 w-12 shrink-0 text-right pt-1">{yMax.toFixed(2)}</span>
        <div className="flex-1 min-w-0">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
            {/* projected band */}
            <rect
              x={todayX}
              y={bandTop}
              width={width - padding - todayX}
              height={Math.max(bandBottom - bandTop, 1)}
              fill="#c7d2fe"
              opacity={0.35}
            />
            {/* today divider */}
            <line x1={todayX} y1={padding} x2={todayX} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
            {/* target-high line */}
            <line
              x1={todayX}
              y1={targetY}
              x2={width - padding}
              y2={targetY}
              stroke="#6366f1"
              strokeWidth="1.5"
            />
            {/* historical line */}
            <polyline
              points={historyPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {lastPoint && <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill="#3b82f6" />}
          </svg>
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-400 pl-16 mt-1">
        {dayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

const MOMENTUM_STYLES: Record<string, string> = {
  Positive: "bg-green-100 text-green-800",
  Negative: "bg-red-100 text-red-800",
  Neutral: "bg-gray-100 text-gray-700",
};

/**
 * Live USD/INR rate straight from XflowPay's own Quotes endpoint - the
 * same quoting engine a reconciliation would actually use
 * (Services/fxRate.service.js), refetched periodically since each quote
 * is only valid ~60 seconds. Target high / momentum / the projected band
 * are all computed transparently from real accumulated quotes
 * (useRateOutlook) - there's no AI model behind them, so the disclaimer
 * says "estimated from recent live rates" rather than claiming AI
 * inference.
 */
function LiveFxRateCard() {
  const [rate, setRate] = useState<LiveRate | null>(null);
  const [history, setHistory] = useState<RateHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const outlook = useRateOutlook(rate, history);

  const fetchRate = () => {
    setRefreshing(true);
    setError(null);
    getLiveRate()
      .then((r) => {
        setRate(r);
        return getRateHistory();
      })
      .then(setHistory)
      .catch((err: any) => setError(err.message || "Failed to fetch live rate"))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, 45000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 shrink-0" />
          <h2 className="text-lg font-medium text-gray-900 truncate">AI FX Insights</h2>
        </div>
        <div className="flex  items-center gap-2 min-w-0">
          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">
            3 day outlook
            {rate && (
              <>
                {" | last refreshed at "}
                {new Date(rate.fetchedAt).toLocaleString(undefined, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </span>
          <button
            onClick={fetchRate}
            disabled={refreshing}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-40"
            aria-label="Refresh rate"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="p-3 bg-gray-100 rounded-sm mb-4">
        <div className="border border-gray-200  rounded-sm p-5 bg-white">
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : rate && outlook ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">USD/INR rate may fluctuate b/w</p>
              <p className="text-2xl font-semibold text-gray-900">
                INR {outlook.low.toFixed(2)} to INR {outlook.high.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Info size={12} />
                Not financial advice - estimated from recent live rates.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4 bg-indigo-50 rounded-lg px-3 py-1.5 text-sm">
                <span className="text-indigo-700">Target high:</span>
                <span className="font-semibold text-gray-900">INR {outlook.targetHigh.toFixed(2)}</span>
              </div>
              <div
                className={`flex items-center justify-between gap-4 rounded-lg px-3 py-1.5 text-sm ${MOMENTUM_STYLES[outlook.momentum]}`}
              >
                <span>Momentum:</span>
                <span className="font-semibold">{outlook.momentum}</span>
              </div>
            </div>
          </div>

          <FxOutlookChart history={history} outlook={outlook} />

          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 mt-3"
          >
            {showDetails ? "Hide Details" : "View Details"}
          </button>

          {showDetails && (
            <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-1 max-h-40 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-xs text-gray-400">No history recorded yet.</p>
              ) : (
                [...history].reverse().map((h, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-500">
                    <span>
                      {new Date(h.fetchedAt).toLocaleString(undefined, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="text-gray-700 font-medium">INR {h.midMarket}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : null}
      </div>
      </div>
    </>
  );
}

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
                filter === f ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
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
  

  const scrollToDeposits = () => {
    document.getElementById("payments-received")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-8 overflow-y-auto h-full">
      {/* Account Summary */}
      <div className="rounded-sm p-3 bg-gray-100">
        <AccountSummaryCard
        usReceivingAccount={usReceivingAccount}
        balance={balance}
        onViewDeposits={scrollToDeposits}
        onBankTransferDetails={() => setModalSelection("local")}
      />
      </div>

      {/* Transfer Details + Live FX Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-medium text-gray-900">Transfer Details</h2>
            <Info size={15} className="text-gray-400" />
          </div>

          <div className="flex flex-col bg-gray-100 rounded-sm p-3 gap-4">
            <TransferMethodCard
              icon={<Landmark size={16} />}
              title="Bank Transfers"
              description="We support ACH, Fedwire and SWIFT transfers."
              onView={() => setModalSelection("local")}
            />

            <TransferMethodCard
              icon={<Coins size={16} />}
              title="Stablecoin Payments"
              description="We support EVM, Solana and Tron."
              onView={() => setModalSelection("stablecoin")}
            />
          </div>
        </section>

        <section className="min-w-0 ">
          <LiveFxRateCard />
        </section>
      </div>

      <WaysToReceiveModal
        key={modalSelection}
        open={modalSelection !== null}
        onClose={() => setModalSelection(null)}
        usReceivingAccount={usReceivingAccount}
        bankAccounts={bankAccounts}
        stablecoinEnabled={!!user?.stablecoinEnabled}
        initialSelection={modalSelection || "local"}
      />

      {/* Payments Received from Partners */}
      <PaymentsReceivedTable />

      
    </div>
  );
}
