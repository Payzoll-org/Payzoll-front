import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";
import { CURRENCIES, emptyEdf, newRow } from "../libs/edf";
import type {
  CategoryOfExporter,
  Currency,
  EdfForm,
  EdfStatus,
  InvoiceRow,
  ModeOfDelivery,
  ModeOfRealisation,
  RealizationStatus,
  TypeOfExport,
} from "../libs/edf";
import type { Partner } from "./partnerApi";

export type { EdfStatus } from "../libs/edf";

export interface CurrencyTotalDto {
  currency: Currency;
  declaredMinor: string;
  realisedMinor: string;
  outstandingMinor: string;
}

export interface EdfSummary {
  _id: string;
  status: EdfStatus;
  edfNo: string;
  edfDate: string;
  totalsByCurrency: CurrencyTotalDto[];
  realizationStatus: RealizationStatus;
  invoices: { recipientName: string; currency: Currency }[];
  updatedAt: string;
  filedAt?: string;
}

export interface EdfListResult {
  edfs: EdfSummary[];
  total: number;
  page: number;
  limit: number;
  counts: { draft: number; filed: number; closed: number };
}

export interface EdfRecord extends Omit<EdfForm, "invoices"> {
  _id: string;
  status: EdfStatus;
  invoices: Omit<InvoiceRow, "id">[];
  totalsByCurrency: CurrencyTotalDto[];
  realizationStatus: RealizationStatus;
  filedAt?: string;
  recordedAt?: string;
  closedAt?: string;
  updatedAt: string;
}

export class EdfApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const ROUTES = API_ROUTES.edf;

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
    /* non-JSON */
  }
  if (!response.ok) {
    const e = body.errors;
    const fieldErrors = e && typeof e === "object" && !Array.isArray(e) ? (e as Record<string, string>) : undefined;
    throw new EdfApiError(body.message || "Request failed", response.status, fieldErrors);
  }
  return body.data as T;
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

// Only what the server accepts - never id/status/number/totals (it ignores them).
function toPayload(form: EdfForm) {
  const { edfNo, invoices, ...rest } = form;
  void edfNo;
  return {
    ...rest,
    invoices: invoices.map(({ id, ...row }) => {
      void id;
      return row;
    }),
  };
}

/** Server record -> editor form (fresh client-side row ids). */
export function recordToForm(r: EdfRecord): EdfForm {
  const base = emptyEdf();
  const rec = r as unknown as Record<string, unknown>;
  const s = (k: keyof EdfForm) => str(rec[k], base[k] as string);
  const inEnum = <T extends string>(v: unknown, allowed: readonly T[], fb: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fb;

  const rows = Array.isArray(r.invoices) && r.invoices.length > 0 ? r.invoices : [newRow()];
  return {
    edfNo: s("edfNo"),
    edfDate: s("edfDate"),
    typeOfExport: inEnum<TypeOfExport>(rec.typeOfExport, ["service", "software"], "service"),
    formNo: s("formNo"),
    modeOfDelivery: inEnum<ModeOfDelivery>(rec.modeOfDelivery, ["air", "land", "sea", "post", "internet", "other"], "internet"),
    categoryOfExporter: inEnum<CategoryOfExporter>(rec.categoryOfExporter, ["dta", "sez", "eou", "warehouse", "other"], "dta"),
    adCode: s("adCode"),
    iec: s("iec"),
    gstin: s("gstin"),
    pan: s("pan"),
    adBankName: s("adBankName"),
    adBankAddress: s("adBankAddress"),
    adAccountName: s("adAccountName"),
    adAccountNumber: s("adAccountNumber"),
    adIfsc: s("adIfsc"),
    exporterName: s("exporterName"),
    exporterAddress: s("exporterAddress"),
    exporterPostal: s("exporterPostal"),
    exporterEmail: s("exporterEmail"),
    modeOfRealisation: inEnum<ModeOfRealisation>(rec.modeOfRealisation, ["lc", "bg", "others"], "others"),
    description: s("description"),
    invoices: rows.map((row) => {
      const rr = row as unknown as Record<string, unknown>;
      return {
        ...newRow(),
        recipientName: str(rr.recipientName),
        recipientAddress: str(rr.recipientAddress),
        country: str(rr.country),
        invoiceNo: str(rr.invoiceNo),
        invoiceDate: str(rr.invoiceDate),
        currency: CURRENCIES.find((c) => c === rr.currency) ?? "USD",
        amount: str(rr.amount),
        netRealisable: str(rr.netRealisable),
        contractNo: str(rr.contractNo),
        contractDate: str(rr.contractDate),
        description: str(rr.description),
        sacCode: str(rr.sacCode),
        remarks: str(rr.remarks),
        realisedAmount: str(rr.realisedAmount),
      };
    }),
    authorisedSignatory: s("authorisedSignatory"),
    realisationCommitmentDate: s("realisationCommitmentDate"),
    declarationDate: s("declarationDate"),
    firaReference: s("firaReference"),
    remarks: s("remarks"),
  };
}

export async function listEdfs(params: { status?: "draft" | "filed" | "closed"; page?: number }): Promise<EdfListResult> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  const response = await http(`${ROUTES.list}?${qs.toString()}`, { method: "GET" });
  return parse<EdfListResult>(response);
}

export async function getEdf(id: string): Promise<EdfRecord> {
  const response = await http(ROUTES.detail(encodeURIComponent(id)), { method: "GET" });
  return (await parse<{ edf: EdfRecord }>(response)).edf;
}

export async function createDraft(form: EdfForm): Promise<EdfRecord> {
  const response = await http(ROUTES.create, { method: "POST", body: JSON.stringify(toPayload(form)) });
  return (await parse<{ edf: EdfRecord }>(response)).edf;
}

export async function updateEdf(id: string, form: EdfForm): Promise<EdfRecord> {
  const response = await http(ROUTES.detail(encodeURIComponent(id)), { method: "PUT", body: JSON.stringify(toPayload(form)) });
  return (await parse<{ edf: EdfRecord }>(response)).edf;
}

export async function fileEdf(id: string): Promise<EdfRecord> {
  const response = await http(ROUTES.file(encodeURIComponent(id)), { method: "POST" });
  const edf = (await parse<{ edf: EdfRecord }>(response)).edf;
  prefillCache = null;
  return edf;
}

export async function recordEdf(id: string): Promise<EdfRecord> {
  const response = await http(ROUTES.record(encodeURIComponent(id)), { method: "POST" });
  return (await parse<{ edf: EdfRecord }>(response)).edf;
}

export async function closeEdf(id: string): Promise<EdfRecord> {
  const response = await http(ROUTES.close(encodeURIComponent(id)), { method: "POST" });
  return (await parse<{ edf: EdfRecord }>(response)).edf;
}

export async function deleteEdf(id: string): Promise<void> {
  const response = await http(ROUTES.detail(encodeURIComponent(id)), { method: "DELETE" });
  await parse<unknown>(response);
  prefillCache = null;
}

export type PartnerLite = Pick<Partner, "_id" | "legalName" | "nickname" | "email" | "physicalAddress">;

export interface DomesticBank {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  address: string;
}

export interface EdfPrefill {
  from: { name: string; address: string; postal: string; email: string; gstin: string; gstinApplicable: boolean; pan: string };
  adBankName: string;
  domesticBank: DomesticBank;
  edfNo: string;
  partners: PartnerLite[];
}

let prefillCache: EdfPrefill | null = null;
export const peekPrefill = () => prefillCache;

export async function getPrefill(): Promise<EdfPrefill> {
  const response = await http(ROUTES.prefill, { method: "GET" });
  const raw = await parse<Partial<EdfPrefill>>(response);
  prefillCache = {
    from: { name: "", address: "", postal: "", email: "", gstin: "", gstinApplicable: false, pan: "", ...raw.from },
    adBankName: raw.adBankName ?? "",
    domesticBank: { bankName: "", accountName: "", accountNumber: "", ifsc: "", address: "", ...raw.domesticBank },
    edfNo: raw.edfNo ?? "",
    partners: raw.partners ?? [],
  };
  return prefillCache;
}
