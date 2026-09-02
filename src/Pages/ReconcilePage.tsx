import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  X,
  ClipboardList,
  Check,
  ChevronsUpDown,
  ArrowUpFromLine,
  FileText,
  User,
  Info,
  ChevronDown,
} from "lucide-react";
import { createPartner, getPartners, PARTNER_TYPE_OPTIONS, type Partner } from "../services/partnerApi";
import {
  createReceivable,
  getReceivables,
  TRANSACTION_TYPE_OPTIONS,
  type Receivable,
} from "../services/receivableApi";
import { PURPOSE_CODE_OPTIONS } from "../services/aboutBusinessApi";
import { getBankAccounts, type BankAccount } from "../services/bankAccountApi";
import { getBalance, getKycProgress } from "../services/accountActivationApi";
import { getLiveRate, type LiveRate } from "../services/fxRateApi";
import { getPayoutFeeRule, type PayoutFeeRule } from "../services/feePlanApi";
import {
  previewReconciliation,
  submitReconciliation,
  type ReconciliationPreview,
} from "../services/reconcileApi";

const inputClass =
  "px-3 py-2.5 focus:outline-none focus:ring-0 border border-gray-300 rounded-sm focus:border-black transition text-sm bg-white";

const spaciousInputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-black transition text-sm placeholder:text-gray-400 bg-white";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-gray-900 mb-1 block">{children}</label>;
}

/** Centered modal dialog, matching the "Add New Partner"/"Add New Receivable" reference design. */
function FormModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-sm shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Close">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ComboboxOption {
  id: string;
  label: string;
}

/**
 * A "select or create" dropdown - shows existing options plus a "Create X"
 * action pinned to the top, matching the reference UI. Replaces a native
 * <select> for Partner/Receivable so the "create new" action can live
 * inside the same open panel instead of being one more <option> in the list.
 */
function Combobox({
  value,
  options,
  placeholder,
  disabledPlaceholder,
  createLabel,
  emptyLabel,
  disabled,
  invalid,
  onSelect,
  onCreateNew,
}: {
  value: string;
  options: ComboboxOption[];
  placeholder: string;
  disabledPlaceholder?: string;
  createLabel: string;
  emptyLabel: string;
  disabled?: boolean;
  invalid?: boolean;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.id === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`${inputClass} w-full flex items-center justify-between text-left disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
          invalid ? "border-red-400" : ""
        }`}
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected ? selected.label : disabled ? disabledPlaceholder || placeholder : placeholder}
        </span>
        <ChevronsUpDown size={16} className="text-gray-400 shrink-0 ml-2" />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1.5 w-full bg-white border border-gray-200 rounded-sm shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onCreateNew();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-blue-600 font-semibold text-sm hover:bg-blue-50"
          >
            {createLabel}
            <ArrowUpFromLine size={15} />
          </button>
          <div className="border-t border-gray-100" />
          <div className="max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6 px-4">{emptyLabel}</p>
            ) : (
              options.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => {
                    onSelect(o.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-left hover:bg-gray-50 ${
                    o.id === value ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  {o.label}
                  {o.id === value && <Check size={14} className="shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Common ISO 3166-1 alpha-2 codes - XflowPay accepts any valid code
// (errors.md), this is a manageable subset for the picker rather than all ~195.
// No "IN" here deliberately: confirmed live against the sandbox that
// XflowPay rejects it for a partner's address with country_code_not_supported
// even though IN passes their own schema's format check - a partner is the
// counterparty a connected user (always India-based on this platform)
// reconciles cross-border funds with, so a same-country partner isn't a
// case XflowPay supports.
const COUNTRY_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "IE", label: "Ireland" },
  { code: "SG", label: "Singapore" },
  { code: "HK", label: "Hong Kong" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "JP", label: "Japan" },
  { code: "CN", label: "China" },
  { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" },
  { code: "ZA", label: "South Africa" },
  { code: "CH", label: "Switzerland" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "NZ", label: "New Zealand" },
  { code: "IL", label: "Israel" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "KE", label: "Kenya" },
];

function SectionLabel({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-semibold text-gray-900">
        {step}. {title}
      </h3>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

interface PartnerForm {
  legalName: string;
  nickname: string;
  sameAsLegalName: boolean;
  country: string;
  email: string;
  partnerType: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipcode: string;
}

const emptyPartnerForm: PartnerForm = {
  legalName: "",
  nickname: "",
  sameAsLegalName: false,
  country: "",
  email: "",
  partnerType: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipcode: "",
};

/** Inline "add a partner" form - collapses back into the Select Partner dropdown on Cancel or Save. */
function PartnerCreateForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (partner: Partner) => void;
}) {
  const [form, setForm] = useState<PartnerForm>(emptyPartnerForm);
  const [loading, setLoading] = useState(false);
  const [partnerTypeTouched, setPartnerTypeTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = <K extends keyof PartnerForm>(key: K, value: PartnerForm[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "legalName" && prev.sameAsLegalName ? { nickname: value as string } : {}),
    }));
  };

  const toggleSameAsAbove = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      sameAsLegalName: checked,
      nickname: checked ? prev.legalName : prev.nickname,
    }));
  };

  const handleSubmit = async () => {
    setPartnerTypeTouched(true);
    setSubmitError(null);

    if (
      !form.legalName.trim() ||
      !form.nickname.trim() ||
      !form.country ||
      !form.email.trim() ||
      !form.partnerType ||
      !form.addressLine1.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.zipcode.trim()
    ) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const partner = await createPartner({
        legalName: form.legalName.trim(),
        nickname: form.nickname.trim(),
        country: form.country,
        email: form.email.trim(),
        partnerType: form.partnerType,
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        zipcode: form.zipcode.trim(),
      });
      onCreated(partner);
    } catch (error: any) {
      setSubmitError(error.message || "Failed to create partner");
    } finally {
      setLoading(false);
    }
  };

  const partnerTypeMissing = partnerTypeTouched && !form.partnerType;

  return (
    <FormModal title="Add New Partner" onClose={onCancel}>
      {submitError && (
        <div className="mb-5 px-4 py-3 rounded-sm bg-red-50 border border-red-200 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <FieldLabel>Legal Name</FieldLabel>
          <input
            type="text"
            value={form.legalName}
            onChange={(e) => update("legalName", e.target.value)}
            placeholder="Enter Partner's Legal Name"
            className={spaciousInputClass}
            disabled={loading}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <FieldLabel>Nickname</FieldLabel>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sameAsLegalName}
                onChange={(e) => toggleSameAsAbove(e.target.checked)}
                disabled={loading}
              />
              Same as above
            </label>
          </div>
          <input
            type="text"
            value={form.nickname}
            onChange={(e) => update("nickname", e.target.value)}
            placeholder="Enter Partner's Nickname"
            className={spaciousInputClass}
            disabled={loading || form.sameAsLegalName}
          />
        </div>

        <div>
          <FieldLabel>Country</FieldLabel>
          <select
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            className={spaciousInputClass}
            disabled={loading}
          >
            <option value="">Select Partner's Country</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Email</FieldLabel>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="Add Partner's Email ID"
            className={spaciousInputClass}
            disabled={loading}
          />
        </div>

        <div>
          <FieldLabel>Partner Type</FieldLabel>
          <select
            value={form.partnerType}
            onChange={(e) => update("partnerType", e.target.value)}
            className={`${spaciousInputClass} ${partnerTypeMissing ? "border-red-400" : ""}`}
            disabled={loading}
          >
            <option value="">Select Partner Type</option>
            {PARTNER_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Address</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <FieldLabel>Line 1</FieldLabel>
              <input
                type="text"
                value={form.addressLine1}
                onChange={(e) => update("addressLine1", e.target.value)}
                placeholder="Enter Address line 1"
                className={spaciousInputClass}
                disabled={loading}
              />
            </div>
            <div>
              <FieldLabel>Line 2</FieldLabel>
              <input
                type="text"
                value={form.addressLine2}
                onChange={(e) => update("addressLine2", e.target.value)}
                placeholder="Enter Address line 2"
                className={spaciousInputClass}
                disabled={loading}
              />
            </div>
            <div>
              <FieldLabel>City</FieldLabel>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Enter City"
                className={spaciousInputClass}
                disabled={loading}
              />
            </div>
            <div>
              <FieldLabel>State</FieldLabel>
              <input
                type="text"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder="Enter State"
                className={spaciousInputClass}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Zipcode</FieldLabel>
            <input
              type="text"
              value={form.zipcode}
              onChange={(e) => update("zipcode", e.target.value)}
              placeholder="Enter Zipcode"
              className={spaciousInputClass}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 h-10 flex items-center justify-center gap-2 bg-black text-white text-sm font-medium rounded-full
                      hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Save Partner"
            )}
          </button>
        </div>
      </div>
    </FormModal>
  );
}

// "activated" is the only status either a partner or a receivable can
// actually be used in (create a receivable against a partner, or reconcile
// a receivable) - everything else (draft/verifying/hold/input_required) is
// real in-progress state worth showing, not an error, but needs to read as
// "not ready yet" rather than looking identical to a usable one.
function StatusBadge({ status }: { status: string }) {
  const isActivated = status === "activated";
  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${
        isActivated ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {status}
    </span>
  );
}

function PartnerDetailCard({ partner }: { partner: Partner }) {
  return (
    <div className="border border-gray-200 rounded-sm p-4 bg-gray-50 flex flex-col gap-1.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-gray-900">{partner.legalName}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 capitalize">{partner.partnerType?.replace(/_/g, " ")}</span>
          <StatusBadge status={partner.status} />
        </div>
      </div>
      <p className="text-gray-500">{partner.nickname}</p>
      <p className="text-gray-500">{partner.email}</p>
      {partner.physicalAddress?.country && (
        <p className="text-gray-400 text-xs">
          {[partner.physicalAddress.city, partner.physicalAddress.country].filter(Boolean).join(", ")}
        </p>
      )}
      {partner.status !== "activated" && (
        <p className="text-xs text-amber-700 mt-1">
          This partner is still being verified by Payzoll. You'll be able to create a receivable against them once
          verification completes.
        </p>
      )}
    </div>
  );
}

interface ReceivableForm {
  transactionType: string;
  purposeCode: string;
  invoiceNumber: string;
  description: string;
  invoiceAmount: string;
  amountMaximumReconcilable: string;
  invoiceDate: string;
  dueDate: string;
}

const emptyReceivableForm: ReceivableForm = {
  transactionType: "",
  purposeCode: "",
  invoiceNumber: "",
  description: "",
  invoiceAmount: "",
  amountMaximumReconcilable: "",
  invoiceDate: "",
  dueDate: "",
};

/** Inline "add a receivable" form - collapses back into the Select Receivable dropdown on Cancel or Save. */
function ReceivableCreateForm({
  partnerId,
  onCancel,
  onCreated,
}: {
  partnerId: string;
  onCancel: () => void;
  onCreated: (receivable: Receivable) => void;
}) {
  const [form, setForm] = useState<ReceivableForm>(emptyReceivableForm);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Only the purpose codes XflowPay has actually approved for this account
  // (Services/account.service.js's getKycProgress reads these live, filtered
  // to status "approved") - showing the full PURPOSE_CODE_OPTIONS list here
  // would let someone pick a code XflowPay never granted them, which then
  // fails at XflowPay when the receivable is filed. null while loading;
  // falls back to the full list only if the fetch itself fails, so a
  // transient error doesn't block receivable creation entirely. A
  // successful fetch that comes back empty (KYC not done, or codes still
  // pending approval) stays an empty array - it is never widened to "all
  // codes" just because the user happens to have none granted yet.
  const [allowedPurposeCodes, setAllowedPurposeCodes] = useState<string[] | null>(null);

  useEffect(() => {
    getKycProgress()
      .then((progress) => {
        setAllowedPurposeCodes(progress.aboutBusiness?.purposeCodes ?? []);
      })
      .catch(() => setAllowedPurposeCodes(PURPOSE_CODE_OPTIONS.map((p) => p.code)));
  }, []);

  const purposeCodeOptions = allowedPurposeCodes
    ? PURPOSE_CODE_OPTIONS.filter((p) => allowedPurposeCodes.includes(p.code))
    : [];

  const update = <K extends keyof ReceivableForm>(key: K, value: ReceivableForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (
      !form.transactionType ||
      !form.purposeCode ||
      !form.invoiceNumber.trim() ||
      !invoiceFile ||
      !form.invoiceAmount.trim() ||
      !form.amountMaximumReconcilable.trim() ||
      !form.invoiceDate
    ) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const receivable = await createReceivable(
        {
          partnerId,
          transactionType: form.transactionType,
          purposeCode: form.purposeCode,
          invoiceNumber: form.invoiceNumber.trim(),
          description: form.description.trim() || undefined,
          invoiceAmount: form.invoiceAmount.trim(),
          currency: "USD",
          amountMaximumReconcilable: form.amountMaximumReconcilable.trim(),
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate || undefined,
        },
        invoiceFile
      );
      onCreated(receivable);
    } catch (error: any) {
      setSubmitError(error.message || "Failed to create receivable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal title="Add New Receivable" onClose={onCancel}>
      {submitError && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div>
          <FieldLabel>Type of Transaction</FieldLabel>
          <select
            value={form.transactionType}
            onChange={(e) => update("transactionType", e.target.value)}
            className={spaciousInputClass}
            disabled={loading}
          >
            <option value="">Select Type of Transaction</option>
            {TRANSACTION_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Invoice Purpose Code</FieldLabel>
          <select
            value={form.purposeCode}
            onChange={(e) => update("purposeCode", e.target.value)}
            className={spaciousInputClass}
            disabled={loading || allowedPurposeCodes === null || purposeCodeOptions.length === 0}
          >
            <option value="">
              {allowedPurposeCodes === null
                ? "Loading..."
                : purposeCodeOptions.length === 0
                ? "No approved purpose codes yet"
                : "Select..."}
            </option>
            {purposeCodeOptions.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
          {allowedPurposeCodes !== null && purposeCodeOptions.length === 0 && (
            <p className="text-xs text-amber-700 mt-1">
              XflowPay hasn't approved a purpose code for your account yet. Complete the "About Business" step in
              KYC if you haven't, or wait for approval - you'll get a notification once it's granted.
            </p>
          )}
        </div>

        <div>
          <FieldLabel>Invoice Number</FieldLabel>
          <input
            type="text"
            value={form.invoiceNumber}
            onChange={(e) => update("invoiceNumber", e.target.value)}
            placeholder="Enter the Invoice number"
            className={spaciousInputClass}
            disabled={loading}
          />
        </div>

        <div>
          <FieldLabel>Upload Invoice</FieldLabel>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0 file:text-sm file:font-medium
                      file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
            disabled={loading}
          />
          <p className="text-xs text-gray-400 mt-1">We accept PDF, JPEG or PNG files up to 10MB.</p>
        </div>

        <div>
          <FieldLabel>
            Invoice Description <span className="text-gray-400 font-normal">(Optional)</span>
          </FieldLabel>
          <input
            type="text"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Enter a short description for this Invoice."
            className={spaciousInputClass}
            disabled={loading}
          />
        </div>

        <div>
          <FieldLabel>Invoice Amount</FieldLabel>
          <div className="flex items-center gap-3 border border-gray-300 rounded-sm px-3 focus-within:border-black transition">
            <span className="text-sm font-medium text-gray-500">USD</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.invoiceAmount}
              onChange={(e) => update("invoiceAmount", e.target.value)}
              placeholder="0.00"
              className="flex-1 py-2 focus:outline-none focus:ring-0 text-sm bg-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Receivable Amount</FieldLabel>
          <div className="flex items-center gap-3 border border-gray-300 rounded-sm px-3 focus-within:border-black transition">
            <span className="text-sm font-medium text-gray-500">USD</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amountMaximumReconcilable}
              onChange={(e) => update("amountMaximumReconcilable", e.target.value)}
              placeholder="0.00"
              className="flex-1 py-2 focus:outline-none focus:ring-0 text-sm bg-transparent"
              disabled={loading}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Maximum amount that can be reconciled on this receivable</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Invoice Date</FieldLabel>
            <input
              type="date"
              value={form.invoiceDate}
              onChange={(e) => update("invoiceDate", e.target.value)}
              className={spaciousInputClass}
              disabled={loading}
            />
          </div>
          <div>
            <FieldLabel>
              Payment Due Date <span className="text-gray-400 font-normal">(Optional)</span>
            </FieldLabel>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
              className={spaciousInputClass}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 h-10 flex items-center justify-center gap-2 bg-black text-white text-sm font-medium rounded-full
                      hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Save Receivable"
            )}
          </button>
        </div>
      </div>
    </FormModal>
  );
}

/**
 * "Payment due today" / "Due in N days" / "Overdue" - computed from the
 * receivable's real due date, never shown when there isn't one. Only
 * surfaced for near-term dates (within a week) to match the reference,
 * which only calls this out when it's actually urgent.
 */
function dueBadge(dueDate: string | null): { label: string; className: string } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: "Overdue", className: "text-red-600" };
  if (diffDays === 0) return { label: "Payment due today", className: "text-red-600" };
  if (diffDays <= 7) return { label: `Due in ${diffDays} day${diffDays > 1 ? "s" : ""}`, className: "text-amber-600" };
  return null;
}

function InvoicePreviewPanel({
  receivable,
  partner,
  amount,
  bankAccount,
  preview,
}: {
  receivable: Receivable | undefined;
  partner: Partner | undefined;
  amount: string;
  bankAccount: BankAccount | undefined;
  preview: ReconciliationPreview | null;
}) {
  const [showIndicative, setShowIndicative] = useState(false);
  const [liveRate, setLiveRate] = useState<LiveRate | null>(null);
  const [liveRateLoading, setLiveRateLoading] = useState(false);
  const [liveRateError, setLiveRateError] = useState<string | null>(null);

  const [feeRule, setFeeRule] = useState<PayoutFeeRule | null>(null);
  const [feeRuleLoading, setFeeRuleLoading] = useState(false);

  useEffect(() => {
    if (!receivable) return;
    setFeeRuleLoading(true);
    getPayoutFeeRule(receivable.currency)
      .then(setFeeRule)
      .catch(() => setFeeRule(null))
      .finally(() => setFeeRuleLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivable?.currency]);

  if (!receivable) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center mb-4 shadow-sm">
          <ClipboardList size={26} className="text-indigo-300" />
        </div>
        <p className="text-base font-semibold text-gray-900">No invoice selected</p>
        <p className="text-sm text-gray-500 mt-1">Select an invoice to see details here</p>
      </div>
    );
  }

  const due = dueBadge(receivable.invoice.dueDate);
  const grossAmount = amount.trim() || receivable.invoice.amount || receivable.amountMaximumReconcilable;
  const grossAmountNum = Number(grossAmount);
  const bank = bankAccount?.bankAccount;
  const bankLast4 = bank?.last4 || bank?.number?.slice(-4);

  const payoutFee = feeRule
    ? Math.max(
        Number(feeRule.fixed) + (grossAmountNum * Number(feeRule.variable)) / 100,
        Number(feeRule.minimum)
      )
    : null;
  const netAmount = payoutFee !== null ? grossAmountNum - payoutFee : null;

  const toggleIndicative = () => {
    setShowIndicative((v) => !v);
    if (!liveRate && !liveRateLoading) {
      setLiveRateLoading(true);
      setLiveRateError(null);
      getLiveRate()
        .then(setLiveRate)
        .catch((err: any) => setLiveRateError(err.message || "Failed to fetch live rate"))
        .finally(() => setLiveRateLoading(false));
    }
  };

  const indicativeInr =
    liveRate && grossAmount ? (Number(grossAmount) * Number(liveRate.userRate)).toFixed(2) : null;

  return (
    <div className="flex-1 px-6 py-6 flex flex-col gap-4 overflow-y-auto">
      {/* Receivable + Partner */}
      <div className="bg-white border border-indigo-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl border border-indigo-100 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-gray-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Receivable</span>
              {due && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className={`font-medium ${due.className}`}>{due.label}</span>
                </>
              )}
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-0.5">
              {receivable.invoice.referenceNumber || receivable._id}
            </p>
          </div>
        </div>

        {partner && (
          <>
            <div className="border-t border-gray-100 my-4" />
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl border border-indigo-100 flex items-center justify-center shrink-0">
                <User size={18} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Partner</p>
                <p className="text-base font-semibold text-gray-900">{partner.nickname}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Amount + indicative rate */}
      <div className="bg-white border border-indigo-100 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Gross Amount</span>
          <span className="font-semibold text-gray-900">
            {receivable.currency} {grossAmountNum.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Payout Fee</span>
          <span className="font-semibold text-red-600">
            {feeRuleLoading ? "..." : payoutFee !== null ? `-${receivable.currency} ${payoutFee.toFixed(2)}` : "-"}
          </span>
        </div>

        <div className="border-t border-dashed border-gray-200 my-1" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Net Amount</span>
          <span className="font-semibold text-gray-900">
            {feeRuleLoading ? "..." : netAmount !== null ? `${receivable.currency} ${netAmount.toFixed(2)}` : "-"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Transaction Rate</span>
          <span className="font-medium text-gray-900 flex items-center gap-1">
            To be booked in 60 mins
            <ChevronDown size={14} className="text-gray-400" />
          </span>
        </div>

        <div className="border-t border-gray-200 my-1" />

        <button onClick={toggleIndicative} className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Gross Payout Amount</span>
          <span className="text-sm font-medium text-blue-600">
            {showIndicative ? "Hide indicative" : "View indicative"}
          </span>
        </button>

        {showIndicative && (
          <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-2">
            <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              {liveRateLoading
                ? "Fetching live indicative rate..."
                : liveRateError
                ? liveRateError
                : indicativeInr
                ? `≈ INR ${indicativeInr} at the current live rate (1 USD = INR ${liveRate?.userRate}). Only indicative - the rate has not been locked.`
                : "Only indicative FX rate can be shown as the rate has not been locked."}
            </p>
          </div>
        )}
      </div>

      {/* Payout destination */}
      {bankAccount && preview && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl border border-indigo-100 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-gray-500" />
          </div>
          <div className="text-sm">
            <p className="text-gray-900">
              <span className="text-gray-500">Payout to:</span>{" "}
              <span className="font-semibold">**** {bankLast4 || "----"}</span>
            </p>
            <p className="text-gray-900 mt-0.5">
              <span className="text-gray-500">Payout on:</span>{" "}
              <span className="font-semibold underline decoration-dotted underline-offset-2">
                {preview.payout_settlement_date} ({preview.timezone})
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReconcilePage() {
  const navigate = useNavigate();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [commonBalance, setCommonBalance] = useState("0.00");
  const [dataLoading, setDataLoading] = useState(true);

  const [partnerId, setPartnerId] = useState("");
  const [receivableId, setReceivableId] = useState("");
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");

  const [creatingPartner, setCreatingPartner] = useState(false);
  const [creatingReceivable, setCreatingReceivable] = useState(false);
  const [partnerTouched, setPartnerTouched] = useState(false);
  const [receivableTouched, setReceivableTouched] = useState(false);

  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPartners().catch(() => []),
      getReceivables().catch(() => []),
      getBankAccounts().catch(() => []),
      getBalance().catch(() => null),
    ]).then(([partnersList, receivablesList, bankAccountsList, balance]) => {
      setPartners(partnersList);
      setReceivables(receivablesList.filter((r) => r.currency === "USD"));
      // This flow only ever settles into INR ("Reconcile USD Funds" ->
      // "Withdraw in INR") - a EUR/USD EEFC payout account is a different
      // currency rail entirely, not just "not ready yet" like a verifying
      // status is, so it's excluded outright rather than shown-but-blocked
      // the way a non-activated status is below.
      const payoutAccounts = bankAccountsList.filter((a) => a.category === "user_payout" && a.currency === "INR");
      setBankAccounts(payoutAccounts);
      if (payoutAccounts.length === 1 && payoutAccounts[0].status === "activated") {
        setBankAccountId(payoutAccounts[0]._id);
      }
      const pendingUsd = balance?.pending.find((b) => b.currency === "USD");
      setCommonBalance(pendingUsd?.amount || "0.00");
      setDataLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!receivableId || !amount.trim() || !bankAccountId || Number(amount) <= 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const timer = setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(null);
      previewReconciliation({ receivableId, amount: amount.trim(), bankAccountId })
        .then(setPreview)
        .catch((error: any) => {
          setPreview(null);
          setPreviewError(error.message || "Failed to preview reconciliation");
        })
        .finally(() => setPreviewLoading(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [receivableId, amount, bankAccountId]);

  const hasNoBalance = Number(commonBalance) <= 0;
  const partnerReceivables = receivables.filter((r) => r.partner === partnerId);
  const selectedPartner = partners.find((p) => p._id === partnerId);
  const selectedReceivable = receivables.find((r) => r._id === receivableId);
  const selectedBankAccount = bankAccounts.find((a) => a._id === bankAccountId);
  const partnerMissing = partnerTouched && !partnerId;
  const receivableMissing = receivableTouched && !receivableId;
  const amountExceedsBalance = amount.trim() !== "" && Number(amount) > Number(commonBalance);
  // XflowPay rejects both "create a receivable against this partner" and
  // "reconcile against this receivable" outright until each is actually
  // activated (Payzoll-back's partner.service.js/receivable.service.js
  // comments) - a partner/receivable can otherwise sit in verifying/hold/
  // input_required for real days in live mode. Checked here so the user
  // sees a clear reason before hitting that raw error, not after.
  const partnerNotActivated = !!selectedPartner && selectedPartner.status !== "activated";

  const handleSubmit = async () => {
    setPartnerTouched(true);
    setReceivableTouched(true);
    setSubmitError(null);

    if (!partnerId || !receivableId || !amount.trim() || Number(amount) <= 0 || !bankAccountId) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    if (amountExceedsBalance) {
      setSubmitError(`Amount cannot exceed your common balance of USD ${commonBalance}`);
      return;
    }

    if (selectedReceivable && selectedReceivable.status !== "activated") {
      setSubmitError(
        `This receivable is still ${selectedReceivable.status} and can't be reconciled yet. Please wait for it to be activated.`
      );
      return;
    }

    if (selectedBankAccount && selectedBankAccount.status !== "activated") {
      setSubmitError(
        `This bank account is still ${selectedBankAccount.status} and can't receive funds yet. Please wait for it to be activated.`
      );
      return;
    }

    setLoading(true);
    try {
      await submitReconciliation({ receivableId, amount: amount.trim(), bankAccountId });
      toast.success("Reconciled successfully");
      navigate("/dashboard");
    } catch (error: any) {
      setSubmitError(error.message || "Failed to reconcile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-indigo-50 border-b border-indigo-100 shrink-0">
        <h1 className="text-md font-semibold text-gray-800">Reconcile USD Funds</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-500 hover:text-gray-800 p-1"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {dataLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Left: form */}
          <div className="w-1/2 min-w-0 overflow-y-auto px-8 py-8">
            {submitError && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* 1. Partner */}
              <div>
                <SectionLabel step={1} title="Partner" subtitle="Select a partner to reconcile with" />
                {partnerMissing && <p className="text-sm font-medium text-red-600 mb-2">Select a partner</p>}

                <Combobox
                  value={partnerId}
                  options={partners.map((p) => ({
                    id: p._id,
                    label:
                      p.status === "activated"
                        ? `${p.legalName} (${p.nickname})`
                        : `${p.legalName} (${p.nickname}) - ${p.status}`,
                  }))}
                  placeholder="Select or Upload a partner"
                  createLabel="Create partner"
                  emptyLabel="No partners found yet"
                  invalid={partnerMissing}
                  onSelect={(id) => {
                    setPartnerId(id);
                    setReceivableId("");
                  }}
                  onCreateNew={() => setCreatingPartner(true)}
                />

                {selectedPartner && (
                  <div className="mt-3">
                    <PartnerDetailCard partner={selectedPartner} />
                  </div>
                )}

                {creatingPartner && (
                  <PartnerCreateForm
                    onCancel={() => setCreatingPartner(false)}
                    onCreated={(partner) => {
                      setPartners((prev) => [partner, ...prev]);
                      setPartnerId(partner._id);
                      setReceivableId("");
                      setCreatingPartner(false);
                    }}
                  />
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* 2. Receivable */}
              <div>
                <SectionLabel step={2} title="Receivable" subtitle="Select USD receivable" />
                {receivableMissing && <p className="text-sm font-medium text-red-600 mb-2">Select USD receivable</p>}

                <Combobox
                  value={receivableId}
                  options={partnerReceivables.map((r) => ({
                    id: r._id,
                    label:
                      r.status === "activated"
                        ? `${r.invoice.referenceNumber || r._id} - ${r.currency} ${r.amountMaximumReconcilable}`
                        : `${r.invoice.referenceNumber || r._id} - ${r.currency} ${r.amountMaximumReconcilable} - ${r.status}`,
                  }))}
                  placeholder="Select or Upload an receivable"
                  disabledPlaceholder={
                    !partnerId ? "Select a partner first" : partnerNotActivated ? "Partner still being verified" : undefined
                  }
                  createLabel="Create receivable"
                  emptyLabel="No active USD invoices found"
                  disabled={!partnerId || partnerNotActivated}
                  invalid={receivableMissing}
                  onSelect={setReceivableId}
                  onCreateNew={() => setCreatingReceivable(true)}
                />
                {partnerNotActivated && (
                  <p className="text-xs text-amber-700 mt-2">
                    This partner is still {selectedPartner?.status} - you can create a receivable once Payzoll finishes
                    verifying them.
                  </p>
                )}

                {creatingReceivable && (
                  <ReceivableCreateForm
                    partnerId={partnerId}
                    onCancel={() => setCreatingReceivable(false)}
                    onCreated={(receivable) => {
                      setReceivables((prev) => [receivable, ...prev]);
                      setReceivableId(receivable._id);
                      setCreatingReceivable(false);
                    }}
                  />
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* 3. Amount */}
              <div>
                <SectionLabel step={3} title="Amount" subtitle="Enter the amount to reconcile" />

                <div className="flex items-center justify-between border border-gray-200 rounded-sm px-4 py-2 mb-4">
                  <span className="text-sm text-gray-700">Common Balance</span>
                  <span className="text-sm font-semibold text-gray-900">USD {commonBalance}</span>
                </div>

                {hasNoBalance && (
                  <div className="mb-4 px-4 py-2 rounded-sm bg-amber-50 border border-amber-200 text-sm text-amber-700">
                    You don't have any balance to reconcile yet. Funds need to arrive in your account before you can
                    reconcile.
                  </div>
                )}

                <label className="text-sm font-medium mb-2 text-gray-700 block">
                  Enter the amount to reconcile
                </label>
                <div
                  className={`flex items-center gap-3 border-b-2 transition ${
                    amountExceedsBalance ? "border-red-400" : "border-gray-300 focus-within:border-black"
                  }`}
                >
                  <span className="text-sm font-medium text-gray-500 px-1">USD</span>
                  <input
                    type="number"
                    min="0"
                    max={commonBalance}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-1 py-2 focus:outline-none focus:ring-0 text-sm lg:text-base bg-transparent"
                    disabled={loading}
                  />
                </div>
                {amountExceedsBalance && (
                  <p className="text-xs text-red-600 mt-1">
                    Amount cannot exceed your common balance of USD {commonBalance}
                  </p>
                )}
                {selectedReceivable && (
                  <p className="text-xs text-gray-400 mt-1">
                    Maximum reconcilable on this receivable: USD {selectedReceivable.amountMaximumReconcilable}
                  </p>
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* 4. Bank Information */}
              <div>
                <SectionLabel step={4} title="Bank Information" subtitle="Select the bank where you want to receive the funds" />
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className={`${inputClass} w-full`}
                  disabled={loading}
                >
                  <option value="">Select a bank account</option>
                  {bankAccounts.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.currency} - AC: **** {a.bankAccount?.number?.slice(-4) || a.bankAccount?.last4 || "----"}
                      {a.status !== "activated" ? ` - ${a.status}` : ""}
                    </option>
                  ))}
                </select>
                {bankAccounts.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    No payout bank accounts on file yet - add one from the dashboard first.
                  </p>
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* 5. Payout Information */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">5. Payout Information</h3>

                {previewLoading && (
                  <div className="border border-gray-200 rounded-sm px-5 py-3 flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Fetching payout preview...</span>
                  </div>
                )}

                {!previewLoading && previewError && (
                  <div className="border border-amber-200 bg-amber-50 rounded-sm px-5 py-3 text-sm text-amber-700">
                    {previewError}
                  </div>
                )}

                {!previewLoading && !previewError && preview && (
                  <div className="border border-gray-200 rounded-sm px-5 py-3 flex flex-col gap-3">
                    <p className="text-sm text-gray-600">
                      Converting <span className="font-medium text-gray-900">{preview.source_currency}</span> to{" "}
                      <span className="font-medium text-gray-900">{preview.destination_currency}</span>. Expected
                      to settle by{" "}
                      <span className="font-medium text-gray-900">{preview.payout_settlement_date}</span>{" "}
                      ({preview.timezone}).
                    </p>
                    <div className="flex flex-col gap-2 mt-1">
                      {preview.timeline.map((event, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{event.description}</span>
                          <span className="font-medium text-gray-900">{event.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!previewLoading && !previewError && !preview && (
                  <div className="border border-dashed border-gray-200 rounded-sm px-5 py-3 text-sm text-gray-400">
                    Select a receivable, amount, and bank account to preview payout timing.
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-2 pb-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading || hasNoBalance || amountExceedsBalance}
                  title={
                    hasNoBalance
                      ? "No balance available to reconcile"
                      : amountExceedsBalance
                      ? "Amount exceeds your common balance"
                      : undefined
                  }
                  className="px-8 h-12 flex items-center justify-center gap-3 bg-black rounded-full
                            hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="text-white font-medium">Reconcile</span>
                      <Check size={16} className="text-white" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: invoice preview */}
          <div className="w-1/2 min-w-0 overflow-y-auto bg-indigo-50/60 border-l border-indigo-100 flex flex-col">
            <InvoicePreviewPanel
              receivable={selectedReceivable}
              partner={selectedPartner}
              amount={amount}
              bankAccount={bankAccounts.find((a) => a._id === bankAccountId)}
              preview={preview}
            />
          </div>
        </div>
      )}
    </div>
  );
}
