import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Lock,
} from "lucide-react";
import type { Balance, BalanceEntry } from "../services/accountActivationApi";

/**
 * Right-side offramp calculator is still a UI scaffold (static/mock rate
 * data) - swap chartPoints/rate for fxRateApi.getLiveRate()/getRateHistory()
 * as that piece comes online. The wallet card on the left uses the real
 * `balance` prop (fetched via getBalance() in AccountsOverview, straight
 * from XflowPay's own Balance object).
 */

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
}: {
  balance: Balance | null;
  onDeposit: () => void;
}) {
  const navigate = useNavigate();
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
          onClick={() => navigate("/reconcile")}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-900 rounded-sm py-2 font-medium hover:bg-gray-100 transition-colors"
        >
          <ArrowUpRight size={16} />
          Withdraw in INR
        </button>
        <button
          onClick={onDeposit}
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 rounded-sm py-2 font-medium hover:bg-white/15 transition-colors"
        >
          <ArrowDownLeft size={16} />
          Deposit
        </button>
      </div>
      <p className="text-xs text-gray-400">
        The amount you deposited here will be reflected in your account within a few hours.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right: Offramp / Onramp calculator card
// ---------------------------------------------------------------------------

function RateChart({ points }: { points: number[] }) {
  const width = 460;
  const height = 160;
  const padding = 10;
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
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
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

function OfframpCalculatorCard() {
  const [tab, setTab] = useState<"offramp" | "onramp">("offramp");
  const [period, setPeriod] = useState<"7D" | "30D" | "90D">("30D");
  const [payAmount, setPayAmount] = useState("1000");
  const [payToken, setPayToken] = useState("USDT");
  const [receiveCurrency, setReceiveCurrency] = useState("INR");

  // Mock data - replace with fxRateApi.getLiveRate() / getRateHistory().
  const rate = 95.45;
  const rateChangePct = 0.42;
  const chartPoints = [93.8, 94.1, 93.9, 94.6, 95.0, 94.8, 95.4, 95.2, 95.7, 95.45];
  const receiveAmount = (parseFloat(payAmount || "0") * rate).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="bg-white border border-gray-200  rounded-lg p-4 flex flex-col gap-6 min-w-0 overflow-hidden">
      {/* Tabs */}
      <div className="flex bg-gray-100 rounded- p-1 w-full sm:w-fit">
        <button
          onClick={() => setTab("offramp")}
          className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-medium transition-colors ${
            tab === "offramp" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Offramp Calculator
        </button>
        <button
          onClick={() => setTab("onramp")}
          className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-medium transition-colors ${
            tab === "onramp" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Onramp Calculator
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(0,320px)] gap-8 flex-1 min-w-0">
        {/* Left: live rate + chart */}
        <div className="flex flex-col h-full min-w-0">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>
                1 {payToken} = ₹{rate.toFixed(4)} INR
              </span>
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Live
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1 mb-4">
              <span className="text-3xl font-semibold text-gray-900">₹{rate.toFixed(2)}</span>
              <span className="text-sm font-medium text-green-600">+{rateChangePct}%</span>
            </div>

            <RateChart points={chartPoints} />
          </div>

          <div className="flex items-center gap-2 mt-4 lg:mt-auto">
            {(["7D", "30D", "90D"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  period === p
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Right: convert form */}
        <div className="flex flex-col gap-3 h-full min-w-0">
          {/* Network / rail selector */}
          <button className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors">
            Stellar
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          <div>
            <p className="text-xs text-gray-500 mb-1.5">You Pay</p>
            <div className="flex items-stretch border border-gray-200 rounded-xl overflow-hidden">
              <input
                type="text"
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="flex-1 min-w-0 px-4 py-3 text-lg font-semibold text-gray-900 outline-none"
              />
              <button
                onClick={() => setPayToken(payToken === "USDT" ? "USDC" : "USDT")}
                className="flex items-center gap-1 px-4 border-l border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shrink-0"
              >
                {payToken}
                <ChevronDown size={14} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              aria-label="Swap direction"
              onClick={() => setTab(tab === "offramp" ? "onramp" : "offramp")}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ArrowRightLeft size={15} className="rotate-90" />
            </button>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1.5">You Receive</p>
            <div className="flex items-stretch border border-gray-200 rounded-xl overflow-hidden">
              <input
                type="text"
                readOnly
                value={receiveAmount}
                className="flex-1 min-w-0 px-4 py-3 text-lg font-semibold text-gray-900 outline-none bg-gray-50"
              />
              <button
                onClick={() => setReceiveCurrency(receiveCurrency === "INR" ? "USD" : "INR")}
                className="flex items-center gap-1.5 px-4 border-l border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shrink-0"
              >
                {receiveCurrency === "INR" ? "🇮🇳" : "🇺🇸"} {receiveCurrency}
              </button>
            </div>
          </div>

          <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-medium mt-auto transition-colors">
            <Lock size={15} />
            Lock Rate & Convert
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-xl bg-gray-100 p-4 items-stretch">
      <WalletBalanceCard balance={balance} onDeposit={onDeposit} />
      <OfframpCalculatorCard />
    </div>
  );
}
