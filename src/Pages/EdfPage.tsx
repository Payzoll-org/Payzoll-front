import { memo, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Plus, Printer, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../Components/AppShell";
import EdfSheet, { SHEET_HEIGHT, SHEET_WIDTH } from "../Components/EdfSheet";
import {
  EdfApiError,
  closeEdf,
  createDraft,
  deleteEdf,
  fileEdf,
  getEdf,
  getPrefill,
  peekPrefill,
  recordEdf,
  recordToForm,
  updateEdf,
} from "../services/edfApi";
import type { EdfPrefill, EdfStatus, PartnerLite } from "../services/edfApi";
import {
  CATEGORY_OF_EXPORTER_OPTIONS,
  COUNTRIES,
  CURRENCIES,
  EDF_STATUS_LABEL,
  LIMITS,
  MAX_INVOICE_ROWS,
  MODE_OF_DELIVERY_OPTIONS,
  MODE_OF_REALISATION_OPTIONS,
  REALIZATION_LABEL,
  SAC_SUGGESTIONS,
  TYPE_OF_EXPORT_OPTIONS,
  cleanAlnumUpper,
  cleanDecimal,
  cleanDigits,
  cleanText,
  computeEdfTotals,
  emptyEdf,
  formatMoney,
  newRow,
  sectionOfError,
  summariseTotals,
  validateEdf,
} from "../libs/edf";
import type { EdfForm, Errors, InvoiceRow } from "../libs/edf";

const inputCls =
  "w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-arc-gold-400 focus:border-arc-gold-400";

const Sheet = memo(EdfSheet);

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function partnerRow(p: PartnerLite): InvoiceRow {
  const a = p.physicalAddress ?? {};
  const code = (a.country ?? "").toUpperCase();
  return {
    ...newRow(),
    recipientName: cleanText(p.legalName || p.nickname || "", LIMITS.recipientName),
    recipientAddress: cleanText([a.line1, a.line2, a.city, a.state].filter(Boolean).join(", "), LIMITS.recipientAddress),
    country: code ? (COUNTRIES.some((c) => c.code === code) ? code : "OTHER") : "",
  };
}

function withPrefill(f: EdfForm, pf: EdfPrefill): EdfForm {
  const next = { ...f };
  if (!next.exporterName) next.exporterName = cleanText(pf.from.name, LIMITS.exporterName);
  if (!next.exporterAddress) next.exporterAddress = cleanText(pf.from.address, LIMITS.exporterAddress);
  if (!next.exporterPostal) next.exporterPostal = cleanText(pf.from.postal, LIMITS.postal);
  if (!next.exporterEmail) next.exporterEmail = cleanText(pf.from.email, LIMITS.email);
  if (!next.gstin && pf.from.gstinApplicable) next.gstin = cleanAlnumUpper(pf.from.gstin, LIMITS.gstin);
  if (!next.pan && pf.from.pan) next.pan = cleanAlnumUpper(pf.from.pan, LIMITS.pan);
  const db = pf.domesticBank ?? { bankName: "", accountName: "", accountNumber: "", ifsc: "", address: "" };
  if (!next.adBankName) next.adBankName = cleanText(db.bankName || pf.adBankName, LIMITS.adBankName);
  if (!next.adBankAddress) next.adBankAddress = cleanText(db.address, LIMITS.adBankAddress, true);
  if (!next.adAccountName) next.adAccountName = cleanText(db.accountName, LIMITS.adAccountName);
  if (!next.adAccountNumber) next.adAccountNumber = cleanAlnumUpper(db.accountNumber, LIMITS.account);
  if (!next.adIfsc) next.adIfsc = cleanAlnumUpper(db.ifsc, LIMITS.ifsc);
  return next;
}

function Section({ id, title, hint, open, onToggle, errorCount, children }: {
  id: string; title: string; hint?: string; open: boolean; onToggle: () => void; errorCount: number; children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-100 rounded-sm shadow-sm">
      <button type="button" aria-expanded={open} aria-controls={`sec-${id}`} onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900">{title}</span>
          {hint && <span className="block text-xs text-gray-500">{hint}</span>}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {errorCount > 0 && <span className="text-xs font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5">{errorCount} to fix</span>}
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div id={`sec-${id}`} className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">{children}</div>}
    </section>
  );
}

function Field({ label, error, children, htmlFor }: { label: string; error?: string; children: React.ReactNode; htmlFor: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ScaledSheet({ form }: { form: EdfForm }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / SHEET_WIDTH));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={boxRef} className="w-full">
      <div style={{ width: SHEET_WIDTH * scale, height: SHEET_HEIGHT * scale }} className="shadow-md border border-gray-200 bg-white overflow-hidden">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SHEET_WIDTH }}>
          <Sheet form={form} />
        </div>
      </div>
    </div>
  );
}

function EdfContent() {
  const navigate = useNavigate();
  const { edfId } = useParams<{ edfId: string }>();
  const [form, setFormRaw] = useState<EdfForm>(() => ({ ...emptyEdf(), edfDate: edfId ? "" : todayISO() }));
  const [id, setId] = useState<string | null>(null);
  const [status, setStatus] = useState<EdfStatus>("draft");
  const [loading, setLoading] = useState(!!edfId);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [attempted, setAttempted] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [open, setOpen] = useState<Record<string, boolean>>({ general: true, exporter: true, adbank: true, invoices: true, declaration: true });
  const [partners, setPartners] = useState<PartnerLite[]>(() => peekPrefill()?.partners ?? []);
  const [nextNo, setNextNo] = useState(() => peekPrefill()?.edfNo ?? "");

  const isDraft = status === "draft";
  const isClosed = status === "closed";

  const setForm = (updater: (f: EdfForm) => EdfForm) => {
    setFormRaw(updater);
    setDirty(true);
    setServerErrors({});
  };
  const set = <K extends keyof EdfForm>(key: K, value: EdfForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: keyof EdfForm, max: number, multiline = false) => (e: { target: { value: string } }) => set(key, cleanText(e.target.value, max, multiline) as never);

  const errors: Errors = useMemo(() => ({ ...validateEdf(form), ...serverErrors }), [form, serverErrors]);
  const err = (key: string, value: string) => (value || attempted || serverErrors[key] ? errors[key] : undefined);
  const rowErr = (i: number, field: string, value: string) => err(`invoices.${i}.${field}`, value);

  const errorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const k of Object.keys(errors)) {
      if (!attempted && !serverErrors[k]) continue;
      counts[sectionOfError(k)] = (counts[sectionOfError(k)] ?? 0) + 1;
    }
    return counts;
  }, [errors, attempted, serverErrors]);

  const totals = useMemo(() => computeEdfTotals(form), [form]);
  const toggle = (sid: string) => setOpen((o) => ({ ...o, [sid]: !o[sid] }));

  const revealErrors = (errs: Errors) => {
    setAttempted(true);
    setTab("edit");
    setOpen((o) => {
      const next = { ...o };
      for (const k of Object.keys(errs)) next[sectionOfError(k)] = true;
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const onPrefill = (pf: EdfPrefill) => {
      if (cancelled) return;
      setPartners(pf.partners);
      setNextNo(pf.edfNo);
      if (edfId) return;
      setFormRaw((f) => withPrefill(f, pf));
    };
    const cached = peekPrefill();
    if (cached) onPrefill(cached);
    getPrefill().then(onPrefill).catch(() => {});

    if (!edfId) return () => { cancelled = true; };
    getEdf(edfId)
      .then((rec) => {
        if (cancelled) return;
        setFormRaw(recordToForm(rec));
        setId(rec._id);
        setStatus(rec.status);
        setDirty(false);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Could not load the EDF");
        navigate("/edf", { replace: true });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [edfId, navigate]);

  // Row helpers
  const setRow = (rowId: string, patch: Partial<InvoiceRow>) =>
    setForm((f) => ({ ...f, invoices: f.invoices.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }));
  const addRow = (row?: InvoiceRow) => {
    if (form.invoices.length >= MAX_INVOICE_ROWS) {
      toast.error(`At most ${MAX_INVOICE_ROWS} invoices`);
      return;
    }
    setForm((f) => ({ ...f, invoices: [...f.invoices, row ?? newRow()] }));
  };
  const removeRow = (rowId: string) =>
    setForm((f) => ({ ...f, invoices: f.invoices.length > 1 ? f.invoices.filter((r) => r.id !== rowId) : f.invoices }));
  const addFromPartner = (pid: string) => {
    const p = partners.find((x) => x._id === pid);
    if (p) addRow(partnerRow(p));
  };

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const showApiError = (e: unknown, fallback: string) => {
    if (e instanceof EdfApiError && e.fieldErrors) {
      setServerErrors(e.fieldErrors);
      revealErrors(e.fieldErrors);
    }
    toast.error(e instanceof Error ? e.message : fallback);
  };

  const saveDraft = async (): Promise<string> => {
    const saved = id ? await updateEdf(id, form) : await createDraft(form);
    setId(saved._id);
    setStatus(saved.status);
    setDirty(false);
    return saved._id;
  };

  const onSave = async () => {
    if (busy) return;
    if (!isDraft) {
      const errs = validateEdf(form);
      if (Object.keys(errs).length > 0) {
        revealErrors(errs);
        toast.error("Fix the highlighted fields first");
        return;
      }
    }
    setBusy(true);
    try {
      const savedId = await saveDraft();
      toast.success(isDraft ? "Draft saved" : "Changes saved");
      if (!id) navigate(`/edf/${savedId}`, { replace: true });
    } catch (e) {
      showApiError(e, "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async () => {
    if (busy || !isDraft) return;
    const errs = validateEdf(form);
    if (Object.keys(errs).length > 0) {
      revealErrors(errs);
      toast.error("Fix the highlighted fields first");
      return;
    }
    setBusy(true);
    try {
      const rec = await fileEdf(await saveDraft());
      setStatus(rec.status);
      setFormRaw(recordToForm(rec));
      toast.success(`EDF filed as ${rec.edfNo}`);
      navigate("/edf?tab=filed", { replace: true });
    } catch (e) {
      showApiError(e, "Could not file the EDF");
    } finally {
      setBusy(false);
    }
  };

  const transition = async (fn: (id: string) => Promise<{ status: EdfStatus }>, label: string) => {
    if (!id || busy) return;
    setBusy(true);
    try {
      const rec = await fn(id);
      setStatus(rec.status);
      setFormRaw(recordToForm(rec as never));
      setDirty(false);
      toast.success(label);
    } catch (e) {
      showApiError(e, "Could not update the EDF");
    } finally {
      setBusy(false);
    }
  };
  const onRecord = () => transition(recordEdf, "Marked recorded in EDPMS");
  const onClose = () => {
    if (!window.confirm("Close this EDF's EDPMS entry? Do this once the export proceeds are realised.")) return;
    transition(closeEdf, "EDF closed");
  };

  const onDelete = async () => {
    if (!id || busy) return;
    if (!window.confirm("Delete this EDF? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteEdf(id);
      setDirty(false);
      toast.success("EDF deleted");
      navigate("/edf", { replace: true });
    } catch (e) {
      showApiError(e, "Could not delete the EDF");
      setBusy(false);
    }
  };

  const [printRoot] = useState(() => document.createElement("div"));
  useEffect(() => {
    printRoot.className = "edf-print-root";
    document.body.appendChild(printRoot);
    return () => { document.body.removeChild(printRoot); };
  }, [printRoot]);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    return () => window.removeEventListener("afterprint", done);
  }, [printing]);
  const onPrint = () => {
    if (Object.keys(errors).length > 0) {
      revealErrors(errors);
      toast.error("Fix the highlighted fields before downloading");
      return;
    }
    setPrinting(true);
  };

  const sheetForm = useMemo(() => (form.edfNo || !nextNo ? form : { ...form, edfNo: nextNo }), [form, nextNo]);
  const previewForm = useDeferredValue(sheetForm);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading EDF...</div>;

  const statusBadge =
    status === "closed" ? "bg-green-50 text-green-700" : status === "draft" ? "bg-arc-gold-50 text-arc-gold-700" : "bg-blue-50 text-blue-700";

  return (
    <div className="h-full flex flex-col">
      <style>{`
        .edf-print-root { display: none; }
        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          body > *:not(.edf-print-root) { display: none !important; }
          .edf-print-root { display: block !important; }
        }
      `}</style>

      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" aria-label="Back to EDFs" onClick={() => navigate("/edf")} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
              {isDraft ? (id ? "Edit draft" : "New EDF") : form.edfNo || "EDF"}
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${statusBadge}`}>{EDF_STATUS_LABEL[status]}</span>
              {!isDraft && (
                <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">{REALIZATION_LABEL[totals.status]}</span>
              )}
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              {isDraft ? "Nothing is stored until you click Save draft or File EDF." : "Update realised amounts here as payments arrive, then advance the EDPMS status."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={onPrint} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 text-sm font-medium">
            <Printer size={16} /> Download
          </button>
          {id && (
            <button type="button" disabled={busy} onClick={onDelete} className="inline-flex items-center gap-2 rounded-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 px-3 py-2 text-sm font-medium">
              <Trash2 size={16} /> Delete
            </button>
          )}
          {!isClosed && (
            <button type="button" disabled={busy} onClick={onSave} className="rounded-sm border border-arc-gold-500 text-arc-gold-700 hover:bg-arc-gold-50 disabled:opacity-60 px-3 py-2 text-sm font-medium">
              {busy ? "Saving..." : isDraft ? "Save draft" : "Save changes"}
            </button>
          )}
          {isDraft && (
            <button type="button" disabled={busy} onClick={onFile} className="rounded-sm bg-arc-gold-500 hover:bg-arc-gold-600 disabled:opacity-60 text-white px-3 py-2 text-sm font-medium">
              File EDF
            </button>
          )}
          {status === "filed" && (
            <button type="button" disabled={busy} onClick={onRecord} className="rounded-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2 text-sm font-medium">
              Mark recorded in EDPMS
            </button>
          )}
          {(status === "filed" || status === "recorded") && (
            <button type="button" disabled={busy} onClick={onClose} className="rounded-sm bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-2 text-sm font-medium">
              Close
            </button>
          )}
        </div>
      </div>

      <div className="lg:hidden flex border-b border-gray-100 shrink-0">
        {(["edit", "preview"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 py-2 text-sm font-medium ${tab === k ? "text-arc-gold-600 border-b-2 border-arc-gold-500" : "text-gray-500"}`}>
            {k === "edit" ? "Details" : "Live preview"}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-2">
        <fieldset disabled={busy} className={`${tab === "edit" ? "block" : "hidden"} lg:block h-full overflow-y-auto p-4 space-y-3 bg-gray-50 min-w-0`}>
          {/* Section 1 - General */}
          <Section id="general" title="Section 1 — General information" open={!!open.general} onToggle={() => toggle("general")} errorCount={errorCounts.general ?? 0}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="EDF date" htmlFor="edf-date" error={err("edfDate", form.edfDate)}>
                <input id="edf-date" type="date" className={inputCls} value={form.edfDate} onChange={(e) => set("edfDate", e.target.value.slice(0, 10))} />
              </Field>
              <div className="min-w-0">
                <span className="block text-xs font-medium text-gray-600 mb-1">EDF no.</span>
                <div className="text-sm text-gray-900 font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm">{form.edfNo || nextNo || "..."}</div>
              </div>
              <Field label="Type of export" htmlFor="edf-type" error={err("typeOfExport", form.typeOfExport)}>
                <select id="edf-type" className={inputCls} value={form.typeOfExport} onChange={(e) => set("typeOfExport", e.target.value as EdfForm["typeOfExport"])}>
                  {TYPE_OF_EXPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Mode of delivery" htmlFor="edf-mode" error={err("modeOfDelivery", form.modeOfDelivery)}>
                <select id="edf-mode" className={inputCls} value={form.modeOfDelivery} onChange={(e) => set("modeOfDelivery", e.target.value as EdfForm["modeOfDelivery"])}>
                  {MODE_OF_DELIVERY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Category of exporter" htmlFor="edf-cat" error={err("categoryOfExporter", form.categoryOfExporter)}>
                <select id="edf-cat" className={inputCls} value={form.categoryOfExporter} onChange={(e) => set("categoryOfExporter", e.target.value as EdfForm["categoryOfExporter"])}>
                  {CATEGORY_OF_EXPORTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Mode of realisation" htmlFor="edf-real" error={err("modeOfRealisation", form.modeOfRealisation)}>
                <select id="edf-real" className={inputCls} value={form.modeOfRealisation} onChange={(e) => set("modeOfRealisation", e.target.value as EdfForm["modeOfRealisation"])}>
                  {MODE_OF_REALISATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Form No. (optional, SEZ)" htmlFor="edf-form" error={err("formNo", form.formNo)}>
                <input id="edf-form" className={inputCls} value={form.formNo} onChange={text("formNo", LIMITS.formNo)} autoComplete="off" />
              </Field>
            </div>
            <Field label="Overall description of services (optional)" htmlFor="edf-desc" error={err("description", form.description)}>
              <textarea id="edf-desc" rows={2} className={inputCls} value={form.description} onChange={text("description", LIMITS.description, true)} />
            </Field>
          </Section>

          {/* Exporter */}
          <Section id="exporter" title="Exporter" hint="Prefilled from your KYC" open={!!open.exporter} onToggle={() => toggle("exporter")} errorCount={errorCounts.exporter ?? 0}>
            <Field label="Exporter name / business" htmlFor="edf-exname" error={err("exporterName", form.exporterName)}>
              <input id="edf-exname" className={inputCls} value={form.exporterName} onChange={text("exporterName", LIMITS.exporterName)} autoComplete="off" />
            </Field>
            <Field label="Address" htmlFor="edf-exaddr" error={err("exporterAddress", form.exporterAddress)}>
              <textarea id="edf-exaddr" rows={2} className={inputCls} value={form.exporterAddress} onChange={text("exporterAddress", LIMITS.exporterAddress, true)} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Postal code" htmlFor="edf-expostal" error={err("exporterPostal", form.exporterPostal)}>
                <input id="edf-expostal" className={inputCls} value={form.exporterPostal} onChange={text("exporterPostal", LIMITS.postal)} autoComplete="off" />
              </Field>
              <Field label="Email" htmlFor="edf-exemail" error={err("exporterEmail", form.exporterEmail)}>
                <input id="edf-exemail" type="email" className={inputCls} value={form.exporterEmail} onChange={text("exporterEmail", LIMITS.email)} autoComplete="off" />
              </Field>
              <Field label="IEC (Importer-Exporter Code)" htmlFor="edf-iec" error={err("iec", form.iec)}>
                <input id="edf-iec" className={inputCls} value={form.iec} onChange={(e) => set("iec", cleanAlnumUpper(e.target.value, LIMITS.iec))} placeholder="ABCDE1234F" autoComplete="off" />
              </Field>
              <Field label="PAN" htmlFor="edf-pan" error={err("pan", form.pan)}>
                <input id="edf-pan" className={inputCls} value={form.pan} onChange={(e) => set("pan", cleanAlnumUpper(e.target.value, LIMITS.pan))} placeholder="ABCDE1234F" autoComplete="off" />
              </Field>
              <Field label="GSTIN (optional)" htmlFor="edf-gstin" error={err("gstin", form.gstin)}>
                <input id="edf-gstin" className={inputCls} value={form.gstin} onChange={(e) => set("gstin", cleanAlnumUpper(e.target.value, LIMITS.gstin))} autoComplete="off" />
              </Field>
            </div>
          </Section>

          {/* AD bank */}
          <Section id="adbank" title="Authorised Dealer (AD) bank" hint="Your domestic bank — prefilled from your Payzoll payout account" open={!!open.adbank} onToggle={() => toggle("adbank")} errorCount={errorCounts.adbank ?? 0}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="AD code (bank branch code)" htmlFor="edf-adcode" error={err("adCode", form.adCode)}>
                <input id="edf-adcode" className={inputCls} value={form.adCode} onChange={(e) => set("adCode", cleanDigits(e.target.value, LIMITS.adCode))} placeholder="Not IFSC/SWIFT" autoComplete="off" />
              </Field>
              <Field label="AD bank name" htmlFor="edf-adname" error={err("adBankName", form.adBankName)}>
                <input id="edf-adname" className={inputCls} value={form.adBankName} onChange={text("adBankName", LIMITS.adBankName)} autoComplete="off" />
              </Field>
              <Field label="Account holder name" htmlFor="edf-adacc-name" error={err("adAccountName", form.adAccountName)}>
                <input id="edf-adacc-name" className={inputCls} value={form.adAccountName} onChange={text("adAccountName", LIMITS.adAccountName)} autoComplete="off" />
              </Field>
              <Field label="Account number" htmlFor="edf-adacc-no" error={err("adAccountNumber", form.adAccountNumber)}>
                <input id="edf-adacc-no" className={inputCls} value={form.adAccountNumber} onChange={(e) => set("adAccountNumber", cleanAlnumUpper(e.target.value, LIMITS.account))} autoComplete="off" />
              </Field>
              <Field label="IFSC" htmlFor="edf-adifsc" error={err("adIfsc", form.adIfsc)}>
                <input id="edf-adifsc" className={inputCls} value={form.adIfsc} onChange={(e) => set("adIfsc", cleanAlnumUpper(e.target.value, LIMITS.ifsc))} placeholder="ABCD0123456" autoComplete="off" />
              </Field>
            </div>
            <Field label="AD bank address (optional)" htmlFor="edf-adaddr" error={err("adBankAddress", form.adBankAddress)}>
              <textarea id="edf-adaddr" rows={2} className={inputCls} value={form.adBankAddress} onChange={text("adBankAddress", LIMITS.adBankAddress, true)} />
            </Field>
          </Section>

          {/* Section 2B - invoices */}
          <Section id="invoices" title="Section 2B — Services (invoices)" hint="One row per export invoice; consolidate a month's exports here" open={!!open.invoices} onToggle={() => toggle("invoices")} errorCount={errorCounts.invoices ?? 0}>
            {typeof errors.invoices === "string" && (attempted || serverErrors.invoices) && (
              <p role="alert" className="text-xs text-red-600">{errors.invoices}</p>
            )}
            {form.invoices.map((r, i) => (
              <div key={r.id} className="rounded-sm border border-gray-200 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Invoice {i + 1}</span>
                  {form.invoices.length > 1 && (
                    <button type="button" onClick={() => removeRow(r.id)} className="text-gray-400 hover:text-red-600" aria-label={`Remove invoice ${i + 1}`}>
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Service recipient" htmlFor={`r-name-${r.id}`} error={rowErr(i, "recipientName", r.recipientName)}>
                    <input id={`r-name-${r.id}`} className={inputCls} value={r.recipientName} onChange={(e) => setRow(r.id, { recipientName: cleanText(e.target.value, LIMITS.recipientName) })} autoComplete="off" />
                  </Field>
                  <Field label="Country" htmlFor={`r-country-${r.id}`} error={rowErr(i, "country", r.country)}>
                    <select id={`r-country-${r.id}`} className={inputCls} value={r.country} onChange={(e) => setRow(r.id, { country: e.target.value })}>
                      <option value="">Select a country</option>
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Recipient address (optional)" htmlFor={`r-addr-${r.id}`} error={rowErr(i, "recipientAddress", r.recipientAddress)}>
                  <input id={`r-addr-${r.id}`} className={inputCls} value={r.recipientAddress} onChange={(e) => setRow(r.id, { recipientAddress: cleanText(e.target.value, LIMITS.recipientAddress) })} autoComplete="off" />
                </Field>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Invoice no." htmlFor={`r-inv-${r.id}`} error={rowErr(i, "invoiceNo", r.invoiceNo)}>
                    <input id={`r-inv-${r.id}`} className={inputCls} value={r.invoiceNo} onChange={(e) => setRow(r.id, { invoiceNo: cleanText(e.target.value, LIMITS.rowInvoiceNo) })} autoComplete="off" />
                  </Field>
                  <Field label="Invoice date" htmlFor={`r-invd-${r.id}`} error={rowErr(i, "invoiceDate", r.invoiceDate)}>
                    <input id={`r-invd-${r.id}`} type="date" className={inputCls} value={r.invoiceDate} onChange={(e) => setRow(r.id, { invoiceDate: e.target.value.slice(0, 10) })} />
                  </Field>
                  <Field label="Currency" htmlFor={`r-cur-${r.id}`} error={rowErr(i, "currency", r.currency)}>
                    <select id={`r-cur-${r.id}`} className={inputCls} value={r.currency} onChange={(e) => setRow(r.id, { currency: e.target.value as InvoiceRow["currency"] })}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Amount" htmlFor={`r-amt-${r.id}`} error={rowErr(i, "amount", r.amount)}>
                    <input id={`r-amt-${r.id}`} inputMode="decimal" className={inputCls} value={r.amount} onChange={(e) => setRow(r.id, { amount: cleanDecimal(e.target.value, 16) })} placeholder="0.00" autoComplete="off" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Net realisable (opt.)" htmlFor={`r-net-${r.id}`} error={rowErr(i, "netRealisable", r.netRealisable)}>
                    <input id={`r-net-${r.id}`} inputMode="decimal" className={inputCls} value={r.netRealisable} onChange={(e) => setRow(r.id, { netRealisable: cleanDecimal(e.target.value, 16) })} placeholder="= amount" autoComplete="off" />
                  </Field>
                  <Field label="Realised amount" htmlFor={`r-rz-${r.id}`} error={rowErr(i, "realisedAmount", r.realisedAmount)}>
                    <input id={`r-rz-${r.id}`} inputMode="decimal" className={inputCls} value={r.realisedAmount} onChange={(e) => setRow(r.id, { realisedAmount: cleanDecimal(e.target.value, 16) })} placeholder="0.00" autoComplete="off" />
                  </Field>
                  <Field label="SAC code" htmlFor={`r-sac-${r.id}`} error={rowErr(i, "sacCode", r.sacCode)}>
                    <input id={`r-sac-${r.id}`} list="sac-list" className={inputCls} value={r.sacCode} onChange={(e) => setRow(r.id, { sacCode: cleanDigits(e.target.value, LIMITS.sacCode) })} placeholder="998314" autoComplete="off" />
                  </Field>
                  <Field label="Contract no. (opt.)" htmlFor={`r-con-${r.id}`} error={rowErr(i, "contractNo", r.contractNo)}>
                    <input id={`r-con-${r.id}`} className={inputCls} value={r.contractNo} onChange={(e) => setRow(r.id, { contractNo: cleanText(e.target.value, LIMITS.rowContractNo) })} autoComplete="off" />
                  </Field>
                </div>
                <Field label="Description of services" htmlFor={`r-desc-${r.id}`} error={rowErr(i, "description", r.description)}>
                  <input id={`r-desc-${r.id}`} className={inputCls} value={r.description} onChange={(e) => setRow(r.id, { description: cleanText(e.target.value, LIMITS.rowDescription) })} autoComplete="off" />
                </Field>
              </div>
            ))}
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={() => addRow()} className="inline-flex items-center gap-1 rounded-sm border border-gray-900 text-gray-900 text-sm font-medium px-3 py-1.5 hover:bg-gray-50">
                <Plus size={14} /> Add invoice
              </button>
              {partners.length > 0 && (
                <select className="rounded-sm border border-gray-200 px-2 py-1.5 text-sm text-gray-600" value="" onChange={(e) => { if (e.target.value) addFromPartner(e.target.value); }}>
                  <option value="">+ Add from saved contact</option>
                  {partners.map((p) => <option key={p._id} value={p._id}>{p.legalName || p.nickname || p.email}</option>)}
                </select>
              )}
            </div>
            {totals.totalsByCurrency.length > 0 && (
              <div className="rounded-sm bg-white border border-gray-200 px-3 py-2 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Declared</span><span className="font-medium text-gray-900">{summariseTotals(totals.totalsByCurrency, "declaredMinor")}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className="font-semibold text-gray-900">{summariseTotals(totals.totalsByCurrency, "outstandingMinor")}</span></div>
              </div>
            )}
          </Section>

          {/* Section 4 - declaration */}
          <Section id="declaration" title="Section 4 — Declaration & EDPMS" open={!!open.declaration} onToggle={() => toggle("declaration")} errorCount={errorCounts.declaration ?? 0}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Realisation commitment date" htmlFor="edf-rcd" error={err("realisationCommitmentDate", form.realisationCommitmentDate)}>
                <input id="edf-rcd" type="date" className={inputCls} value={form.realisationCommitmentDate} onChange={(e) => set("realisationCommitmentDate", e.target.value.slice(0, 10))} />
              </Field>
              <Field label="Declaration date (optional)" htmlFor="edf-dd" error={err("declarationDate", form.declarationDate)}>
                <input id="edf-dd" type="date" className={inputCls} value={form.declarationDate} onChange={(e) => set("declarationDate", e.target.value.slice(0, 10))} />
              </Field>
              <Field label="Authorised signatory (optional)" htmlFor="edf-sig" error={err("authorisedSignatory", form.authorisedSignatory)}>
                <input id="edf-sig" className={inputCls} value={form.authorisedSignatory} onChange={text("authorisedSignatory", LIMITS.signatory)} autoComplete="off" />
              </Field>
              <Field label="FIRA reference (optional)" htmlFor="edf-fira" error={err("firaReference", form.firaReference)}>
                <input id="edf-fira" className={inputCls} value={form.firaReference} onChange={text("firaReference", LIMITS.firaReference)} placeholder="From your Payzoll Payout page" autoComplete="off" />
              </Field>
            </div>
            <Field label="Remarks (optional)" htmlFor="edf-remarks" error={err("remarks", form.remarks)}>
              <textarea id="edf-remarks" rows={2} className={inputCls} value={form.remarks} onChange={text("remarks", LIMITS.remarks, true)} />
            </Field>
          </Section>
        </fieldset>

        <div className={`${tab === "preview" ? "block" : "hidden"} lg:block h-full overflow-y-auto p-4 bg-gray-100 border-l border-gray-100`}>
          <ScaledSheet form={previewForm} />
        </div>
      </div>

      <datalist id="sac-list">
        {SAC_SUGGESTIONS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
      </datalist>

      {printing && createPortal(<EdfSheet form={sheetForm} />, printRoot)}
    </div>
  );
}

export default function EdfPage() {
  return (
    <AppShell>
      <EdfContent />
    </AppShell>
  );
}
