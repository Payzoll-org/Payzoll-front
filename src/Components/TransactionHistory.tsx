import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { getPayouts, type Payout } from "../services/payoutApi";

const STATUS_STYLES: Record<string, string> = {
  settled: "bg-green-100 text-green-800",
  processing: "bg-amber-100 text-amber-800",
  initialized: "bg-amber-100 text-amber-800",
  hold: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${STATUS_STYLES[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function formatDate(seconds: number | null) {
  if (!seconds) return "-";
  return new Date(seconds * 1000).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatEta(seconds: number | null) {
  if (!seconds) return "-";
  const date = new Date(seconds * 1000);
  return `ETA: ${date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })} by ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function PayoutRow({ payout }: { payout: Payout }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-4 px-4 text-sm text-gray-700 whitespace-nowrap">{formatDate(payout.created)}</td>
      <td className="py-4 px-4 text-sm">
        <Link to={`/transactionhistory/${payout.id}`} className="text-arc-gold-600 hover:text-arc-gold-700 font-medium">
          {payout.id}
        </Link>
      </td>
      <td className="py-4 px-4 text-sm text-gray-700 whitespace-nowrap">
        {payout.grossAmount ? `${payout.grossCurrency} ${payout.grossAmount}` : "-"}
      </td>
      <td className="py-4 px-4 text-sm text-gray-700 whitespace-nowrap">
        {payout.settledAmount ? `${payout.settledCurrency} ${payout.settledAmount}` : "-"}
      </td>
      <td className="py-4 px-4">
        <StatusPill status={payout.status} />
      </td>
      <td className="py-4 px-4 text-sm text-gray-500 whitespace-nowrap">{formatEta(payout.arrivalDate)}</td>
    </tr>
  );
}

function PayoutCard({ payout }: { payout: Payout }) {
  return (
    <div className="p-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Link
          to={`/transactionhistory/${payout.id}`}
          className="text-arc-gold-600 hover:text-arc-gold-700 font-medium text-sm truncate"
        >
          {payout.id}
        </Link>
        <StatusPill status={payout.status} />
      </div>
      <div className="flex items-center justify-between text-sm text-gray-700">
        <span className="text-gray-500">Gross</span>
        <span>{payout.grossAmount ? `${payout.grossCurrency} ${payout.grossAmount}` : "-"}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-700 mt-1">
        <span className="text-gray-500">Settled</span>
        <span>{payout.settledAmount ? `${payout.settledCurrency} ${payout.settledAmount}` : "-"}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <span>{formatDate(payout.created)}</span>
        <span>{formatEta(payout.arrivalDate)}</span>
      </div>
    </div>
  );
}

export default function TransactionHistory() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    getPayouts({ limit: 10 })
      .then(({ payouts, hasNext }) => {
        setPayouts(payouts);
        setHasNext(hasNext);
      })
      .catch((err: any) => setError(err.message || "Failed to load payouts"))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = () => {
    const last = payouts[payouts.length - 1];
    if (!last) return;

    setLoadingMore(true);
    getPayouts({ limit: 10, startingAfter: last.id })
      .then(({ payouts: more, hasNext }) => {
        setPayouts((prev) => [...prev, ...more]);
        setHasNext(hasNext);
      })
      .catch((err: any) => setError(err.message || "Failed to load more payouts"))
      .finally(() => setLoadingMore(false));
  };

  const sorted = useMemo(() => {
    const withEta = payouts.filter((p) => p.arrivalDate);
    const withoutEta = payouts.filter((p) => !p.arrivalDate);
    withEta.sort((a, b) => (sortDesc ? (b.arrivalDate || 0) - (a.arrivalDate || 0) : (a.arrivalDate || 0) - (b.arrivalDate || 0)));
    return [...withEta, ...withoutEta];
  }, [payouts, sortDesc]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl text-gray-900">Transaction History</h2>
        <button
          onClick={() => setSortDesc((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-sm px-4 py-2 hover:bg-gray-50 self-start sm:self-auto"
        >
          <ArrowUpDown size={14} />
          Sort: Expected On ({sortDesc ? "Newest-Oldest" : "Oldest-Newest"})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 rounded-sm p-6 text-sm text-red-700">{error}</div>
      ) : payouts.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-sm p-6 text-sm text-gray-500">
          No payouts yet. Reconciled funds dispatched to your bank account will show up here.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-sm overflow-hidden md:overflow-x-auto">
          <div className="md:hidden divide-y divide-gray-100">
            {sorted.map((p) => (
              <PayoutCard key={p.id} payout={p} />
            ))}
          </div>
          <table className="hidden md:table w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Initiated On</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Payout Reference</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Gross Payout</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Settled Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Expected On</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <PayoutRow key={p.id} payout={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNext && !loading && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 h-10 flex items-center justify-center gap-2 bg-gray-100 text-gray-800 text-sm font-medium
                      rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
