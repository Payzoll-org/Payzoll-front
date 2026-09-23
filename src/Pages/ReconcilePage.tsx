import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  X,
  ClipboardList,
  Check,
  ChevronsUpDown,
  ArrowUpFromLine,
  ArrowLeft,
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
import ctaCoin from "../assets/coin-gold.webp";

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
            className="w-full flex items-center gap-2 px-4 py-3 text-arc-gold-600 font-semibold text-sm hover:bg-arc-gold-50"
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
                    o.id === value ? "bg-arc-gold-50 text-arc-gold-700" : "text-gray-700"
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

// Full ISO 3166-1 alpha-2 country list (confirmed by the team that
// XflowPay now accepts all of these for a partner's address - previously
// this was a hand-picked subset over concern some codes would be
// rejected, e.g. IN, which used to fail live with
// country_code_not_supported despite passing XflowPay's own schema
// format check; kept out here for the same reason - a partner is the
// overseas counterparty a connected user (always India-based on this
// platform) reconciles cross-border funds with, so a same-country
// partner isn't a real case).
const COUNTRY_OPTIONS = [
  { code: "AL", label: "Albania" },
  { code: "DZ", label: "Algeria" },
  { code: "AD", label: "Andorra" },
  { code: "AO", label: "Angola" },
  { code: "AI", label: "Anguilla" },
  { code: "AG", label: "Antigua and Barbuda" },
  { code: "AR", label: "Argentina" },
  { code: "AM", label: "Armenia" },
  { code: "AW", label: "Aruba" },
  { code: "AU", label: "Australia" },
  { code: "AT", label: "Austria" },
  { code: "AZ", label: "Azerbaijan" },
  { code: "BS", label: "Bahamas" },
  { code: "BH", label: "Bahrain" },
  { code: "BB", label: "Barbados" },
  { code: "BE", label: "Belgium" },
  { code: "BZ", label: "Belize" },
  { code: "BJ", label: "Benin" },
  { code: "BM", label: "Bermuda" },
  { code: "BO", label: "Bolivia (Plurinational State of)" },
  { code: "BA", label: "Bosnia and Herzegovina" },
  { code: "BW", label: "Botswana" },
  { code: "BR", label: "Brazil" },
  { code: "BN", label: "Brunei Darussalam" },
  { code: "BG", label: "Bulgaria" },
  { code: "BF", label: "Burkina Faso" },
  { code: "BI", label: "Burundi" },
  { code: "CV", label: "Cabo Verde" },
  { code: "KH", label: "Cambodia" },
  { code: "CM", label: "Cameroon" },
  { code: "CA", label: "Canada" },
  { code: "KY", label: "Cayman Islands" },
  { code: "TD", label: "Chad" },
  { code: "CL", label: "Chile" },
  { code: "CN", label: "China" },
  { code: "CO", label: "Colombia" },
  { code: "CG", label: "Congo" },
  { code: "CR", label: "Costa Rica" },
  { code: "HR", label: "Croatia" },
  { code: "CY", label: "Cyprus" },
  { code: "CZ", label: "Czech Republic" },
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "DK", label: "Denmark" },
  { code: "DJ", label: "Djibouti" },
  { code: "DM", label: "Dominica" },
  { code: "DO", label: "Dominican Republic" },
  { code: "EC", label: "Ecuador" },
  { code: "EG", label: "Egypt" },
  { code: "GQ", label: "Equatorial Guinea" },
  { code: "ER", label: "Eritrea" },
  { code: "EE", label: "Estonia" },
  { code: "SZ", label: "Eswatini" },
  { code: "FK", label: "Falkland Islands (Malvinas)" },
  { code: "FO", label: "Faroe Islands" },
  { code: "FJ", label: "Fiji" },
  { code: "FI", label: "Finland" },
  { code: "FR", label: "France" },
  { code: "GF", label: "French Guiana" },
  { code: "PF", label: "French Polynesia" },
  { code: "GA", label: "Gabon" },
  { code: "GM", label: "Gambia" },
  { code: "GE", label: "Georgia" },
  { code: "DE", label: "Germany" },
  { code: "GH", label: "Ghana" },
  { code: "GI", label: "Gibraltar" },
  { code: "GR", label: "Greece" },
  { code: "GL", label: "Greenland" },
  { code: "GD", label: "Grenada" },
  { code: "GP", label: "Guadeloupe" },
  { code: "GU", label: "Guam" },
  { code: "GT", label: "Guatemala" },
  { code: "GN", label: "Guinea" },
  { code: "GW", label: "Guinea-Bissau" },
  { code: "HT", label: "Haiti" },
  { code: "HN", label: "Honduras" },
  { code: "HK", label: "Hong Kong" },
  { code: "HU", label: "Hungary" },
  { code: "IS", label: "Iceland" },
  { code: "ID", label: "Indonesia" },
  { code: "IE", label: "Ireland" },
  { code: "IL", label: "Israel" },
  { code: "IT", label: "Italy" },
  { code: "JM", label: "Jamaica" },
  { code: "JP", label: "Japan" },
  { code: "JO", label: "Jordan" },
  { code: "KZ", label: "Kazakhstan" },
  { code: "KE", label: "Kenya" },
  { code: "KI", label: "Kiribati" },
  { code: "KW", label: "Kuwait" },
  { code: "KG", label: "Kyrgyzstan" },
  { code: "LA", label: "Lao People's Democratic Republic" },
  { code: "LV", label: "Latvia" },
  { code: "LS", label: "Lesotho" },
  { code: "LR", label: "Liberia" },
  { code: "LI", label: "Liechtenstein" },
  { code: "LT", label: "Lithuania" },
  { code: "LU", label: "Luxembourg" },
  { code: "MO", label: "Macao" },
  { code: "MG", label: "Madagascar" },
  { code: "MW", label: "Malawi" },
  { code: "MY", label: "Malaysia" },
  { code: "MT", label: "Malta" },
  { code: "MR", label: "Mauritania" },
  { code: "MU", label: "Mauritius" },
  { code: "MX", label: "Mexico" },
  { code: "MD", label: "Moldova" },
  { code: "MC", label: "Monaco" },
  { code: "MN", label: "Mongolia" },
  { code: "ME", label: "Montenegro" },
  { code: "MA", label: "Morocco" },
  { code: "MZ", label: "Mozambique" },
  { code: "NA", label: "Namibia" },
  { code: "NL", label: "Netherlands" },
  { code: "NZ", label: "New Zealand" },
  { code: "NE", label: "Niger" },
  { code: "NG", label: "Nigeria" },
  { code: "NO", label: "Norway" },
  { code: "OM", label: "Oman" },
  { code: "PS", label: "Palestine" },
  { code: "PA", label: "Panama" },
  { code: "PG", label: "Papua New Guinea" },
  { code: "PY", label: "Paraguay" },
  { code: "PE", label: "Peru" },
  { code: "PH", label: "Philippines" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "PR", label: "Puerto Rico" },
  { code: "QA", label: "Qatar" },
  { code: "KR", label: "Republic of Korea" },
  { code: "RO", label: "Romania" },
  { code: "RE", label: "Réunion" },
  { code: "KN", label: "Saint Kitts and Nevis" },
  { code: "VC", label: "Saint Vincent and the Grenadines" },
  { code: "SM", label: "San Marino" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "SN", label: "Senegal" },
  { code: "RS", label: "Serbia" },
  { code: "SC", label: "Seychelles" },
  { code: "SL", label: "Sierra Leone" },
  { code: "SG", label: "Singapore" },
  { code: "SK", label: "Slovakia" },
  { code: "SI", label: "Slovenia" },
  { code: "ZA", label: "South Africa" },
  { code: "ES", label: "Spain" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "TW", label: "Taiwan" },
  { code: "TJ", label: "Tajikistan" },
  { code: "TZ", label: "Tanzania" },
  { code: "TH", label: "Thailand" },
  { code: "TL", label: "Timor-Leste" },
  { code: "TG", label: "Togo" },
  { code: "TT", label: "Trinidad and Tobago" },
  { code: "TN", label: "Tunisia" },
  { code: "TR", label: "Turkey" },
  { code: "TM", label: "Turkmenistan" },
  { code: "UG", label: "Uganda" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States of America" },
  { code: "UY", label: "Uruguay" },
  { code: "UZ", label: "Uzbekistan" },
  { code: "VU", label: "Vanuatu" },
  { code: "VN", label: "Vietnam" },
  { code: "VG", label: "Virgin Islands (British)" },
  { code: "ZM", label: "Zambia" },
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
  variant = "dark",
}: {
  receivable: Receivable | undefined;
  partner: Partner | undefined;
  amount: string;
  bankAccount: BankAccount | undefined;
  preview: ReconciliationPreview | null;
  // "dark" is the gold-gradient right panel shown at lg+; "light" is the
  // same content inlined into step 5 (Payout Information) on mobile, where
  // that panel doesn't have room to sit beside the form and is dropped
  // entirely instead - see ReconcilePage below.
  variant?: "dark" | "light";
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

  const isDark = variant === "dark";
  const cardClass = isDark
    ? "bg-white/10 border border-white/15 backdrop-blur-sm rounded-2xl"
    : "bg-gray-50 border border-gray-200 rounded-2xl";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/60" : "text-gray-500";
  const iconBoxClass = isDark
    ? "border border-white/20"
    : "border border-gray-200 bg-white";
  const iconColor = isDark ? "text-white/70" : "text-gray-500";
  const dividerFaint = isDark ? "border-white/10" : "border-gray-200";
  const dividerSoft = isDark ? "border-white/15" : "border-gray-200";
  const dividerDashed = isDark ? "border-white/20" : "border-gray-300";
  const feeColor = isDark ? "text-red-300" : "text-red-600";
  const accentColor = isDark ? "text-arc-gold-200" : "text-arc-gold-600";
  const infoBoxClass = isDark
    ? "bg-white/10 border border-white/10 rounded-xl"
    : "bg-white border border-gray-200 rounded-xl";
  const infoTextClass = isDark ? "text-white/80" : "text-gray-600";

  if (!receivable) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
            isDark ? "bg-white/10 border border-white/20" : "bg-gray-100 border border-gray-200"
          }`}
        >
          <ClipboardList size={26} className={accentColor} />
        </div>
        <p className={`text-base font-semibold ${textPrimary}`}>No invoice selected</p>
        <p className={`text-sm mt-1 ${textSecondary}`}>Select an invoice to see details here</p>
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
    <div className={isDark ? "flex-1 px-6 py-6 flex flex-col gap-4 overflow-y-auto" : "flex flex-col gap-4"}>
      {/* Receivable + Partner */}
      <div className={`${cardClass} p-5`}>
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBoxClass}`}>
            <FileText size={18} className={iconColor} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className={textSecondary}>Receivable</span>
              {due && (
                <>
                  <span className={isDark ? "text-white/30" : "text-gray-300"}>|</span>
                  <span
                    className={`font-medium ${
                      isDark
                        ? due.className === "text-red-600"
                          ? "text-red-300"
                          : "text-amber-300"
                        : due.className
                    }`}
                  >
                    {due.label}
                  </span>
                </>
              )}
            </div>
            <p className={`text-lg font-semibold mt-0.5 ${textPrimary}`}>
              {receivable.invoice.referenceNumber || receivable._id}
            </p>
          </div>
        </div>

        {partner && (
          <>
            <div className={`border-t my-4 ${dividerFaint}`} />
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBoxClass}`}>
                <User size={18} className={iconColor} />
              </div>
              <div>
                <p className={`text-sm ${textSecondary}`}>Partner</p>
                <p className={`text-base font-semibold ${textPrimary}`}>{partner.nickname}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Amount + indicative rate */}
      <div className={`${cardClass} p-5 flex flex-col gap-3`}>
        <div className="flex items-center justify-between text-sm">
          <span className={textSecondary}>Gross Amount</span>
          <span className={`font-semibold ${textPrimary}`}>
            {receivable.currency} {grossAmountNum.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={textSecondary}>Payout Fee</span>
          <span className={`font-semibold ${feeColor}`}>
            {feeRuleLoading ? "..." : payoutFee !== null ? `-${receivable.currency} ${payoutFee.toFixed(2)}` : "-"}
          </span>
        </div>

        <div className={`border-t border-dashed my-1 ${dividerDashed}`} />

        <div className="flex items-center justify-between text-sm">
          <span className={textSecondary}>Net Amount</span>
          <span className={`font-semibold ${textPrimary}`}>
            {feeRuleLoading ? "..." : netAmount !== null ? `${receivable.currency} ${netAmount.toFixed(2)}` : "-"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={textSecondary}>Transaction Rate</span>
          <span className={`font-medium flex items-center gap-1 ${textPrimary}`}>
            To be booked in 60 mins
            <ChevronDown size={14} className={isDark ? "text-white/50" : "text-gray-400"} />
          </span>
        </div>

        <div className={`border-t my-1 ${dividerSoft}`} />

        <button onClick={toggleIndicative} className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${textPrimary}`}>Gross Payout Amount</span>
          <span className={`text-sm font-medium ${accentColor}`}>
            {showIndicative ? "Hide indicative" : "View indicative"}
          </span>
        </button>

        {showIndicative && (
          <div className={`${infoBoxClass} p-4 flex items-start gap-2`}>
            <Info size={15} className={`${accentColor} shrink-0 mt-0.5`} />
            <p className={`text-sm ${infoTextClass}`}>
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
        <div className={`${cardClass} p-5 flex items-center gap-3`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBoxClass}`}>
            <FileText size={18} className={iconColor} />
          </div>
          <div className="text-sm">
            <p className={textPrimary}>
              <span className={textSecondary}>Payout to:</span>{" "}
              <span className="font-semibold">**** {bankLast4 || "----"}</span>
            </p>
            <p className={`mt-0.5 ${textPrimary}`}>
              <span className={textSecondary}>Payout on:</span>{" "}
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
      {/* Shown until lg - matches the lg breakpoint the two-column split
          below switches at. The desktop close button lives on the
          invoice-preview panel, which only appears at lg+ (always visible
          there since both columns sit side by side); below that, the panel
          is either dropped (mobile step-5 merge) or stacked far down the
          page, so there's otherwise no way back without scrolling. */}
      <div className="flex lg:hidden items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
        <button
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
          className="text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Reconcile</h1>
      </div>

      {dataLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-visible">
          {/* Left: form */}
          <div className="w-full lg:w-1/2 min-w-0 lg:overflow-y-auto px-4 sm:px-8 py-4">
            {submitError && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex flex-col gap-3">
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

                {/* Below lg there's no room for the invoice-preview panel
                    beside the form, so its content (receivable/partner,
                    amount breakdown, payout destination) is shown here
                    instead of being dropped. */}
                <div className="lg:hidden mb-4">
                  <InvoicePreviewPanel
                    receivable={selectedReceivable}
                    partner={selectedPartner}
                    amount={amount}
                    bankAccount={bankAccounts.find((a) => a._id === bankAccountId)}
                    preview={preview}
                    variant="light"
                  />
                </div>

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
                  className="px-8 h-12 flex items-center justify-center gap-3 bg-arc-gold-600 hover:bg-arc-gold-700 rounded-full
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

          {/* Right: invoice preview - lg+ only, see the light-variant
              InvoicePreviewPanel inlined into step 5 above for mobile/tablet. */}
          <div
            className="hidden lg:flex lg:w-1/2 min-w-0 relative overflow-hidden flex-col"
            style={{ backgroundImage: "linear-gradient(rgb(56,37,15) 0%, rgb(158,107,42) 100%)" }}
          >
            <button
              onClick={() => navigate("/dashboard")}
              aria-label="Close"
              className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={18} />
            </button>
            <img
              src={ctaCoin}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-[10%] -bottom-[10%] w-[45%] max-w-[260px] object-contain opacity-90 z-0"
            />
            <div className="relative z-10 flex-1 min-h-0 flex flex-col">
              <InvoicePreviewPanel
                receivable={selectedReceivable}
                partner={selectedPartner}
                amount={amount}
                bankAccount={bankAccounts.find((a) => a._id === bankAccountId)}
                preview={preview}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
