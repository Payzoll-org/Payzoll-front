// EDF (Export Declaration Form) model for service exporters, matching the real
// form (XflowPay's Oct 2026 guide): Section 1 general information, a Section 2B
// multi-invoice services table, and a Section 4 declaration. Pure, client-side;
// the server (Payzoll-back/utils/edfValidation.js) re-checks every rule.

import {
  cleanText,
  cleanDecimal,
  cleanDigits,
  cleanAlnumUpper,
  parseUnits,
  formatMoney,
  formatMinorString,
  displayDate,
  isValidGstin,
  CURRENCIES,
  COUNTRIES,
  LIMITS as INV_LIMITS,
} from "./invoice";
import type { Currency } from "./invoice";

export {
  cleanText,
  cleanDecimal,
  cleanDigits,
  cleanAlnumUpper,
  formatMoney,
  formatMinorString,
  displayDate,
  CURRENCIES,
  COUNTRIES,
};
export type { Currency };

export type TypeOfExport = "service" | "software";
export type ModeOfDelivery = "air" | "land" | "sea" | "post" | "internet" | "other";
export type CategoryOfExporter = "dta" | "sez" | "eou" | "warehouse" | "other";
export type ModeOfRealisation = "lc" | "bg" | "others";
export type EdfStatus = "draft" | "filed" | "recorded" | "closed";
export type RealizationStatus = "outstanding" | "partial" | "realized";

export const TYPE_OF_EXPORT_OPTIONS: { value: TypeOfExport; label: string }[] = [
  { value: "service", label: "Service" },
  { value: "software", label: "Software (as a service)" },
];
export const MODE_OF_DELIVERY_OPTIONS: { value: ModeOfDelivery; label: string }[] = [
  { value: "internet", label: "Internet" },
  { value: "air", label: "Air" },
  { value: "land", label: "Land" },
  { value: "sea", label: "Sea" },
  { value: "post", label: "Post / Courier" },
  { value: "other", label: "Other" },
];
export const CATEGORY_OF_EXPORTER_OPTIONS: { value: CategoryOfExporter; label: string }[] = [
  { value: "dta", label: "DTA (Domestic Tariff Area)" },
  { value: "sez", label: "SEZ" },
  { value: "eou", label: "100% EOU" },
  { value: "warehouse", label: "Warehouse export" },
  { value: "other", label: "Other" },
];
export const MODE_OF_REALISATION_OPTIONS: { value: ModeOfRealisation; label: string }[] = [
  { value: "others", label: "Others (e.g. Payzoll)" },
  { value: "lc", label: "Letter of Credit (L/C)" },
  { value: "bg", label: "Bank Guarantee (BG)" },
];
export const EDF_STATUS_LABEL: Record<EdfStatus, string> = {
  draft: "Draft",
  filed: "Filed",
  recorded: "Recorded in EDPMS",
  closed: "Closed",
};
export const REALIZATION_LABEL: Record<RealizationStatus, string> = {
  outstanding: "Outstanding",
  partial: "Partly realized",
  realized: "Realized",
};

// Common SAC codes for service exporters (datalist suggestions).
export const SAC_SUGGESTIONS: { code: string; label: string }[] = [
  { code: "998314", label: "IT design & development" },
  { code: "998313", label: "IT consulting & support" },
  { code: "998311", label: "Management consulting" },
  { code: "998312", label: "Business consulting / PR" },
  { code: "998361", label: "Advertising services" },
  { code: "998362", label: "Sale of advertising space" },
  { code: "998371", label: "Market research" },
  { code: "998391", label: "Specialty design" },
];

export const MAX_INVOICE_ROWS = 100;

export const LIMITS = {
  ...INV_LIMITS,
  edfNo: 20,
  formNo: 30,
  adCode: 14,
  iec: 10,
  pan: 10,
  adBankName: 150,
  adBankAddress: 200,
  adAccountName: 150,
  exporterName: 100,
  exporterAddress: 200,
  description: 500,
  signatory: 100,
  firaReference: 100,
  rowInvoiceNo: 30,
  rowContractNo: 30,
  rowDescription: 200,
  rowRemarks: 200,
  sacCode: 8,
  recipientName: 150,
  recipientAddress: 200,
};

export type Errors = Record<string, string>;

export interface InvoiceRow {
  id: string; // client-only key
  recipientName: string;
  recipientAddress: string;
  country: string;
  invoiceNo: string;
  invoiceDate: string;
  currency: Currency;
  amount: string;
  netRealisable: string;
  contractNo: string;
  contractDate: string;
  description: string;
  sacCode: string;
  remarks: string;
  realisedAmount: string;
}

export interface EdfForm {
  edfNo: string;
  edfDate: string;
  // Section 1
  typeOfExport: TypeOfExport;
  formNo: string;
  modeOfDelivery: ModeOfDelivery;
  categoryOfExporter: CategoryOfExporter;
  adCode: string;
  iec: string;
  gstin: string;
  pan: string;
  adBankName: string;
  adBankAddress: string;
  adAccountName: string;
  adAccountNumber: string;
  adIfsc: string;
  exporterName: string;
  exporterAddress: string;
  exporterPostal: string;
  exporterEmail: string;
  modeOfRealisation: ModeOfRealisation;
  description: string;
  // Section 2B
  invoices: InvoiceRow[];
  // Section 4
  authorisedSignatory: string;
  realisationCommitmentDate: string;
  declarationDate: string;
  // EDPMS
  firaReference: string;
  remarks: string;
}

export function newRow(): InvoiceRow {
  return {
    id: crypto.randomUUID(),
    recipientName: "",
    recipientAddress: "",
    country: "",
    invoiceNo: "",
    invoiceDate: "",
    currency: "USD",
    amount: "",
    netRealisable: "",
    contractNo: "",
    contractDate: "",
    description: "",
    sacCode: "",
    remarks: "",
    realisedAmount: "",
  };
}

export function emptyEdf(): EdfForm {
  return {
    edfNo: "",
    edfDate: "",
    typeOfExport: "service",
    formNo: "",
    modeOfDelivery: "internet",
    categoryOfExporter: "dta",
    adCode: "",
    iec: "",
    gstin: "",
    pan: "",
    adBankName: "",
    adBankAddress: "",
    adAccountName: "",
    adAccountNumber: "",
    adIfsc: "",
    exporterName: "",
    exporterAddress: "",
    exporterPostal: "",
    exporterEmail: "",
    modeOfRealisation: "others",
    description: "",
    invoices: [newRow()],
    authorisedSignatory: "",
    realisationCommitmentDate: "",
    declarationDate: "",
    firaReference: "",
    remarks: "",
  };
}

// ---- formats (mirror edfValidation.js) ----
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const POSTAL_RE = /^[A-Za-z0-9 -]{3,12}$/;
const DOC_NO_RE = /^[A-Za-z0-9][A-Za-z0-9\-/ ]{0,29}$/;
const IEC_RE = /^[A-Z0-9]{10}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AD_CODE_RE = /^\d{6,14}$/;
const SAC_RE = /^\d{4,8}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NO_RE = /^[A-Za-z0-9-]{4,34}$/;

function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return y >= 2000 && y <= 2100 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const SECTION_OF_FIELD: Record<string, string> = {
  edfDate: "general",
  typeOfExport: "general",
  formNo: "general",
  modeOfDelivery: "general",
  categoryOfExporter: "general",
  modeOfRealisation: "general",
  description: "general",
  exporterName: "exporter",
  exporterAddress: "exporter",
  exporterPostal: "exporter",
  exporterEmail: "exporter",
  iec: "exporter",
  pan: "exporter",
  gstin: "exporter",
  adCode: "adbank",
  adBankName: "adbank",
  adBankAddress: "adbank",
  adAccountName: "adbank",
  adAccountNumber: "adbank",
  adIfsc: "adbank",
  realisationCommitmentDate: "declaration",
  declarationDate: "declaration",
  authorisedSignatory: "declaration",
  firaReference: "declaration",
  remarks: "declaration",
  invoices: "invoices",
};

export function sectionOfError(key: string): string {
  if (key.startsWith("invoices")) return "invoices";
  return SECTION_OF_FIELD[key] ?? "general";
}

function validateRow(r: InvoiceRow, i: number, e: Errors) {
  const key = (f: string) => `invoices.${i}.${f}`;
  if (r.country && !COUNTRIES.some((c) => c.code === r.country)) e[key("country")] = "Unsupported country";
  if (r.invoiceNo && !DOC_NO_RE.test(r.invoiceNo)) e[key("invoiceNo")] = "Letters, numbers, spaces, - or /";
  if (r.contractNo && !DOC_NO_RE.test(r.contractNo)) e[key("contractNo")] = "Letters, numbers, spaces, - or /";
  if (r.invoiceDate && !isRealDate(r.invoiceDate)) e[key("invoiceDate")] = "Invalid date";
  if (r.contractDate && !isRealDate(r.contractDate)) e[key("contractDate")] = "Invalid date";
  if (r.sacCode && !SAC_RE.test(r.sacCode)) e[key("sacCode")] = "4-8 digit SAC";
  if (r.amount && parseUnits(r.amount, 2, 13) === null) e[key("amount")] = "Invalid amount";
  if (r.realisedAmount && parseUnits(r.realisedAmount, 2, 13) === null) e[key("realisedAmount")] = "Invalid amount";
  const amt = parseUnits(r.amount, 2, 13);
  const net = parseUnits(r.netRealisable, 2, 13);
  if (amt !== null && net !== null && net > amt) e[key("netRealisable")] = "Can't exceed the invoice amount";
  // required (strict)
  const need: [string, keyof InvoiceRow][] = [
    ["recipientName", "recipientName"],
    ["country", "country"],
    ["invoiceNo", "invoiceNo"],
    ["invoiceDate", "invoiceDate"],
    ["description", "description"],
    ["sacCode", "sacCode"],
  ];
  for (const [ek, fk] of need) if (!r[fk] && !e[key(ek)]) e[key(ek)] = "Required";
  if ((amt === null || amt <= 0n) && !e[key("amount")]) e[key("amount")] = "Invalid amount";
}

// Full (strict) validation - the "ready to file" rule set.
export function validateEdf(f: EdfForm): Errors {
  const e: Errors = {};
  for (const k of ["edfDate", "realisationCommitmentDate", "declarationDate"] as const) {
    if (f[k] && !isRealDate(f[k])) e[k] = "Invalid date";
  }
  if (f.formNo && !DOC_NO_RE.test(f.formNo)) e.formNo = "Letters, numbers, spaces, - or /";
  if (f.adCode && !AD_CODE_RE.test(f.adCode)) e.adCode = "6-14 digits";
  if (f.adIfsc && !IFSC_RE.test(f.adIfsc)) e.adIfsc = "Invalid IFSC";
  if (f.adAccountNumber && !ACCOUNT_NO_RE.test(f.adAccountNumber)) e.adAccountNumber = "Invalid account number";
  if (f.iec && !IEC_RE.test(f.iec)) e.iec = "IEC is 10 letters/digits";
  if (f.pan && !PAN_RE.test(f.pan)) e.pan = "Invalid PAN";
  if (f.gstin && !isValidGstin(f.gstin)) e.gstin = "Not a valid GSTIN";
  if (f.exporterPostal && !POSTAL_RE.test(f.exporterPostal)) e.exporterPostal = "Invalid postal code";
  if (f.exporterEmail && !EMAIL_RE.test(f.exporterEmail)) e.exporterEmail = "Invalid email address";

  const required: (keyof EdfForm)[] = [
    "edfDate",
    "adCode",
    "iec",
    "pan",
    "exporterName",
    "exporterAddress",
    "realisationCommitmentDate",
  ];
  for (const k of required) if (!f[k] && !e[k]) e[k] = "Required";
  if (f.invoices.length === 0) e.invoices = "Add at least one invoice";
  f.invoices.forEach((r, i) => validateRow(r, i, e));
  return e;
}

export interface CurrencyTotal {
  currency: Currency;
  declaredMinor: bigint;
  realisedMinor: bigint;
  outstandingMinor: bigint;
}
export interface EdfTotals {
  totalsByCurrency: CurrencyTotal[];
  status: RealizationStatus;
}

export function computeEdfTotals(f: EdfForm): EdfTotals {
  const by = new Map<Currency, { declared: bigint; realised: bigint }>();
  for (const r of f.invoices) {
    const amount = parseUnits(r.amount || "0", 2, 13);
    if (amount === null || amount <= 0n) continue;
    const net = parseUnits(r.netRealisable || "", 2, 13);
    const declared = net !== null && net > 0n ? net : amount;
    const realised = parseUnits(r.realisedAmount || "0", 2, 13) ?? 0n;
    const cur = by.get(r.currency) || { declared: 0n, realised: 0n };
    cur.declared += declared;
    cur.realised += realised;
    by.set(r.currency, cur);
  }
  const totalsByCurrency: CurrencyTotal[] = [];
  let anyRealised = false;
  let allRealised = f.invoices.length > 0;
  let hasValue = false;
  for (const [currency, { declared, realised }] of by) {
    const outstanding = declared > realised ? declared - realised : 0n;
    totalsByCurrency.push({ currency, declaredMinor: declared, realisedMinor: realised, outstandingMinor: outstanding });
    if (declared > 0n) hasValue = true;
    if (realised > 0n) anyRealised = true;
    if (!(declared > 0n && realised >= declared)) allRealised = false;
  }
  const status: RealizationStatus = hasValue && allRealised ? "realized" : anyRealised ? "partial" : "outstanding";
  return { totalsByCurrency, status };
}

// "USD 15,000.00 + GBP 2,000.00" style summary from per-currency totals.
export function summariseTotals(totals: CurrencyTotal[], pick: keyof Omit<CurrencyTotal, "currency">): string {
  if (totals.length === 0) return "--";
  return totals.map((t) => `${t.currency} ${formatMoney(t[pick] as bigint, t.currency)}`).join("  +  ");
}
