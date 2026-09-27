import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../Components/AppShell";
import { deleteInvoice, listInvoices } from "../services/invoiceApi";
import type { InvoiceListResult, InvoiceStatus } from "../services/invoiceApi";
import { displayDate, formatMinorString } from "../libs/invoice";

function InvoicesContent() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // Whitelist the query value - never pass an arbitrary string through.
  const tab: InvoiceStatus = params.get("tab") === "active" ? "active" : "draft";
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<InvoiceListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setResult(await listInvoices({ status: tab, page }));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (next: InvoiceStatus) => {
    setPage(1);
    setParams(next === "active" ? { tab: "active" } : {}, { replace: true });
  };

  const onDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete invoice ${label}? This cannot be undone.`)) return;
    try {
      await deleteInvoice(id);
      toast.success("Invoice deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the invoice");
    }
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Invoices</h1>
          <p className="text-xs text-gray-500">Drafts are works in progress. Active invoices are complete and issued.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/invoices/new")}
          className="inline-flex items-center gap-2 rounded-sm bg-arc-gold-500 hover:bg-arc-gold-600 text-white px-3 py-2 text-sm font-medium"
        >
          <Plus size={16} /> New invoice
        </button>
      </div>

      <div role="tablist" className="flex border-b border-gray-100">
        {(["draft", "active"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            type="button"
            onClick={() => switchTab(k)}
            className={`px-4 py-2 text-sm font-medium ${tab === k ? "text-arc-gold-600 border-b-2 border-arc-gold-500" : "text-gray-500 hover:text-gray-700"}`}
          >
            {k === "draft" ? "Drafts" : "Active"}
            {result && <span className="ml-1.5 text-xs text-gray-400">{result.counts[k]}</span>}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {failed && !loading && (
        <div className="text-sm text-red-600">
          Could not load invoices.{" "}
          <button type="button" onClick={load} className="underline">Retry</button>
        </div>
      )}

      {!loading && !failed && result && result.invoices.length === 0 && (
        <div className="border border-dashed border-gray-200 rounded-sm p-10 text-center text-gray-500">
          <FileText className="mx-auto mb-2 text-gray-300" size={32} />
          <p className="text-sm">{tab === "draft" ? "No drafts yet." : "No active invoices yet."}</p>
        </div>
      )}

      {!loading && !failed && result && result.invoices.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-sm bg-white">
          {result.invoices.map((inv) => {
            const label = inv.invoiceNo ? `#${inv.invoiceNo}` : "(no number)";
            return (
              <li key={inv._id} className="flex items-center gap-2 pr-3 hover:bg-gray-50">
                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${inv._id}`)}
                  className="flex-1 min-w-0 text-left px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1"
                >
                  <span className="text-sm font-medium text-gray-900 truncate">{label}</span>
                  <span className="text-sm text-gray-600 truncate">{inv.toName || "No client yet"}</span>
                  <span className="text-xs text-gray-500">{displayDate(inv.date) || "No date"}</span>
                  <span className="text-sm font-medium text-gray-900 md:text-right">
                    {inv.currency} {formatMinorString(inv.total, inv.currency)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Edit invoice ${label}`}
                  onClick={() => navigate(`/invoices/${inv._id}`)}
                  className="text-gray-400 hover:text-arc-gold-600 p-2"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete invoice ${label}`}
                  onClick={() => onDelete(inv._id, label)}
                  className="text-gray-400 hover:text-red-600 p-2"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {result && totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40 text-arc-gold-600">Previous</button>
          <span className="text-gray-500">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40 text-arc-gold-600">Next</button>
        </div>
      )}
    </div>
  );
}

export default function InvoicesListPage() {
  return (
    <AppShell>
      <InvoicesContent />
    </AppShell>
  );
}
