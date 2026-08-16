import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPartner, PARTNER_TYPE_OPTIONS } from "../services/partnerApi";
import { createReceivable, getReceivables, TRANSACTION_TYPE_OPTIONS, type Receivable } from "../services/receivableApi";
import { PURPOSE_CODE_OPTIONS } from "../services/aboutBusinessApi";
import { getBankAccounts, type BankAccount } from "../services/bankAccountApi";
import { getBalance } from "../services/accountActivationApi";
import {
  previewReconciliation,
  submitReconciliation,
  type ReconciliationPreview,
} from "../services/reconcileApi";

const inputClass =
  "px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300 focus:border-black transition text-sm lg:text-base bg-transparent";

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

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <p className="text-xs font-medium text-gray-400 mb-2 tracking-wide">
      STEP {step} OF 3
    </p>
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

function PartnerStep({ onDone }: { onDone: (partnerId: string, partnerName: string) => void }) {
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

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
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

      onDone(partner._id, partner.legalName);
    } catch (error: any) {
      setSubmitError(error.message || "Failed to create partner");
    } finally {
      setLoading(false);
    }
  };

  const partnerTypeMissing = partnerTypeTouched && !form.partnerType;

  return (
    <>
      <StepIndicator step={1} />
      <h2 className="text-3xl lg:text-4xl font-light mb-2 text-gray-900">
        Add a reconciliation partner
      </h2>
      <p className="text-sm text-gray-600 mb-8">
        Create the counterparty you reconcile funds against with your payment partner
      </p>

      {submitError && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Legal Name *</label>
          <input
            type="text"
            value={form.legalName}
            onChange={(e) => update("legalName", e.target.value)}
            placeholder="Enter Partner's Legal Name"
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Nickname *</label>
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
            className={inputClass}
            disabled={loading || form.sameAsLegalName}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Country *</label>
          <select
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            className={inputClass}
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

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="Add Partner's Email ID"
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col">
          <label
            className={`text-sm font-medium mb-2 ${partnerTypeMissing ? "text-red-600" : "text-gray-700"}`}
          >
            Partner Type *
          </label>
          <select
            value={form.partnerType}
            onChange={(e) => update("partnerType", e.target.value)}
            className={`${inputClass} ${partnerTypeMissing ? "border-red-400" : ""}`}
            disabled={loading}
          >
            <option value="">Select Partner Type</option>
            {PARTNER_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {partnerTypeMissing && (
            <p className="text-xs text-red-600 mt-1">Partner Type is mandatory.</p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col gap-6">
          <h3 className="text-lg font-medium text-gray-900">Address</h3>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2 text-gray-700">Line 1 *</label>
            <input
              type="text"
              value={form.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
              placeholder="Enter Address line 1"
              className={inputClass}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2 text-gray-700">Line 2</label>
            <input
              type="text"
              value={form.addressLine2}
              onChange={(e) => update("addressLine2", e.target.value)}
              placeholder="Enter Address line 2"
              className={inputClass}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-2 text-gray-700">City *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Enter City"
                className={inputClass}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-2 text-gray-700">
                State/Province/Region *
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder="Enter State/Province/Region"
                className={inputClass}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col sm:w-1/2">
            <label className="text-sm font-medium mb-2 text-gray-700">Zipcode *</label>
            <input
              type="text"
              value={form.zipcode}
              onChange={(e) => update("zipcode", e.target.value)}
              placeholder="Enter Zipcode"
              className={inputClass}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 h-12 flex items-center justify-center gap-3 bg-black rounded-full
                      hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-white font-medium">Continue</span>
                <span className="text-white text-xl">→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
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

function ReceivableStep({
  partnerId,
  partnerName,
  onDone,
}: {
  partnerId: string;
  partnerName: string;
  onDone: (receivable: Receivable) => void;
}) {
  const [form, setForm] = useState<ReceivableForm>(emptyReceivableForm);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = <K extends keyof ReceivableForm>(key: K, value: ReceivableForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
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

      onDone(receivable);
    } catch (error: any) {
      setSubmitError(error.message || "Failed to create receivable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepIndicator step={2} />
      <h2 className="text-3xl lg:text-4xl font-light mb-2 text-gray-900">
        Invoice Details
      </h2>
      <p className="text-sm text-gray-600 mb-8">
        Create a receivable for <span className="font-medium text-gray-900">{partnerName}</span>
      </p>

      {submitError && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Type of Transaction *</label>
          <select
            value={form.transactionType}
            onChange={(e) => update("transactionType", e.target.value)}
            className={inputClass}
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

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Invoice Purpose Code *</label>
          <select
            value={form.purposeCode}
            onChange={(e) => update("purposeCode", e.target.value)}
            className={inputClass}
            disabled={loading}
          >
            <option value="">Select...</option>
            {PURPOSE_CODE_OPTIONS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Invoice Number *</label>
          <input
            type="text"
            value={form.invoiceNumber}
            onChange={(e) => update("invoiceNumber", e.target.value)}
            placeholder="Enter the Invoice number"
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Upload Invoice *</label>
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

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">
            Invoice Description <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Enter a short description for this Invoice."
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Invoice Amount *</label>
          <div className="flex items-center gap-3 border-b-2 border-gray-300 focus-within:border-black transition">
            <span className="text-sm font-medium text-gray-500 px-1">USD</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.invoiceAmount}
              onChange={(e) => update("invoiceAmount", e.target.value)}
              placeholder="0.00"
              className="flex-1 px-1 py-2 focus:outline-none focus:ring-0 text-sm lg:text-base bg-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Receivable Amount *</label>
          <div className="flex items-center gap-3 border-b-2 border-gray-300 focus-within:border-black transition">
            <span className="text-sm font-medium text-gray-500 px-1">USD</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amountMaximumReconcilable}
              onChange={(e) => update("amountMaximumReconcilable", e.target.value)}
              placeholder="0.00"
              className="flex-1 px-1 py-2 focus:outline-none focus:ring-0 text-sm lg:text-base bg-transparent"
              disabled={loading}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Maximum amount that can be reconciled on this receivable</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex flex-col w-full sm:w-1/2">
            <label className="text-sm font-medium mb-2 text-gray-700">Invoice Date *</label>
            <input
              type="date"
              value={form.invoiceDate}
              onChange={(e) => update("invoiceDate", e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </div>
          <div className="flex flex-col w-full sm:w-1/2">
            <label className="text-sm font-medium mb-2 text-gray-700">
              Payment Due Date <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 h-12 flex items-center justify-center gap-3 bg-black rounded-full
                      hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-white font-medium">Create Receivable</span>
                <span className="text-white text-xl">→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function ReconcileStep({
  initialReceivableId,
  onDone,
}: {
  initialReceivableId: string;
  onDone: () => void;
}) {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [commonBalance, setCommonBalance] = useState<string>("0.00");
  const [dataLoading, setDataLoading] = useState(true);

  const [receivableId, setReceivableId] = useState(initialReceivableId);
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [receivableTouched, setReceivableTouched] = useState(false);

  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getReceivables(), getBankAccounts(), getBalance()])
      .then(([receivablesList, bankAccountsList, balance]) => {
        setReceivables(receivablesList.filter((r) => r.currency === "USD"));
        const payoutAccounts = bankAccountsList.filter((a) => a.category === "user_payout");
        setBankAccounts(payoutAccounts);
        if (payoutAccounts.length === 1) {
          setBankAccountId(payoutAccounts[0]._id);
        }
        const pendingUsd = balance.pending.find((b) => b.currency === "USD");
        setCommonBalance(pendingUsd?.amount || "0.00");
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
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

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setReceivableTouched(true);
    setSubmitError(null);

    if (!receivableId || !amount.trim() || Number(amount) <= 0 || !bankAccountId) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      await submitReconciliation({ receivableId, amount: amount.trim(), bankAccountId });
      onDone();
    } catch (error: any) {
      setSubmitError(error.message || "Failed to reconcile");
    } finally {
      setLoading(false);
    }
  };

  const receivableMissing = receivableTouched && !receivableId;
  const selectedReceivable = receivables.find((r) => r._id === receivableId);

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <StepIndicator step={3} />
      <h2 className="text-3xl lg:text-4xl font-light mb-8 text-gray-900">Reconcile</h2>

      {submitError && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {/* 1. Receivable */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">1. Receivable</h3>
          <p className="text-sm text-gray-600 mb-3">Select a receivable to reconcile</p>
          {receivableMissing && (
            <p className="text-sm font-medium text-red-600 mb-2">Select USD receivable</p>
          )}
          <select
            value={receivableId}
            onChange={(e) => setReceivableId(e.target.value)}
            className={`${inputClass} ${receivableMissing ? "border-red-400" : ""}`}
          >
            <option value="">Select or Upload an receivable</option>
            {receivables.map((r) => (
              <option key={r._id} value={r._id}>
                {r.invoice.referenceNumber || r._id} - {r.currency} {r.amountMaximumReconcilable}
              </option>
            ))}
          </select>
          {receivableMissing && <p className="text-sm text-red-600 mt-2">Invoice is required</p>}
        </div>

        <div className="border-t border-gray-100" />

        {/* 2. Amount */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">2. Amount</h3>
          <p className="text-sm text-gray-600 mb-3">Enter the amount to reconcile</p>

          <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 mb-4">
            <span className="text-sm text-gray-700">Common Balance</span>
            <span className="text-sm font-semibold text-gray-900">USD {commonBalance}</span>
          </div>

          <label className="text-sm font-medium mb-2 text-gray-700 block">
            Enter the amount to reconcile
          </label>
          <div className="flex items-center gap-3 border-b-2 border-gray-300 focus-within:border-black transition">
            <span className="text-sm font-medium text-gray-500 px-1">USD</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-1 py-2 focus:outline-none focus:ring-0 text-sm lg:text-base bg-transparent"
              disabled={loading}
            />
          </div>
          {selectedReceivable && (
            <p className="text-xs text-gray-400 mt-1">
              Maximum reconcilable on this receivable: USD {selectedReceivable.amountMaximumReconcilable}
            </p>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* 3. Bank Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">3. Bank Information</h3>
          <p className="text-sm text-gray-600 mb-3">Select the bank where you want to receive the funds</p>
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            className={inputClass}
            disabled={loading}
          >
            <option value="">Select a bank account</option>
            {bankAccounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.currency} - AC: **** {a.bankAccount?.number?.slice(-4) || a.bankAccount?.last4 || "----"}
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

        {/* 4. Payout Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Payout Information</h3>

          {previewLoading && (
            <div className="border border-gray-200 rounded-xl p-5 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Fetching payout preview...</span>
            </div>
          )}

          {!previewLoading && previewError && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 text-sm text-amber-700">
              {previewError}
            </div>
          )}

          {!previewLoading && !previewError && preview && (
            <div className="border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
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
            <div className="border border-dashed border-gray-200 rounded-xl p-5 text-sm text-gray-400">
              Select a receivable, amount, and bank account to preview payout timing.
            </div>
          )}
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 h-12 flex items-center justify-center gap-3 bg-black rounded-full
                      hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-white font-medium">Reconcile</span>
                <span className="text-white text-xl">→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default function ReconcilePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("");
  const [receivableId, setReceivableId] = useState<string | null>(null);

  return (
    <div className="min-h-screen w-screen bg-gray-100 flex justify-center py-16 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm p-6 lg:p-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-gray-500 hover:text-black mb-6"
        >
          ← Back to dashboard
        </button>

        {step === 1 && (
          <PartnerStep
            onDone={(id, name) => {
              setPartnerId(id);
              setPartnerName(name);
              setStep(2);
            }}
          />
        )}
        {step === 2 && partnerId && (
          <ReceivableStep
            partnerId={partnerId}
            partnerName={partnerName}
            onDone={(receivable) => {
              setReceivableId(receivable._id);
              setStep(3);
            }}
          />
        )}
        {step === 3 && receivableId && (
          <ReconcileStep
            initialReceivableId={receivableId}
            onDone={() => {
              alert("Reconciled successfully");
              navigate("/dashboard");
            }}
          />
        )}
      </div>
    </div>
  );
}
