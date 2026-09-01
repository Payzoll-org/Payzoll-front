import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
} from "lucide-react";
import type { Balance, BalanceEntry } from "../services/accountActivationApi";
import { getLiveRate, getRateHistory, type LiveRate, type RateHistoryPoint } from "../services/fxRateApi";
import { getPayoutFeeRule, type PayoutFeeRule } from "../services/feePlanApi";
import { useAuthStore } from "../Zustand/userStore";
import KycRequiredModal from "./KycRequiredModal";

// Shared gate for Withdraw/Deposit/Reconcile - same user.kycVerified field
// KycBanner already polls and shows a persistent banner for. Rather than
// let a not-yet-verified user into a flow that would just fail server-side
// later, stop them here and prompt them to finish KYC instead of proceeding.
function requireKyc(kycVerified: boolean | undefined, onBlocked: () => void, action: () => void) {
  if (!kycVerified) {
    onBlocked();
    return;
  }
  action();
}

// ---------------------------------------------------------------------------
// Left: Total Balance (wallet) card
// ---------------------------------------------------------------------------

function nonZero(entries: BalanceEntry[]) {
  return entries.filter((e) => parseFloat(e.amount) > 0);
}

const CURRENCY_OPTIONS = ["USD", "USDC", "USDT"] as const;
type CurrencyOption = (typeof CURRENCY_OPTIONS)[number];

const NETWORK_OPTIONS = ["EVM", "Solana", "Tron"] as const;
type NetworkOption = (typeof NETWORK_OPTIONS)[number];

const CURRENCY_ICON_COLOR: Record<CurrencyOption, string> = {
  USD: "bg-gray-600",
  USDC: "bg-blue-500",
  USDT: "bg-emerald-500",
};

// Explicit labels rather than slicing the currency string - "USD" has no
// 4th character to index into the way "USDC"/"USDT" do.
const CURRENCY_ICON_LABEL: Record<CurrencyOption, string> = {
  USD: "$",
  USDC: "C",
  USDT: "T",
};

function CurrencyIcon({ currency }: { currency: CurrencyOption }) {
  return (
    <span
      className={`w-4 h-4 rounded-full ${CURRENCY_ICON_COLOR[currency]} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}
    >
      {CURRENCY_ICON_LABEL[currency]}
    </span>
  );
}

function NetworkIcon() {
  return (
    <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
      <ChevronUp size={10} className="text-white" strokeWidth={3} />
    </span>
  );
}

/**
 * Small pill button that opens a floating option list on click - used for
 * both the network and currency selectors on the wallet card header.
 */
function ChipDropdown<T extends string>({
  value,
  options,
  onChange,
  renderIcon,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  renderIcon?: (v: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      >
        {renderIcon?.(value)}
        {value}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-lg py-1 min-w-[110px] z-20">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium hover:bg-white/10 transition-colors ${
                  opt === value ? "text-blue-400" : "text-white/80"
                }`}
              >
                {renderIcon?.(opt)}
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WalletBalanceCard({
  balance,
  onDeposit,
  onRequireKyc,
}: {
  balance: Balance | null;
  onDeposit: () => void;
  onRequireKyc: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currency, setCurrency] = useState<CurrencyOption>("USD");
  const [network, setNetwork] = useState<NetworkOption>("EVM");

  // Real figures from XflowPay's own Balance object - pending (received,
  // not yet reconciled) first, falling back to available, same precedence
  // AccountsOverview's AccountSummaryCard uses for the USD headline.
  const pendingEntry = balance ? nonZero(balance.pending).find((b) => b.currency === currency) : undefined;
  const availableEntry = balance ? nonZero(balance.available).find((b) => b.currency === currency) : undefined;
  const amount = pendingEntry?.amount || availableEntry?.amount || "0.00";

  return (
    <div className="bg-[#010631] text-white rounded-lg p-6 flex flex-col gap-6 h-full min-w-0 overflow-hidden">
      {/* Header: title + network/currency selectors */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-md">Total Balance</h2>
        <div className="flex items-center gap-2">
          <ChipDropdown
            value={network}
            options={NETWORK_OPTIONS}
            onChange={setNetwork}
            renderIcon={() => <NetworkIcon />}
          />
          <ChipDropdown
            value={currency}
            options={CURRENCY_OPTIONS}
            onChange={setCurrency}
            renderIcon={(c) => <CurrencyIcon currency={c} />}
          />
        </div>
      </div>

      {/* Balance figure - real balance for the selected currency */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-normal">{amount}</span>
          <span className="text-gray-400 text-lg">{currency}</span>
          <Eye size={16} className="text-white/60 ml-1" />
        </div>
      </div>

      {/* Convert / Deposit */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => requireKyc(user?.kycVerified, onRequireKyc, () => navigate("/reconcile"))}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-900 rounded-sm py-2 font-medium hover:bg-gray-100 transition-colors"
        >
          <ArrowUpRight size={16} />
          Withdraw
        </button>
        <button
          onClick={() => requireKyc(user?.kycVerified, onRequireKyc, onDeposit)}
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 rounded-sm py-2 font-medium hover:bg-white/15 transition-colors"
        >
          <ArrowDownLeft size={16} />
          Deposit
        </button>
      </div>
      <p className="text-xs text-gray-400">
        <strong className="text-gray-300 font-semibold">Note:</strong> Deposits may take a few hours to reflect in your USD VBAN balance.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right: Offramp / Onramp calculator card
// ---------------------------------------------------------------------------

function RateChart({ points }: { points: number[] }) {
  const width = 500;
  const height = 450;
  const padding = 1;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (p - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${padding},${height - padding} ${linePoints} ${width - padding},${height - padding}`;
  const last = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full mt-5 h-50">
      <polygon points={areaPoints} fill="#3b82f6" opacity={0.08} />
      <polyline
        points={linePoints}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last && <circle cx={last.x} cy={last.y} r="4" fill="#3b82f6" />}
    </svg>
  );
}

/**
 * Real inward-remittance calculator: pulls the same live rate
 * (fxRateApi.getLiveRate) and payout fee rule (feePlanApi.getPayoutFeeRule)
 * the actual Reconcile flow uses, so the numbers shown here are never
 * invented - just computed ahead of time from the same sources.
 *
 * The fee only ever applies to the USD leg (XflowPay's FeePlan is keyed by
 * source currency, not by which crypto originally funded the balance -
 * Services/reconcile.service.js), so "You Pay" is fixed to USD rather than
 * offering a USDT/USDC toggle that wouldn't actually change anything.
 */
function OfframpCalculatorCard({ onRequireKyc }: { onRequireKyc: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [payAmount, setPayAmount] = useState("1000");

  const [liveRate, setLiveRate] = useState<LiveRate | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState<string | null>(null);

  const [rateHistory, setRateHistory] = useState<RateHistoryPoint[]>([]);

  const [feeRule, setFeeRule] = useState<PayoutFeeRule | null>(null);
  const [feeLoading, setFeeLoading] = useState(true);

  useEffect(() => {
    getLiveRate()
      .then(setLiveRate)
      .catch((err: any) => setRateError(err.message || "Failed to fetch live rate"))
      .finally(() => setRateLoading(false));

    getRateHistory(30)
      .then(setRateHistory)
      .catch(() => {});

    getPayoutFeeRule("USD")
      .then(setFeeRule)
      .catch(() => setFeeRule(null))
      .finally(() => setFeeLoading(false));
  }, []);

  const grossAmount = Number(payAmount) || 0;
  const payoutFee = feeRule
    ? Math.max(Number(feeRule.fixed) + (grossAmount * Number(feeRule.variable)) / 100, Number(feeRule.minimum))
    : null;
  const netAmount = payoutFee !== null ? Math.max(grossAmount - payoutFee, 0) : null;
  const receiveAmount =
    liveRate && netAmount !== null
      ? (netAmount * Number(liveRate.userRate)).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

  const chartPoints = rateHistory.length >= 2 ? rateHistory.map((p) => Number(p.userRate)) : null;

  return (
    <div className="bg-white border border-gray-200  rounded-lg p-5 flex flex-col gap-6 min-w-0 overflow-hidden">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Payout Calculator</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Estimate what a USD → INR payout would cost right now.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2  gap-5 flex-1 min-w-0">
        {/* Left: live rate + real history */}
       <div className="flex flex-col h-full">
  <div>
    {rateLoading ? (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>1 USD = ... INR</span>
        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Live
        </span>
      </div>
    ) : rateError || !liveRate ? (
      <div className="text-sm text-red-600">
        {rateError || "Rate unavailable"}
      </div>
    ) : (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>
          1 USD = ₹{Number(liveRate.userRate)} INR
        </span>

        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Live
        </span>
      </div>
    )}

    <div className="flex items-baseline gap-2 mt-1 mb-4">
      {rateLoading ? (
        <span className="text-3xl font-semibold text-gray-300">
          ...
        </span>
      ) : rateError || !liveRate ? (
        <span className="text-sm text-red-600">
          {rateError || "Rate unavailable"}
        </span>
      ) : (
        <>
          <span className="text-3xl font-semibold text-gray-900">
            ₹{Number(liveRate.userRate).toFixed(2)}
          </span>

          <span className="text-xs text-gray-400">
            updated{" "}
            {new Date(liveRate.fetchedAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </>
      )}
    </div>

    {chartPoints ? (
      <RateChart points={chartPoints} />
    ) : (
      <div className="h-40 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
        Rate history will appear here as more conversions happen
      </div>
    )}
  </div>
</div>

        {/* Right: convert form */}
        <div className="flex flex-col  gap-3 h-full ">
          <div>
            <p className="text-sm text-gray-500 mb-1.5">You Pay</p>
            <div className="flex items-stretch border border-gray-200 rounded-sm overflow-hidden">
              <input
                type="text"
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="flex-1 min-w-0 px-3 py-1 text-md font-semibold text-gray-900 outline-none"
              />
              <span className="flex items-center px-4 border-l border-gray-200 text-sm font-medium text-gray-500 shrink-0">
                USD
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm px-0.5">
            <span className="text-gray-500">Payout Fee</span>
            <span className="font-medium text-red-600">
              {feeLoading ? "..." : payoutFee !== null ? `-$${payoutFee.toFixed(2)}` : "Unavailable"}
            </span>
          </div>
          {feeRule && (
            <p className="text-[11px] text-gray-400 -mt-2 px-0.5">
              ${feeRule.fixed} fixed + {feeRule.variable}% (min ${feeRule.minimum})
            </p>
          )}

          <div>
            <p className="text-xs text-gray-500 mt-2 mb-1.5">You Receive (after fee)</p>
            <div className="flex items-stretch border border-gray-200 rounded-sm overflow-hidden">
              <input
                type="text"
                readOnly
                value={receiveAmount ?? (feeLoading || rateLoading ? "..." : "-")}
                className="flex-1 min-w-0 px-3 py-1.5 text-md font-bold text-gray-900 outline-none bg-gray-50"
              />
              <span className="flex items-center gap-1.5 px-4 border-l border-gray-200 text-sm font-medium text-gray-500 shrink-0">
                🇮🇳 INR
              </span>
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-[11px] text-gray-400 px-0.5">
            <Info size={12} className="shrink-0 mt-0.5" />
            <span>Estimate only, final amount confirmed on withdrawl.</span>
          </div>

          <button
            onClick={() => requireKyc(user?.kycVerified, onRequireKyc, () => navigate("/reconcile"))}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded-sm py-1.5 font-medium  transition-colors"
          >
            <ArrowUpRight size={15} />
            Withdraw in INR
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Combined widget
// ---------------------------------------------------------------------------

export default function WalletOfframpWidget({
  balance,
  onDeposit,
}: {
  balance: Balance | null;
  onDeposit: () => void;
}) {
  const navigate = useNavigate();
  const [kycModalOpen, setKycModalOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-xl bg-gray-100 p-4 items-stretch">
      <WalletBalanceCard balance={balance} onDeposit={onDeposit} onRequireKyc={() => setKycModalOpen(true)} />
      <OfframpCalculatorCard onRequireKyc={() => setKycModalOpen(true)} />
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
