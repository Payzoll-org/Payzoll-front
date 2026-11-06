import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../Components/AppShell";
import { deleteEdf, listEdfs } from "../services/edfApi";
import type { CurrencyTotalDto, EdfListResult } from "../services/edfApi";
import { displayDate, formatMinorString, EDF_STATUS_LABEL, REALIZATION_LABEL } from "../libs/edf";
import type { EdfStatus, RealizationStatus } from "../libs/edf";

type Tab = "draft" | "filed" | "closed";

const REAL_STYLE: Record<RealizationStatus, string> = {
  outstanding: "bg-amber-50 text-amber-700",
  partial: "bg-blue-50 text-blue-700",
  realized: "bg-green-50 text-green-700",
};
const STATUS_STYLE: Record<EdfStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  filed: "bg-blue-50 text-blue-700",
  recorded: "bg-indigo-50 text-indigo-700",
  closed: "bg-green-50 text-green-700",
};

const summarise = (totals: CurrencyTotalDto[], pick: keyof Omit<CurrencyTotalDto, "currency">) =>
  totals.length === 0 ? "--" : totals.map((t) => `${t.currency} ${formatMinorString(t[pick], t.currency)}`).join("  +  ");

function EdfContent() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: Tab = raw === "filed" || raw === "closed" ? raw : "draft";
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<EdfListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setResult(await listEdfs({ status: tab, page }));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);

  const switchTab = (next: Tab) => {
    setPage(1);
    setParams(next === "draft" ? {} : { tab: next }, { replace: true });
  };

  const onDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete EDF ${label}? This cannot be undone.`)) return;
    try {
      await deleteEdf(id);
      toast.success("EDF deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the EDF");
    }
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">EDF Filing Portal</h1>
          <p className="text-xs text-gray-500">Declare your service exports and track each against the remittance received (EDPMS).</p>
        </div>
        <button type="button" onClick={() => navigate("/edf/new")} className="inline-flex items-center gap-2 rounded-sm bg-arc-gold-500 hover:bg-arc-gold-600 text-white px-3 py-2 text-sm font-medium">
          <Plus size={16} /> New EDF
        </button>
      </div>

      <div role="tablist" className="flex border-b border-gray-100">
        {(["draft", "filed", "closed"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => switchTab(k)}
            className={`px-4 py-2 text-sm font-medium ${tab === k ? "text-arc-gold-600 border-b-2 border-arc-gold-500" : "text-gray-500 hover:text-gray-700"}`}>
            {k === "draft" ? "Drafts" : k === "filed" ? "Filed" : "Closed"}
            {result && <span className="ml-1.5 text-xs text-gray-400">{result.counts[k]}</span>}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {failed && !loading && (
        <div className="text-sm text-red-600">Could not load EDFs. <button type="button" onClick={load} className="underline">Retry</button></div>
      )}

      {!loading && !failed && result && result.edfs.length === 0 && (
        <div className="border border-dashed border-gray-200 rounded-sm p-10 text-center text-gray-500">
          <FileText className="mx-auto mb-2 text-gray-300" size={32} />
          <p className="text-sm">{tab === "draft" ? "No drafts yet." : tab === "filed" ? "No filed EDFs yet." : "No closed EDFs yet."}</p>
        </div>
      )}

      {!loading && !failed && result && result.edfs.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-sm bg-white">
          {result.edfs.map((edf) => {
            const label = edf.edfNo ? `#${edf.edfNo}` : "(draft)";
            const firstRecipient = edf.invoices.find((r) => r.recipientName)?.recipientName || "No recipient yet";
            const extra = edf.invoices.length > 1 ? ` +${edf.invoices.length - 1}` : "";
            return (
              <li key={edf._id} className="flex items-center gap-2 pr-3 hover:bg-gray-50">
                <button type="button" onClick={() => navigate(`/edf/${edf._id}`)} className="flex-1 min-w-0 text-left px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1 items-center">
                  <span className="text-sm font-medium text-gray-900 truncate">{label}</span>
                  <span className="text-sm text-gray-600 truncate">{firstRecipient}{extra}</span>
                  <span className="text-xs text-gray-500">{displayDate(edf.edfDate) || "No date"}</span>
                  <span className="text-sm font-medium text-gray-900 md:text-right truncate">{summarise(edf.totalsByCurrency, "declaredMinor")}</span>
                  <span className="flex md:justify-end gap-1.5">
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLE[edf.status]}`}>{EDF_STATUS_LABEL[edf.status]}</span>
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${REAL_STYLE[edf.realizationStatus]}`}>{REALIZATION_LABEL[edf.realizationStatus]}</span>
                  </span>
                </button>
                <button type="button" aria-label={`Edit EDF ${label}`} onClick={() => navigate(`/edf/${edf._id}`)} className="text-gray-400 hover:text-arc-gold-600 p-2"><Pencil size={16} /></button>
                <button type="button" aria-label={`Delete EDF ${label}`} onClick={() => onDelete(edf._id, label)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
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

export default function EdfListPage() {
  return (
    <AppShell>
      <EdfContent />
    </AppShell>
  );
}
