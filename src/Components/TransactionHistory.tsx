import { useEffect, useState } from "react";
import { Clock, ArrowUpRight, ArrowDownLeft, ArrowRightLeft } from "lucide-react";
import { getTransactions, TRANSACTION_TYPE_LABELS, type Transaction } from "../services/transactionApi";

// Rough "does this read as money in vs money out vs internal movement"
// grouping, purely for the icon/color - the actual from/to amounts below
// are always shown as-is, so nothing depends on this being exactly right.
const CREDIT_TYPES = new Set(["funds_credit", "deposit_reversal", "adjustment_positive", "payout_failure"]);
const DEBIT_TYPES = new Set([
  "payout",
  "payout_fee",
  "processing_fee",
  "fx_fee",
  "funds_debit",
  "fee_advance_debit",
  "platform_partner_debit",
  "platform_currency_debit",
  "quote_lock_live_booking_fx_fee",
  "adjustment_negative",
]);

function TransactionIcon({ type }: { type: string }) {
  if (CREDIT_TYPES.has(type)) {
    return (
      <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
        <ArrowDownLeft size={16} className="text-green-600" />
      </div>
    );
  }
  if (DEBIT_TYPES.has(type)) {
    return (
      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
        <ArrowUpRight size={16} className="text-red-600" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
      <ArrowRightLeft size={16} className="text-gray-500" />
    </div>
  );
}

function formatDate(createdSeconds: number) {
  return new Date(createdSeconds * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const label = TRANSACTION_TYPE_LABELS[transaction.type] || transaction.type;
  const sameCurrency = transaction.from.currency === transaction.to.currency;

  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
      <TransactionIcon type={transaction.type} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(transaction.created)}</p>
      </div>

      <div className="text-right shrink-0">
        {sameCurrency ? (
          <p className="text-sm font-semibold text-gray-900">
            {transaction.to.amount} <span className="text-gray-400 font-normal">{transaction.to.currency}</span>
          </p>
        ) : (
          <p className="text-sm font-semibold text-gray-900">
            {transaction.from.amount} <span className="text-gray-400 font-normal">{transaction.from.currency}</span>
            <span className="text-gray-300 mx-1">→</span>
            {transaction.to.amount} <span className="text-gray-400 font-normal">{transaction.to.currency}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTransactions({ limit: 10 })
      .then(({ transactions, hasNext }) => {
        setTransactions(transactions);
        setHasNext(hasNext);
      })
      .catch((err: any) => setError(err.message || "Failed to load transaction history"))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = () => {
    const last = transactions[transactions.length - 1];
    if (!last) return;

    setLoadingMore(true);
    getTransactions({ limit: 10, startingAfter: last.id })
      .then(({ transactions: more, hasNext }) => {
        setTransactions((prev) => [...prev, ...more]);
        setHasNext(hasNext);
      })
      .catch((err: any) => setError(err.message || "Failed to load more transactions"))
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto h-full">
      <div className="flex items-center gap-2">
        <Clock size={18} className="text-gray-700" />
        <h2 className="text-lg font-medium text-gray-900">Transaction History</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-sm text-red-700">{error}</div>
      ) : transactions.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-6 text-sm text-gray-500">
          No transactions yet. Activity like deposits, reconciliations, and payouts will show up here.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl px-5">
          {transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
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
