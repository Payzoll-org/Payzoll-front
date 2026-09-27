import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";
import { CURRENCIES, emptyInvoice, newItem, withDisabledMethodsCleared } from "../libs/invoice";
import type { BankMode, Currency, InvoiceForm } from "../libs/invoice";

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
  const { items, ...rest } = withDisabledMethodsCleared(form);
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
  const bankMode: BankMode = rec.bankMode === "swift" ? "swift" : "domestic";

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
    bankName: str("bankName"),
    bankAddress: str("bankAddress"),
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
  return (await parse<{ invoice: InvoiceRecord }>(response)).invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const response = await http(ROUTES.detail(encodeURIComponent(id)), { method: "DELETE" });
  await parse<unknown>(response);
}
