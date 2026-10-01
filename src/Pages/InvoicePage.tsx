import { memo, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Plus, Printer, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../Components/AppShell";
import InvoiceSheet, { SHEET_HEIGHT, SHEET_WIDTH } from "../Components/InvoiceSheet";
import {
  InvoiceApiError,
  activateInvoice,
  addPartnerToPrefillCache,
  createDraft,
  getInvoice,
  getPrefill,
  peekPrefill,
  recordToForm,
  deleteInvoice,
  updateInvoice,
} from "../services/invoiceApi";
import type { InvoicePrefill, InvoiceStatus, PartnerLite } from "../services/invoiceApi";
import { createPartner, PARTNER_TYPE_OPTIONS } from "../services/partnerApi";
import { COUNTRY_OPTIONS as PARTNER_COUNTRY_OPTIONS } from "../libs/countries";
import type { PartnerPayload } from "../services/partnerApi";
import {
  COUNTRIES,
  CURRENCIES,
  LIMITS,
  MAX_ITEMS,
  cleanAlnumUpper,
  cleanDecimal,
  cleanDigits,
  cleanText,
  computeTotals,
  emptyInvoice,
  formatMoney,
  lineAmount,
  newItem,
  processLogo,
  processSignature,
  safeLogoSrc,
  sectionOfError,
  validateInvoice,
} from "../libs/invoice";
import type { BankMode, Currency, DiscountType, Errors, InvoiceForm, LineItem } from "../libs/invoice";

const inputCls =
  "w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-arc-gold-400 focus:border-arc-gold-400";

// The preview/print sheet only re-renders when its (deferred) form changes.
const Sheet = memo(InvoiceSheet);

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// A saved partner -> the "bill to" fields. Countries the invoice has no entry
// for become "Other" (the invoice and server only accept their own list).
// Phone and GSTIN belong to whichever client was there before, so they reset.
function partnerFields(p: PartnerLite): Partial<InvoiceForm> {
  const a = p.physicalAddress ?? {};
  const code = (a.country ?? "").toUpperCase();
  return {
    toName: cleanText(p.legalName || p.nickname || "", LIMITS.name),
    toEmail: cleanText(p.email || "", LIMITS.email),
    toAddress: cleanText([a.line1, a.line2, a.city, a.state].filter(Boolean).join(", "), LIMITS.address),
    toPostal: cleanText(a.postalCode || "", LIMITS.postal),
    toCountry: code ? (COUNTRIES.some((c) => c.code === code) ? code : "OTHER") : "",
    toPhone: "",
    toTaxId: "",
  };
}

// Pre-fill the "bill from" side and the default payout bank from what we
// already know about the user. Only blank fields are filled, so applying it
// again (cached copy first, then the fresh response) never overwrites typing.
function withPrefill(f: InvoiceForm, pf: InvoicePrefill, applyBank: boolean): InvoiceForm {
  const next = { ...f };
  if (!next.fromName) next.fromName = cleanText(pf.from.name, LIMITS.name);
  if (!next.fromAddress) next.fromAddress = cleanText(pf.from.address, LIMITS.address);
  if (!next.fromPostal) next.fromPostal = cleanText(pf.from.postal, LIMITS.postal);
  if (!next.fromEmail) next.fromEmail = cleanText(pf.from.email, LIMITS.email);
  if (applyBank && pf.bank) {
    next.bankEnabled = true;
    next.bankMode = pf.bank.mode;
    next.bankHolder = cleanText(pf.bank.holder, LIMITS.bankName);
    next.bankName = cleanText(pf.bank.bankName, LIMITS.bankName);
    if (pf.bank.mode === "domestic") {
      next.bankAccount = cleanDigits(pf.bank.account, 18);
      next.bankIfsc = cleanAlnumUpper(pf.bank.ifsc, LIMITS.ifsc);
    } else {
      next.bankAccount = cleanAlnumUpper(pf.bank.account, LIMITS.account);
      next.bankSwift = cleanAlnumUpper(pf.bank.swift, LIMITS.swift);
    }
  }
  return next;
}

// Collapsible form section. The body is unmounted while closed; all values
// live in the page's form state, so nothing is lost by collapsing.
function Section({
  id,
  title,
  hint,
  open,
  onToggle,
  errorCount,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  errorCount: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-100 rounded-sm shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`sec-${id}`}
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900">{title}</span>
          {hint && <span className="block text-xs text-gray-500">{hint}</span>}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {errorCount > 0 && (
            <span className="text-xs font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5">
              {errorCount} to fix
            </span>
          )}
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div id={`sec-${id}`} className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
          {children}
        </div>
      )}
    </section>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-arc-gold-400 ${checked ? "bg-arc-gold-500" : "bg-gray-300"}`}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

// One payment-method card (bank account / payment link / UPI): header with an
// on/off switch, body only while it is on.
function MethodCard({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-sm border ${enabled ? "border-arc-gold-400" : "border-gray-200"} bg-white`}>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <Switch checked={enabled} onChange={onToggle} label={`${title} on invoice`} />
      </div>
      {enabled && <div className="px-3 pb-3 pt-3 space-y-3 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function Field({
  label,
  error,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

// Fixed-width sheet scaled down to whatever width the pane has, so the live
// preview is the real invoice at true proportions, not a re-flowed imitation.
function ScaledSheet({ form }: { form: InvoiceForm }) {
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

function PartnerModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (p: PartnerLite) => void }) {
  const [payload, setPayload] = useState<PartnerPayload>({
    legalName: "", nickname: "", country: "", email: "", partnerType: "",
    addressLine1: "", addressLine2: "", city: "", state: "", zipcode: ""
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const p = await createPartner(payload);
      toast.success("Partner saved");
      onSuccess(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create partner");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div className="bg-white rounded-sm w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Create Partner</h2>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <Field label="Legal Name" htmlFor="p-name">
                <input id="p-name" required className={inputCls} value={payload.legalName} onChange={e => setPayload({...payload, legalName: e.target.value})} />
             </Field>
             <Field label="Nickname" htmlFor="p-nick">
                <input id="p-nick" required className={inputCls} value={payload.nickname} onChange={e => setPayload({...payload, nickname: e.target.value})} />
             </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <Field label="Email" htmlFor="p-email">
                <input type="email" required id="p-email" className={inputCls} value={payload.email} onChange={e => setPayload({...payload, email: e.target.value})} />
             </Field>
             <Field label="Partner Type" htmlFor="p-type">
                <select id="p-type" required className={inputCls} value={payload.partnerType} onChange={e => setPayload({...payload, partnerType: e.target.value})}>
                  <option value="">Select</option>
                  {PARTNER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
             </Field>
          </div>
          <Field label="Country" htmlFor="p-country">
            <select id="p-country" required className={inputCls} value={payload.country} onChange={e => setPayload({...payload, country: e.target.value})}>
              <option value="">Select</option>
              {PARTNER_COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Address Line 1" htmlFor="p-line1">
            <input id="p-line1" required className={inputCls} value={payload.addressLine1} onChange={e => setPayload({...payload, addressLine1: e.target.value})} />
          </Field>
          <Field label="Address Line 2 (Optional)" htmlFor="p-line2">
            <input id="p-line2" className={inputCls} value={payload.addressLine2} onChange={e => setPayload({...payload, addressLine2: e.target.value})} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City" htmlFor="p-city">
              <input id="p-city" required className={inputCls} value={payload.city} onChange={e => setPayload({...payload, city: e.target.value})} />
            </Field>
            <Field label="State" htmlFor="p-state">
              <input id="p-state" required className={inputCls} value={payload.state} onChange={e => setPayload({...payload, state: e.target.value})} />
            </Field>
            <Field label="Zipcode" htmlFor="p-zip">
              <input id="p-zip" required className={inputCls} value={payload.zipcode} onChange={e => setPayload({...payload, zipcode: e.target.value})} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-arc-gold-500 text-white rounded-sm hover:bg-arc-gold-600 disabled:opacity-60">{saving ? "Saving..." : "Save Partner"}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function InvoiceContent() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [form, setFormRaw] = useState<InvoiceForm>(() => ({ ...emptyInvoice(), date: invoiceId ? "" : todayISO() }));
  const [id, setId] = useState<string | null>(null);
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [loading, setLoading] = useState(!!invoiceId);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [attempted, setAttempted] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ details: true, from: true, to: true });
  const isActive = status === "active";
  const [partners, setPartners] = useState<PartnerLite[]>(() => peekPrefill()?.partners ?? []);
  const [partnerId, setPartnerId] = useState("");
  const [nextNo, setNextNo] = useState(() => peekPrefill()?.invoiceNo ?? "");
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  // Every edit goes through here: marks the form dirty and clears any
  // server-reported field error (it referred to the old value).
  const setForm = (updater: (f: InvoiceForm) => InvoiceForm) => {
    setFormRaw(updater);
    setDirty(true);
    setServerErrors({});
  };

  const errors: Errors = useMemo(() => ({ ...validateInvoice(form), ...serverErrors }), [form, serverErrors]);
  const err = (key: string, value: string) => (value || attempted || serverErrors[key] ? errors[key] : undefined);

  // Errors per section, for the "N to fix" badges. Like the per-field
  // messages, only shown once a save/download has been attempted (or the
  // server flagged a field) - an untouched form isn't "wrong" yet.
  const errorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const k of Object.keys(errors)) {
      if (!attempted && !serverErrors[k]) continue;
      counts[sectionOfError(k)] = (counts[sectionOfError(k)] ?? 0) + 1;
    }
    return counts;
  }, [errors, attempted, serverErrors]);
  const totals = useMemo(() => computeTotals(form), [form]);
  const money = (v: bigint) => `${form.currency} ${formatMoney(v, form.currency)}`;
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  // A failed save/create/download: show errors and open every section that has one.
  const revealErrors = (errs: Errors) => {
    setAttempted(true);
    setTab("edit");
    setOpen((o) => {
      const next = { ...o };
      for (const k of Object.keys(errs)) next[sectionOfError(k)] = true;
      return next;
    });
  };

  const set = <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Load an existing invoice (draft to keep editing, or active to view), or
  // pre-fill a new one. Everything comes from one cheap request
  // (/invoice/prefill); a copy from an earlier visit is applied instantly and
  // refreshed in the background.
  const bankApplied = useRef(false);
  useEffect(() => {
    let cancelled = false;

    const onPrefill = (pf: InvoicePrefill) => {
      if (cancelled) return;
      setPartners(pf.partners);
      setNextNo(pf.invoiceNo);
      if (invoiceId) return;
      const applyBank = !bankApplied.current && !!pf.bank;
      if (applyBank) bankApplied.current = true;
      setFormRaw((f) => withPrefill(f, pf, applyBank));
    };

    const cached = peekPrefill();
    if (cached) onPrefill(cached);
    getPrefill().then(onPrefill).catch(() => {});

    if (!invoiceId) return () => { cancelled = true; };

    getInvoice(invoiceId)
      .then((rec) => {
        if (cancelled) return;
        setFormRaw(recordToForm(rec));
        setId(rec._id);
        setStatus(rec.status);
        setDirty(false);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Could not load the invoice");
        navigate("/invoices", { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId, navigate]);

  // Fill the "bill to" fields from a saved partner.
  const choosePartner = (pid: string) => {
    setPartnerId(pid);
    const p = partners.find((x) => x._id === pid);
    if (p) setForm((f) => ({ ...f, ...partnerFields(p) }));
  };

  // Unsaved edits: warn on tab close/refresh.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Server field keys ("items.0.qty") -> this page's input keys ("item-0-qty").
  const showApiError = (e: unknown, fallback: string) => {
    if (e instanceof InvoiceApiError && e.fieldErrors) {
      const mapped: Errors = {};
      for (const [k, v] of Object.entries(e.fieldErrors)) {
        const m = /^items\.(\d+)\.(\w+)$/.exec(k);
        mapped[m ? `item-${m[1]}-${m[2]}` : k] = String(v);
      }
      setServerErrors(mapped);
      revealErrors(mapped);
    }
    toast.error(e instanceof Error ? e.message : fallback);
  };

  const saveDraft = async (): Promise<string> => {
    const saved = id ? await updateInvoice(id, form) : await createDraft(form);
    setId(saved._id);
    setDirty(false);
    return saved._id;
  };

  const onSaveDraft = async () => {
    if (busy) return;
    if (isActive) {
      const errs = validateInvoice(form);
      if (Object.keys(errs).length > 0) {
        revealErrors(errs);
        toast.error("Fix the highlighted fields first");
        return;
      }
    }
    setBusy(true);
    try {
      const savedId = await saveDraft();
      toast.success(isActive ? "Changes saved" : "Draft saved");
      if (!id) navigate(`/invoices/${savedId}`, { replace: true });
    } catch (e) {
      showApiError(e, "Could not save the draft");
    } finally {
      setBusy(false);
    }
  };

  const onCreateInvoice = async () => {
    if (busy || isActive) return;
    const errs = validateInvoice(form);
    if (Object.keys(errs).length > 0) {
      revealErrors(errs);
      toast.error("Fix the highlighted fields first");
      return;
    }
    setBusy(true);
    try {
      await activateInvoice(await saveDraft());
      toast.success("Invoice created");
      navigate("/invoices?tab=active", { replace: true });
    } catch (e) {
      showApiError(e, "Could not create the invoice");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!id || busy) return;
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteInvoice(id);
      setDirty(false);
      toast.success("Invoice deleted");
      navigate(isActive ? "/invoices?tab=active" : "/invoices", { replace: true });
    } catch (e) {
      showApiError(e, "Could not delete the invoice");
      setBusy(false);
    }
  };

  const text = (key: keyof InvoiceForm, max: number, multiline = false) => (e: { target: { value: string } }) =>
    set(key, cleanText(e.target.value, max, multiline) as never);

  const setItem = (itemId: string, patch: Partial<LineItem>) =>
    setForm((f) => ({ ...f, items: f.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));

  const onSignature = async (file: File | undefined) => {
    if (!file) return;
    try {
      set("signature", await processSignature(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not use that image");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      set("logo", await processLogo(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not use that image");
    } finally {
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  const onCountry = (code: string) => {
    setForm((f) => ({
      ...f,
      clientCountry: code,
      // Suggest the matching transfer type; the user can still switch it.
      bankMode: code === "" ? f.bankMode : code === "IN" ? "domestic" : "swift",
    }));
  };

  // Print target: a copy of the sheet portalled to <body>, hidden on screen
  // and the only thing shown by the @media print rules below - so the app
  // shell (sidebar, banners, form) never ends up in the saved PDF.
  const [printRoot] = useState(() => document.createElement("div"));
  useEffect(() => {
    printRoot.className = "invoice-print-root";
    document.body.appendChild(printRoot);
    return () => {
      document.body.removeChild(printRoot);
    };
  }, [printRoot]);

  // The print copy only exists while printing, so typing doesn't render the
  // sheet twice. The effect runs after it is in the DOM.
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

  // A draft shows the number it will receive; the preview stays responsive
  // while typing because it renders from a deferred copy of the form.
  const sheetForm = useMemo(() => (form.invoiceNo || !nextNo ? form : { ...form, invoiceNo: nextNo }), [form, nextNo]);
  const previewForm = useDeferredValue(sheetForm);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading invoice...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {showPartnerModal && (
        <PartnerModal 
          onClose={() => setShowPartnerModal(false)}
          onSuccess={(p) => {
            addPartnerToPrefillCache(p);
            setPartners((prev) => [p, ...prev]);
            setPartnerId(p._id);
            setForm((f) => ({ ...f, ...partnerFields(p) }));
            setShowPartnerModal(false);
          }}
        />
      )}
      <style>{`
        .invoice-print-root { display: none; }
        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          body > *:not(.invoice-print-root) { display: none !important; }
          .invoice-print-root { display: block !important; }
        }
      `}</style>

      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" aria-label="Back to invoices" onClick={() => navigate("/invoices")} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {isActive ? "Edit invoice" : id ? "Edit draft" : "Create invoice"}
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${isActive ? "bg-green-50 text-green-700" : "bg-arc-gold-50 text-arc-gold-700"}`}>
                {isActive ? "Active" : "Draft"}
              </span>
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              {isActive ? "Changes apply only after you click Save changes." : "Nothing is stored until you click Save draft or Create invoice."}
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
          <button type="button" disabled={busy} onClick={onSaveDraft} className="rounded-sm border border-arc-gold-500 text-arc-gold-700 hover:bg-arc-gold-50 disabled:opacity-60 px-3 py-2 text-sm font-medium">
            {busy ? "Saving..." : isActive ? "Save changes" : "Save draft"}
          </button>
          {!isActive && (
            <button type="button" disabled={busy} onClick={onCreateInvoice} className="rounded-sm bg-arc-gold-500 hover:bg-arc-gold-600 disabled:opacity-60 text-white px-3 py-2 text-sm font-medium">
              Create invoice
            </button>
          )}
        </div>
      </div>

      {/* Below lg the two halves become tabs; from lg they sit side by side. */}
      <div className="lg:hidden flex border-b border-gray-100 shrink-0">
        {(["edit", "preview"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex-1 py-2 text-sm font-medium ${tab === k ? "text-arc-gold-600 border-b-2 border-arc-gold-500" : "text-gray-500"}`}
          >
            {k === "edit" ? "Details" : "Live preview"}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-2">
        {/* LEFT: inputs */}
        <fieldset disabled={busy} className={`${tab === "edit" ? "block" : "hidden"} lg:block h-full overflow-y-auto p-4 space-y-3 bg-gray-50 min-w-0`}>
          <Section id="details" title="Invoice details" open={!!open.details} onToggle={() => toggle("details")} errorCount={errorCounts.details ?? 0}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Invoice date" htmlFor="inv-date" error={err("date", form.date)}>
                <input id="inv-date" type="date" className={inputCls} value={form.date} onChange={(e) => set("date", e.target.value.slice(0, 10))} />
              </Field>
              <Field label="Due date (optional)" htmlFor="inv-due" error={err("dueDate", form.dueDate)}>
                <input id="inv-due" type="date" className={inputCls} value={form.dueDate} onChange={(e) => set("dueDate", e.target.value.slice(0, 10))} />
              </Field>
              {/* Never typed: numbered sequentially (001, 002...) by the server when the invoice is created. */}
              <div className="min-w-0">
                <span className="block text-xs font-medium text-gray-600 mb-1">Invoice no.</span>
                <div className="text-sm text-gray-900 font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm">
                  {form.invoiceNo || nextNo || "..."}
                </div>
                {!form.invoiceNo && <p className="text-xs text-gray-500 mt-1">Assigned automatically when you create the invoice.</p>}
              </div>
              <Field label="PO / reference no. (optional)" htmlFor="inv-po" error={err("poNumber", form.poNumber)}>
                <input id="inv-po" className={inputCls} value={form.poNumber} onChange={text("poNumber", LIMITS.poNumber)} autoComplete="off" />
              </Field>
            </div>
          </Section>

          <Section id="from" title="Bill from" open={!!open.from} onToggle={() => toggle("from")} errorCount={errorCounts.from ?? 0}>
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">Logo</span>
              <input ref={logoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
              <div className="flex items-center gap-3">
                {safeLogoSrc(form.logo) && (
                  <img src={safeLogoSrc(form.logo) as string} alt="Logo preview" className="h-12 max-w-[120px] object-contain border border-gray-100 rounded-sm bg-white" />
                )}
                <button type="button" onClick={() => logoRef.current?.click()} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Upload size={16} /> {form.logo ? "Replace logo" : "Upload logo"}
                </button>
                {form.logo && (
                  <button type="button" onClick={() => set("logo", "")} className="inline-flex items-center gap-1 text-sm text-red-600">
                    <X size={14} /> Remove
                  </button>
                )}
              </div>
            </div>
            <Field label="Name / business" htmlFor="from-name" error={err("fromName", form.fromName)}>
              <input id="from-name" className={inputCls} value={form.fromName} onChange={text("fromName", LIMITS.name)} autoComplete="off" />
            </Field>
            <Field label="Address" htmlFor="from-addr" error={err("fromAddress", form.fromAddress)}>
              <textarea id="from-addr" rows={3} className={inputCls} value={form.fromAddress} onChange={text("fromAddress", LIMITS.address, true)} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Postal code" htmlFor="from-postal" error={err("fromPostal", form.fromPostal)}>
                <input id="from-postal" className={inputCls} value={form.fromPostal} onChange={text("fromPostal", LIMITS.postal)} autoComplete="off" />
              </Field>
              <Field label="Phone" htmlFor="from-phone" error={err("fromPhone", form.fromPhone)}>
                <input id="from-phone" type="tel" className={inputCls} value={form.fromPhone} onChange={text("fromPhone", LIMITS.phone)} autoComplete="off" />
              </Field>
              <Field label="Email" htmlFor="from-email" error={err("fromEmail", form.fromEmail)}>
                <input id="from-email" type="email" className={inputCls} value={form.fromEmail} onChange={text("fromEmail", LIMITS.email)} autoComplete="off" />
              </Field>
            </div>
          </Section>

          <Section id="to" title="Bill to" open={!!open.to} onToggle={() => toggle("to")} errorCount={errorCounts.to ?? 0}>
            <div className="flex items-end justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label htmlFor="partner-select" className="block text-xs font-medium text-gray-600 mb-1">Partner</label>
                <select
                  id="partner-select"
                  className={inputCls}
                  value={partnerId}
                  onChange={(e) => choosePartner(e.target.value)}
                >
                  <option value="">Select a partner</option>
                  {partners.map((p) => (
                    <option key={p._id} value={p._id}>{p.legalName || p.nickname}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowPartnerModal(true)}
                className="shrink-0 inline-flex items-center gap-1 rounded-sm border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Plus size={16} /> New partner
              </button>
            </div>

            {/* The client's details, filled from the partner. Editable so a missing or
                invalid value (e.g. no address on file) can be fixed here. */}
            {partnerId || form.toName || form.toAddress || errorCounts.to ? (
              <>
                <Field label="Name" htmlFor="to-name" error={err("toName", form.toName)}>
                  <input id="to-name" className={inputCls} value={form.toName} onChange={text("toName", LIMITS.name)} autoComplete="off" />
                </Field>
                <Field label="Address" htmlFor="to-addr" error={err("toAddress", form.toAddress)}>
                  <textarea id="to-addr" rows={3} className={inputCls} value={form.toAddress} onChange={text("toAddress", LIMITS.address, true)} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Country" htmlFor="to-country" error={err("toCountry", form.toCountry)}>
                    <select id="to-country" className={inputCls} value={form.toCountry} onChange={(e) => set("toCountry", e.target.value)}>
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Postal code" htmlFor="to-postal" error={err("toPostal", form.toPostal)}>
                    <input id="to-postal" className={inputCls} value={form.toPostal} onChange={text("toPostal", LIMITS.postal)} autoComplete="off" />
                  </Field>
                  <Field label="Email" htmlFor="to-email" error={err("toEmail", form.toEmail)}>
                    <input id="to-email" type="email" className={inputCls} value={form.toEmail} onChange={text("toEmail", LIMITS.email)} autoComplete="off" />
                  </Field>
                  <Field label="Phone (optional)" htmlFor="to-phone" error={err("toPhone", form.toPhone)}>
                    <input id="to-phone" type="tel" className={inputCls} value={form.toPhone} onChange={text("toPhone", LIMITS.phone)} autoComplete="off" />
                  </Field>
                  {(!form.toCountry || form.toCountry === "IN") && (
                    <Field label="GSTIN (optional)" htmlFor="to-gstin" error={err("toTaxId", form.toTaxId)}>
                      <input id="to-gstin" className={inputCls} value={form.toTaxId} onChange={(e) => set("toTaxId", cleanAlnumUpper(e.target.value, LIMITS.gstin))} autoComplete="off" />
                    </Field>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">Select a partner, or create a new one, to fill in the client details.</p>
            )}
          </Section>

          <Section id="items" title="Items" open={!!open.items} onToggle={() => toggle("items")} errorCount={errorCounts.items ?? 0}>
            <div className="sm:w-48">
              <Field label="Item currency" htmlFor="inv-cur">
                <select
                  id="inv-cur"
                  className={inputCls}
                  value={form.currency}
                  onChange={(e) => {
                    const c = CURRENCIES.find((x) => x === e.target.value);
                    if (c) set("currency", c as Currency);
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            {form.items.map((it, i) => {
              const amount = lineAmount(it.qty, it.unitPrice);
              return (
                <div key={it.id} className="rounded-sm border border-gray-100 p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-8 text-xs font-medium text-gray-400 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <Field label="Item" htmlFor={`it-n-${i}`} error={err(`item-${i}-name`, it.name)}>
                          <input id={`it-n-${i}`} className={inputCls} placeholder="Add item" value={it.name} onChange={(e) => setItem(it.id, { name: cleanText(e.target.value, LIMITS.itemName) })} autoComplete="off" />
                        </Field>
                      </div>
                      <Field label="SAC/HSN (optional)" htmlFor={`it-h-${i}`} error={err(`item-${i}-sacHsn`, it.sacHsn)}>
                        <input id={`it-h-${i}`} inputMode="numeric" className={inputCls} placeholder="eg. 998314" value={it.sacHsn} onChange={(e) => setItem(it.id, { sacHsn: cleanDigits(e.target.value, LIMITS.sacHsn) })} autoComplete="off" />
                      </Field>
                      <div className="sm:col-span-3">
                        <Field label="Description (optional)" htmlFor={`it-d-${i}`} error={err(`item-${i}-description`, it.description)}>
                          <input id={`it-d-${i}`} className={inputCls} placeholder="Description" value={it.description} onChange={(e) => setItem(it.id, { description: cleanText(e.target.value, LIMITS.description) })} autoComplete="off" />
                        </Field>
                      </div>
                      <Field label="Quantity" htmlFor={`it-q-${i}`} error={err(`item-${i}-qty`, it.qty)}>
                        <input id={`it-q-${i}`} inputMode="decimal" className={inputCls} value={it.qty} onChange={(e) => setItem(it.id, { qty: cleanDecimal(e.target.value, 9) })} autoComplete="off" />
                      </Field>
                      <Field label="Rate" htmlFor={`it-p-${i}`} error={err(`item-${i}-unitPrice`, it.unitPrice)}>
                        <input id={`it-p-${i}`} inputMode="decimal" className={inputCls} placeholder={form.currency} value={it.unitPrice} onChange={(e) => setItem(it.id, { unitPrice: cleanDecimal(e.target.value, 13) })} autoComplete="off" />
                      </Field>
                      <Field label="Amount" htmlFor={`it-a-${i}`}>
                        <input id={`it-a-${i}`} readOnly tabIndex={-1} className={`${inputCls} bg-gray-50 text-right`} value={`${form.currency} ${formatMoney(amount ?? 0n, form.currency)}`} />
                      </Field>
                    </div>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove item ${i + 1}`}
                        onClick={() => setForm((f) => ({ ...f, items: f.items.filter((x) => x.id !== it.id) }))}
                        className="mt-8 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {form.items.length < MAX_ITEMS && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, newItem()] }))}
                className="w-full inline-flex items-center justify-center gap-2 rounded-sm border border-dashed border-arc-gold-300 bg-arc-gold-50/50 py-2.5 text-sm font-medium text-arc-gold-700 hover:bg-arc-gold-50"
              >
                <Plus size={16} /> Add item
              </button>
            )}

            {/* Totals panel */}
            <div className="w-full rounded-sm border border-gray-200 bg-gray-50/60 p-4 space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Sub total</span>
                <span>{money(totals.subtotal)}</span>
              </div>

              <div className="space-y-4">
              {form.discountType === "" ? (
                <button
                  type="button"
                  onClick={() => set("discountType", "percent")}
                  className="inline-flex items-center gap-1 rounded-sm border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Plus size={14} /> Add discount
                </button>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-36 shrink-0">
                    <select
                      aria-label="Discount type"
                      className={inputCls}
                      value={form.discountType}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "percent" || v === "amount") setForm((f) => ({ ...f, discountType: v as DiscountType, discountValue: "" }));
                      }}
                    >
                      <option value="percent">Percent %</option>
                      <option value="amount">Amount</option>
                    </select>
                    </div>
                    <div className="min-w-0 flex-1">
                    <input
                      aria-label="Discount value"
                      inputMode="decimal"
                      className={inputCls}
                      placeholder={form.discountType === "percent" ? "e.g. 10" : form.currency}
                      value={form.discountValue}
                      onChange={(e) => set("discountValue", cleanDecimal(e.target.value, form.discountType === "percent" ? 6 : 13))}
                      autoComplete="off"
                    />
                    </div>
                    <button
                      type="button"
                      aria-label="Remove discount"
                      onClick={() => setForm((f) => ({ ...f, discountType: "", discountValue: "" }))}
                      className="shrink-0 text-gray-400 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {err("discountValue", form.discountValue) && (
                    <p role="alert" className="text-xs text-red-600">{errors.discountValue}</p>
                  )}
                  {totals.discount > 0n && (
                    <p className="text-xs text-gray-500">Discount: - {money(totals.discount)}</p>
                  )}
                </div>
              )}

              <Field label="Tax rate % (optional, applied after discount)" htmlFor="tax-rate" error={err("taxRate", form.taxRate)}>
                <input id="tax-rate" inputMode="decimal" className={inputCls} value={form.taxRate} onChange={(e) => set("taxRate", cleanDecimal(e.target.value, 6))} placeholder="e.g. 18" autoComplete="off" />
              </Field>
              </div>
              {totals.taxBps > 0n && (
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Tax</span>
                  <span>{money(totals.tax)}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm text-gray-800">
                <span>Round off</span>
                <Switch checked={form.roundOff} onChange={(v) => set("roundOff", v)} label="Round off total" />
              </div>
              {form.roundOff && totals.roundOff !== 0n && (
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Round off</span>
                  <span>{money(totals.roundOff)}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{money(totals.total)}</span>
              </div>
            </div>
          </Section>

          <Section id="payment" title="Payment methods" open={!!open.payment} onToggle={() => toggle("payment")} errorCount={errorCounts.payment ?? 0}>
            <div className="rounded-sm bg-gray-50 px-3 py-3">
              <Field label="Client's bank account country" htmlFor="client-country" error={err("clientCountry", form.clientCountry)}>
                <select id="client-country" className={inputCls} value={form.clientCountry} onChange={(e) => onCountry(e.target.value)}>
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <MethodCard title="Bank account" enabled={form.bankEnabled} onToggle={(v) => set("bankEnabled", v)}>
              <div role="radiogroup" aria-label="Bank transfer type" className="space-y-2">
                {([
                  ["domestic", "Domestic bank account (IFSC)"],
                  ["swift", "International SWIFT account"],
                ] as [BankMode, string][]).map(([mode, optionLabel]) => (
                  <label key={mode} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                    <input type="radio" name="bank-mode" checked={form.bankMode === mode} onChange={() => set("bankMode", mode)} className="accent-arc-gold-500" />
                    {optionLabel}
                  </label>
                ))}
              </div>
              <Field label="Name on bank account" htmlFor="b-holder" error={err("bankHolder", form.bankHolder)}>
                <input id="b-holder" className={inputCls} value={form.bankHolder} onChange={text("bankHolder", LIMITS.bankName)} autoComplete="off" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={form.bankMode === "swift" ? "Account number / IBAN" : "Account number"} htmlFor="b-acc" error={err("bankAccount", form.bankAccount)}>
                  <input
                    id="b-acc"
                    inputMode={form.bankMode === "swift" ? "text" : "numeric"}
                    className={inputCls}
                    value={form.bankAccount}
                    onChange={(e) => set("bankAccount", form.bankMode === "swift" ? cleanAlnumUpper(e.target.value, LIMITS.account) : cleanDigits(e.target.value, 18))}
                    autoComplete="off"
                  />
                </Field>
                {form.bankMode === "domestic" ? (
                  <Field label="IFSC code" htmlFor="b-ifsc" error={err("bankIfsc", form.bankIfsc)}>
                    <input id="b-ifsc" className={inputCls} value={form.bankIfsc} onChange={(e) => set("bankIfsc", cleanAlnumUpper(e.target.value, LIMITS.ifsc))} autoComplete="off" />
                  </Field>
                ) : (
                  <Field label="SWIFT / BIC code" htmlFor="b-swift" error={err("bankSwift", form.bankSwift)}>
                    <input id="b-swift" className={inputCls} value={form.bankSwift} onChange={(e) => set("bankSwift", cleanAlnumUpper(e.target.value, LIMITS.swift))} autoComplete="off" />
                  </Field>
                )}
              </div>
              <Field label="Bank name (optional)" htmlFor="b-name">
                <input id="b-name" className={inputCls} value={form.bankName} onChange={text("bankName", LIMITS.bankName)} autoComplete="off" />
              </Field>
              <Field label="Bank address (optional)" htmlFor="b-addr">
                <textarea id="b-addr" rows={2} className={inputCls} value={form.bankAddress} onChange={text("bankAddress", LIMITS.bankAddress, true)} />
              </Field>
            </MethodCard>

            <MethodCard title="Payment link" enabled={form.linkEnabled} onToggle={(v) => set("linkEnabled", v)}>
              <Field label="Payment link (https://...)" htmlFor="pay-link" error={err("paymentLink", form.paymentLink)}>
                <input id="pay-link" type="url" inputMode="url" className={inputCls} value={form.paymentLink} onChange={(e) => set("paymentLink", e.target.value.replace(/\s/g, "").slice(0, LIMITS.url))} placeholder="https://" autoComplete="off" />
              </Field>
            </MethodCard>

            <MethodCard title="UPI" enabled={form.upiEnabled} onToggle={(v) => set("upiEnabled", v)}>
              <Field label="UPI ID" htmlFor="upi-id" error={err("upiId", form.upiId)}>
                <input id="upi-id" className={inputCls} value={form.upiId} onChange={(e) => set("upiId", e.target.value.replace(/\s/g, "").slice(0, LIMITS.upi))} placeholder="name@bank" autoComplete="off" />
              </Field>
            </MethodCard>
          </Section>

          <Section id="notes" title="Remarks & signature" open={!!open.notes} onToggle={() => toggle("notes")} errorCount={errorCounts.notes ?? 0}>
            <Field label="Remarks / payment instructions" htmlFor="remarks">
              <textarea id="remarks" rows={3} className={inputCls} value={form.remarks} onChange={text("remarks", LIMITS.remarks, true)} />
            </Field>
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">Signature</span>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onSignature(e.target.files?.[0])} />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Upload size={16} /> {form.signature ? "Replace signature" : "Upload PNG / JPEG"}
                </button>
                {form.signature && (
                  <button type="button" onClick={() => set("signature", "")} className="inline-flex items-center gap-1 text-sm text-red-600">
                    <X size={14} /> Remove
                  </button>
                )}
              </div>
            </div>
          </Section>
        </fieldset>

        {/* RIGHT: live invoice */}
        <div className={`${tab === "preview" ? "block" : "hidden"} lg:block h-full overflow-y-auto p-4 bg-gray-100 border-l border-gray-100`}>
          <ScaledSheet form={previewForm} />
        </div>
      </div>

      {printing && createPortal(<InvoiceSheet form={sheetForm} />, printRoot)}
    </div>
  );
}

export default function InvoicePage() {
  return (
    <AppShell>
      <InvoiceContent />
    </AppShell>
  );
}
