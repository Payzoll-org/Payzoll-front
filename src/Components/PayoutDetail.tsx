import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Check, Download, FileText } from "lucide-react";
import { getPayoutDetail, downloadPaymentAdvice, type PayoutDetail as PayoutDetailType } from "../services/payoutApi";

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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      className="text-gray-400 hover:text-gray-700"
      aria-label="Copy"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  );
}

function AmountRow({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={`text-sm ${muted ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
      <span className={`text-sm ${strong ? "font-bold text-gray-900" : "font-medium text-gray-900"}`}>{value}</span>
    </div>
  );
}

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PayoutDetail() {
  const { payoutId } = useParams<{ payoutId: string }>();
  const navigate = useNavigate();
  const [payout, setPayout] = useState<PayoutDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!payoutId) return;
    getPayoutDetail(payoutId)
      .then(setPayout)
      .catch((err: any) => setError(err.message || "Failed to load payout"))
      .finally(() => setLoading(false));
  }, [payoutId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !payout) {
    return (
      <div className="p-8">
        <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-sm text-red-700">{error || "Payout not found"}</div>
      </div>
    );
  }

  const firstReceivable = payout.receivables[0];

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-base font-semibold text-gray-900">Payout Reference: {payout.id}</h2>
          <StatusPill status={payout.status} />
          
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Payout ID: {payout.id}</span>
          <CopyButton value={payout.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column */}
        <div className="border border-gray-200 rounded-2xl p-6 min-w-0">
          <p className="text-xs text-gray-500 mb-1">
            {firstReceivable?.partnerName && <>Partner: <span className="text-blue-600 font-medium">{firstReceivable.partnerName}</span> · </>}
            {firstReceivable?.purposeCode && (
              <>Payout for Purpose Code: {firstReceivable.purposeCode} - {firstReceivable.purposeCodeDescription}</>
            )}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2 mb-4">
            {payout.settledAmount ? `${payout.settledCurrency} ${payout.settledAmount}` : "Pending settlement"}
          </p>

          <div className="border-t border-gray-100 pt-2">
            {payout.grossAmount && (
              <AmountRow label="Total Gross Amount" value={`${payout.breakdownCurrency} ${payout.grossAmount}`} />
            )}
            {payout.feesAmount && (
              <AmountRow label="Xflow Payout Fees" value={`${payout.breakdownCurrency} ${payout.feesAmount}`} />
            )}
            {payout.netAmount && (
              <AmountRow label="Net Payout" value={`${payout.breakdownCurrency} ${payout.netAmount}`} muted />
            )}
            {payout.exchangeRate && (
              <AmountRow label={`Exch. Rate (${payout.breakdownCurrency} 1.00)`} value={`${payout.settledCurrency} ${payout.exchangeRate}`} muted />
            )}
          </div>

          {payout.settledAmount && (
            <div className="border-t border-gray-100 mt-2 pt-2">
              <AmountRow label="Final Settled Amount" value={`${payout.settledCurrency} ${payout.settledAmount}`} strong />
            </div>
          )}

          <div className="border-t border-gray-100 mt-4 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payout Tracker</h3>
            {payout.tracker.length === 0 ? (
              <p className="text-xs text-gray-400">Awaiting updates.</p>
            ) : (
              <div className="flex flex-col">
                {payout.tracker.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${i === payout.tracker.length - 1 ? "bg-green-500" : "bg-blue-400"}`} />
                      {i < payout.tracker.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className="pb-4">
                      <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded px-2 py-0.5">
                        {formatEventTime(step.timestamp)}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{step.title}</p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 min-w-0">
          <div className="border border-gray-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Bank Details</h3>
            {payout.bankInfo ? (
              <AmountRow
                label="Bank Info"
                value={`${payout.bankInfo.label}${payout.bankInfo.last4 ? ` - XXXX${payout.bankInfo.last4}` : ""}`}
              />
            ) : (
              <p className="text-xs text-gray-400">Not available.</p>
            )}
            {payout.statementDescriptor && <AmountRow label="Statement Descriptor" value={payout.statementDescriptor} />}
            {payout.utr && <AmountRow label="UTR" value={payout.utr} />}
          </div>

          <div className="border border-gray-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Documents</h3>
            {payout.hasPaymentAdvice ? (
              <button
                onClick={() => {
                  if (!payoutId) return;
                  setDownloading(true);
                  downloadPaymentAdvice(payoutId).finally(() => setDownloading(false));
                }}
                disabled={downloading}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <FileText size={15} />
                FIRA certificate
                <Download size={14} />
              </button>
            ) : (
              <p className="text-xs text-gray-400">No documents available yet.</p>
            )}
          </div>

          {payout.receivables.length > 0 && (
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Payout Break-up By Receivables</h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 py-2 px-3">Reconcile Date</th>
                      <th className="text-left text-xs font-medium text-gray-500 py-2 px-3">Invoice Number</th>
                      <th className="text-left text-xs font-medium text-gray-500 py-2 px-3">Invoice Description</th>
                      <th className="text-right text-xs font-medium text-gray-500 py-2 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payout.receivables.map((r) => (
                      <tr key={r.receivableId} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 px-3 text-sm text-gray-700 whitespace-nowrap">
                          {r.reconcileDate ? formatTimestamp(r.reconcileDate) : "-"}
                        </td>
                        <td className="py-2 px-3 text-sm text-blue-600">{r.invoiceNumber || "-"}</td>
                        <td className="py-2 px-3 text-sm text-gray-700">{r.invoiceDescription || "-"}</td>
                        <td className="py-2 px-3 text-sm text-gray-900 text-right whitespace-nowrap">
                          {r.amount ? `${r.currency} ${r.amount}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                {payout.grossAmount && <AmountRow label="Gross Payout" value={`${payout.breakdownCurrency} ${payout.grossAmount}`} />}
                {payout.feesAmount && <AmountRow label="Xflow Payout Fees" value={`${payout.breakdownCurrency} ${payout.feesAmount}`} />}
                {payout.netAmount && <AmountRow label="Net Payout" value={`${payout.breakdownCurrency} ${payout.netAmount}`} strong />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
