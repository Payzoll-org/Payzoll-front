import { useState } from "react";
import {
  ChevronDown,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ArrowRightLeft,
  Lock,
  QrCode,
} from "lucide-react";

/**
 * Scaffold only - static/mock data throughout. Swap the constants below for
 * real wallet/rate state (useAuthStore, fxRateApi, an accounts/wallet
 * service, etc.) as those pieces come online. Structure and alignment are
 * the point here, not the data source.
 */

// ---------------------------------------------------------------------------
// Left: Total Balance (wallet) card
// ---------------------------------------------------------------------------

function TinySparkline({ points }: { points: number[] }) {
  const width = 140;
  const height = 60;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WalletBalanceCard() {
  // Mock data - replace with real wallet/network/token state.
  const network = "Arbitrum";
  const token = "USDT";
  const balance = "1,057.92";
  const balanceInr = "1,00,929.14";
  const walletAddress = "0x3A6f...9cC2";
  const activity7d = [40, 55, 48, 70, 62, 90, 120];

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-6 flex flex-col gap-6 h-full">
      {/* Header: title + network/token selectors */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Total Balance</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 rounded-full px-3 py-1.5 text-sm transition-colors">
            {network}
            <ChevronDown size={14} />
          </button>
          <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 rounded-full px-3 py-1.5 text-sm transition-colors">
            {token}
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Balance figure */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold">{balance}</span>
          <span className="text-gray-400 text-lg">{token}</span>
          <Eye size={16} className="text-gray-500 ml-1" />
        </div>
        <p className="text-gray-400 text-sm mt-1">≈ ₹{balanceInr} INR</p>
      </div>

      {/* Send / Receive */}
      <div className="flex items-center gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-900 rounded-xl py-2.5 font-medium hover:bg-gray-100 transition-colors">
          <ArrowUpRight size={16} />
          Send
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 bg-white/10 rounded-xl py-2.5 font-medium hover:bg-white/15 transition-colors">
          <ArrowDownLeft size={16} />
          Receive
        </button>
      </div>

      {/* Wallet address + recent activity */}
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs text-gray-400">Your Wallet Address</p>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-md flex items-center justify-center shrink-0">
              <QrCode size={32} className="text-gray-900" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium truncate">{walletAddress}</span>
                <button aria-label="Copy address" className="text-gray-400 hover:text-white shrink-0">
                  <Copy size={13} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{network} One</p>
            </div>
          </div>
          <button className="text-xs text-gray-400 hover:text-white text-left mt-1">
            Show transaction history →
          </button>
        </div>

        <div className="bg-white/5 rounded-xl p-4 flex flex-col">
          <p className="text-xs text-gray-400 mb-2">Recent Activity (7D)</p>
          <TinySparkline points={activity7d} />
        </div>
      </div>
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
    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-6 h-full">
      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-full p-1 w-full sm:w-fit">
        <button
          onClick={() => setTab("offramp")}
          className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === "offramp" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Offramp Calculator
        </button>
        <button
          onClick={() => setTab("onramp")}
          className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === "onramp" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Onramp Calculator
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Left: live rate + chart */}
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

          <div className="flex items-center gap-2 mt-4">
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
        <div className="flex flex-col gap-3">
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

          <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-medium mt-2 transition-colors">
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

export default function WalletOfframpWidget() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-stretch">
      <WalletBalanceCard />
      <OfframpCalculatorCard />
    </div>
  );
}
