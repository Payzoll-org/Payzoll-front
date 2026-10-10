import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";
import { CURRENCIES, emptyInvoice, newItem, withDisabledMethodsCleared } from "../libs/invoice";
import type { BankMode, Currency, InvoiceForm, StableNetwork, StableToken } from "../libs/invoice";
import type { Partner } from "./partnerApi";

export type InvoiceStatus = "draft" | "active";

export interface InvoiceSummary {
  _id: string;
  status: InvoiceStatus;
  invoiceNo: string;
  date: string;
  currency: Currency;
  toName: string;
  total: string; // minor units
  updatedAt: string;
  activatedAt?: string;
}

export interface InvoiceListResult {
  invoices: InvoiceSummary[];
  total: number;
  page: number;
  limit: number;
  counts: { draft: number; active: number };
}

export interface InvoiceRecord extends Omit<InvoiceForm, "items"> {
  _id: string;
  status: InvoiceStatus;
  items: { name?: string; sacHsn?: string; description: string; qty: string; unitPrice: string }[];
  subtotal: string;
  discount: string;
  tax: string;
  roundOffAmount: string; // signed
  total: string;
  updatedAt: string;
}

// Server-side field errors, keyed like "items.0.qty" - kept on the error so
// the editor can map them onto its own inputs.
export class InvoiceApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const ROUTES = API_ROUTES.invoice;

interface Envelope {
  message?: string;
  errors?: unknown;
  data?: unknown;
}

async function parse<T>(response: Response): Promise<T> {
  let body: Envelope = {};
  try {
    body = await response.json();
  } catch {
    /* non-JSON error body */
  }
  if (!response.ok) {
    const e = body.errors;
    const fieldErrors = e && typeof e === "object" && !Array.isArray(e) ? (e as Record<string, string>) : undefined;
    throw new InvoiceApiError(body.message || "Request failed", response.status, fieldErrors);
  }
  return body.data as T;
}

/** Only what the server accepts - never id/status/totals (it ignores them anyway).
 *  Methods that are switched off are blanked, same as the server stores them. */
function toPayload(form: InvoiceForm) {
  // Bank account is the only payment method now; payment link and UPI are
  // switched off (and so cleared) on every save.
  const { items, ...rest } = withDisabledMethodsCleared({ ...form, linkEnabled: false, upiEnabled: false });
  return {
    ...rest,
    items: items.map(({ name, sacHsn, description, qty, unitPrice }) => ({ name, sacHsn, description, qty, unitPrice })),
  };
}

/** Server record -> editor form (fresh client-side item ids). Anything
 *  missing or of the wrong type falls back to the empty-form default. */
export function recordToForm(r: InvoiceRecord): InvoiceForm {
  const base = emptyInvoice();
  const rec = r as unknown as Record<string, unknown>;
  const str = (k: keyof InvoiceForm) => (typeof rec[k] === "string" ? (rec[k] as string) : (base[k] as string));

  // Invoices saved before payment methods existed have bank fields but no
  // flag - treat "has bank details" as enabled.
  const legacyBank = ["bankHolder", "bankAccount", "bankIfsc"].some((k) => typeof rec[k] === "string" && rec[k]);
  const bankMode: BankMode =
    rec.bankMode === "swift" || rec.bankMode === "ach" || rec.bankMode === "fedwire" ? rec.bankMode : "domestic";
  const stableToken: "" | StableToken = rec.stableToken === "USDC" || rec.stableToken === "USDT" ? rec.stableToken : "";
  const stableNetwork: "" | StableNetwork =
    rec.stableNetwork === "EVM" || rec.stableNetwork === "SOLANA" || rec.stableNetwork === "TRON" || rec.stableNetwork === "STELLAR"
      ? rec.stableNetwork
      : "";

  return {
    logo: str("logo"),
    date: str("date"),
    dueDate: str("dueDate"),
    invoiceNo: str("invoiceNo"),
    poNumber: str("poNumber"),
    currency: CURRENCIES.find((c) => c === r.currency) ?? "INR",
    fromName: str("fromName"),
    fromAddress: str("fromAddress"),
    fromPostal: str("fromPostal"),
    fromPhone: str("fromPhone"),
    fromEmail: str("fromEmail"),
    fromGstin: str("fromGstin"),
    toName: str("toName"),
    toAddress: str("toAddress"),
    toPostal: str("toPostal"),
    toPhone: str("toPhone"),
    toCountry: str("toCountry"),
    toTaxId: str("toTaxId"),
    toEmail: str("toEmail"),
    items: (r.items?.length ? r.items : [newItem()]).map((i) => {
      const name = typeof i.name === "string" ? i.name : "";
      const description = typeof i.description === "string" ? i.description : "";
      return {
        ...newItem(),
        // Invoices saved before item names existed only have a description -
        // it becomes the name so the required field is satisfied.
        name: name || description,
        sacHsn: typeof i.sacHsn === "string" ? i.sacHsn : "",
        description: name ? description : "",
        qty: typeof i.qty === "string" ? i.qty : "",
        unitPrice: typeof i.unitPrice === "string" ? i.unitPrice : "",
      };
    }),
    taxRate: str("taxRate"),
    discountType: rec.discountType === "percent" || rec.discountType === "amount" ? rec.discountType : "",
    discountValue: str("discountValue"),
    roundOff: rec.roundOff === true,
    remarks: str("remarks"),
    clientCountry: str("clientCountry"),
    bankEnabled: typeof rec.bankEnabled === "boolean" ? rec.bankEnabled : legacyBank,
    bankMode,
    bankHolder: str("bankHolder"),
    bankAccount: str("bankAccount"),
    bankIfsc: str("bankIfsc"),
    bankSwift: str("bankSwift"),
    bankRouting: str("bankRouting"),
    bankName: str("bankName"),
    bankAddress: str("bankAddress"),
    stableEnabled: rec.stableEnabled === true,
    stableToken,
    stableNetwork,
    stableAddress: str("stableAddress"),
    linkEnabled: rec.linkEnabled === true,
    paymentLink: str("paymentLink"),
    upiEnabled: rec.upiEnabled === true,
    upiId: str("upiId"),
    signature: str("signature"),
  };
}

export async function listInvoices(params: { status?: InvoiceStatus; page?: number }): Promise<InvoiceListResult> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  const response = await http(`${ROUTES.list}?${qs.toString()}`, { method: "GET" });
  return parse<InvoiceListResult>(response);
}

export async function getInvoice(id: string): Promise<InvoiceRecord> {
  const response = await http(ROUTES.detail(encodeURIComponent(id)), { method: "GET" });
  return (await parse<{ invoice: InvoiceRecord }>(response)).invoice;
}

export async function createDraft(form: InvoiceForm): Promise<InvoiceRecord> {
  const response = await http(ROUTES.create, { method: "POST", body: JSON.stringify(toPayload(form)) });
  return (await parse<{ invoice: InvoiceRecord }>(response)).invoice;
}

export async function updateInvoice(id: string, form: InvoiceForm): Promise<InvoiceRecord> {
  const response = await http(ROUTES.detail(encodeURIComponent(id)), { method: "PUT", body: JSON.stringify(toPayload(form)) });
  return (await parse<{ invoice: InvoiceRecord }>(response)).invoice;
}

export async function activateInvoice(id: string): Promise<InvoiceRecord> {
  const response = await http(ROUTES.activate(encodeURIComponent(id)), { method: "POST" });
  const invoice = (await parse<{ invoice: InvoiceRecord }>(response)).invoice;
  prefillCache = null; // the next invoice number just moved on
  return invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const response = await http(ROUTES.detail(encodeURIComponent(id)), { method: "DELETE" });
  await parse<unknown>(response);
  prefillCache = null;
}

export async function getNextInvoiceNumber(): Promise<string> {
  const response = await http(ROUTES.nextNumber, { method: "GET" });
  return (await parse<{ invoiceNo: string }>(response)).invoiceNo;
}

// What the editor pre-fills, from one server call that only reads our own
// database. Business/bank/email come from the user's KYC data; partners are
// the saved "bill to" contacts; invoiceNo is the number the next invoice gets.
export type PartnerLite = Pick<Partner, "_id" | "legalName" | "nickname" | "email" | "physicalAddress">;

// One of the user's own bank accounts, ready to drop into the invoice's bank fields.
export interface InvoiceBank {
  id: string;
  currency: string;
  mode: BankMode;
  holder: string;
  account: string;
  ifsc: string;
  swift: string;
  routing: string; // ACH / Fedwire routing number
  bankName: string;
}

// One of the user's stablecoin receiving addresses.
export interface InvoiceStable {
  id: string;
  token: StableToken;
  network: StableNetwork;
  address: string;
}

export interface InvoicePrefill {
  from: { name: string; address: string; postal: string; email: string; gstin: string; gstinApplicable: boolean };
  banks: InvoiceBank[];
  stablecoins: InvoiceStable[];
  invoiceNo: string;
  partners: PartnerLite[];
}

// Kept for the lifetime of the page so re-opening the editor is instant; the
// editor still refetches in the background and the cache is dropped whenever
// an invoice is activated/deleted (the next number changes).
let prefillCache: InvoicePrefill | null = null;

export const peekPrefill = () => prefillCache;

export async function getPrefill(): Promise<InvoicePrefill> {
  const response = await http(ROUTES.prefill, { method: "GET" });
  const raw = await parse<Partial<InvoicePrefill>>(response);
  // Lists are always arrays, even if the server is older than this client.
  prefillCache = {
    from: { name: "", address: "", postal: "", email: "", gstin: "", gstinApplicable: false, ...raw.from },
    banks: raw.banks ?? [],
    stablecoins: raw.stablecoins ?? [],
    invoiceNo: raw.invoiceNo ?? "",
    partners: raw.partners ?? [],
  };
  return prefillCache;
}

export function addPartnerToPrefillCache(p: PartnerLite) {
  if (prefillCache) prefillCache = { ...prefillCache, partners: [p, ...prefillCache.partners] };
}
