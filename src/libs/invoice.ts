// Invoice model, input sanitising, validation and money maths for the
// invoice builder (Pages/InvoicePage.tsx). Everything here is pure and
// client-side; the server (Payzoll-back/utils/invoiceValidation.js) re-checks
// every rule, so this is for UX, not a security boundary. The goal is
// (1) nothing a user types can break out of the preview/print output,
// (2) totals are exact, and (3) the document can't be made to look like
// something it isn't (control / bidi-override characters stripped).

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States of America" },
  { code: "GB", name: "United Kingdom" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SG", name: "Singapore" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "OTHER", name: "Other" },
] as const;

export type BankMode = "domestic" | "swift";
export type DiscountType = "" | "percent" | "amount";

export const MAX_ITEMS = 20;

export const LIMITS = {
  name: 100,
  address: 200,
  postal: 12,
  phone: 20,
  email: 254,
  taxId: 20,
  gstin: 15,
  invoiceNo: 20,
  poNumber: 30,
  itemName: 100,
  sacHsn: 8,
  description: 200,
  remarks: 500,
  account: 34,
  ifsc: 11,
  swift: 11,
  bankName: 100,
  bankAddress: 200,
  url: 300,
  upi: 80,
} as const;

// C0/C1 controls (keeping \n and \t handled separately), zero-width chars,
// and Unicode bidi overrides/isolates ("Trojan Source" style spoofing that
// can visually reorder an account number or amount).
// eslint-disable-next-line no-control-regex, no-irregular-whitespace
const DISALLOWED = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/** Sanitise while typing: no trimming, so spaces stay usable mid-edit. */
export function cleanText(value: string, max: number, multiline = false): string {
  let v = value.normalize("NFC").replace(/\r\n?/g, "\n").replace(DISALLOWED, "");
  v = multiline ? v.replace(/\t/g, " ") : v.replace(/[\n\t]/g, " ");
  if (multiline) {
    // At most 4 lines, so a pasted wall of text can't blow up the layout.
    v = v.split("\n").slice(0, 4).join("\n");
  }
  return v.slice(0, max);
}

/** Final normalisation for display: trim each line, drop empty lines. */
export function finalText(value: string): string {
  return value
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// Digits/dot only while typing (decimal fields).
export function cleanDecimal(value: string, maxLen: number): string {
  return value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").slice(0, maxLen);
}

export function cleanDigits(value: string, maxLen: number): string {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

export function cleanAlnumUpper(value: string, maxLen: number): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, maxLen);
}

export interface LineItem {
  id: string;
  name: string;
  sacHsn: string; // optional, 4-8 digits
  description: string; // optional second line under the name
  qty: string;
  unitPrice: string;
}

export interface InvoiceForm {
  logo: string; // data: URL produced by our own canvas re-encode, or ""
  date: string; // yyyy-mm-dd
  dueDate: string; // yyyy-mm-dd, optional
  invoiceNo: string;
  poNumber: string;
  currency: Currency;
  fromName: string;
  fromAddress: string;
  fromPostal: string;
  fromPhone: string;
  fromEmail: string;
  toName: string;
  toAddress: string;
  toPostal: string;
  toPhone: string;
  toCountry: string; // "" or a COUNTRIES code
  toTaxId: string; // GSTIN, India only
  toEmail: string;
  items: LineItem[];
  taxRate: string; // percent, up to 2dp
  discountType: DiscountType; // "" = no discount
  discountValue: string; // percent (<=100, 2dp) or flat amount, per discountType
  roundOff: boolean; // round the final total to a whole unit
  remarks: string;
  // Payment methods (each can be switched off; a disabled method's fields
  // are cleared on save and never shown on the invoice).
  clientCountry: string; // "" or a COUNTRIES code
  bankEnabled: boolean;
  bankMode: BankMode;
  bankHolder: string;
  bankAccount: string; // digits (domestic) or IBAN/account (swift)
  bankIfsc: string;
  bankSwift: string;
  bankName: string;
  bankAddress: string;
  linkEnabled: boolean;
  paymentLink: string;
  upiEnabled: boolean;
  upiId: string;
  signature: string; // data: URL produced by our own canvas re-encode, or ""
}

export function newItem(): LineItem {
  return { id: crypto.randomUUID(), name: "", sacHsn: "", description: "", qty: "", unitPrice: "" };
}

export function emptyInvoice(): InvoiceForm {
  return {
    logo: "",
    date: "",
    dueDate: "",
    invoiceNo: "",
    poNumber: "",
    currency: "INR",
    fromName: "",
    fromAddress: "",
    fromPostal: "",
    fromPhone: "",
    fromEmail: "",
    toName: "",
    toAddress: "",
    toPostal: "",
    toPhone: "",
    toCountry: "",
    toTaxId: "",
    toEmail: "",
    items: [newItem()],
    taxRate: "",
    discountType: "",
    discountValue: "",
    roundOff: false,
    remarks: "",
    clientCountry: "",
    bankEnabled: false,
    bankMode: "domestic",
    bankHolder: "",
    bankAccount: "",
    bankIfsc: "",
    bankSwift: "",
    bankName: "",
    bankAddress: "",
    linkEnabled: false,
    paymentLink: "",
    upiEnabled: false,
    upiId: "",
    signature: "",
  };
}

// ---- Money (exact, BigInt minor units - never floats) ----------------------

/** "12.5" -> 1250n with scale 2. Null if malformed or over maxInt digits. */
export function parseUnits(input: string, scale: number, maxInt: number): bigint | null {
  const s = input.trim();
  const m = /^(\d+)(?:\.(\d*))?$/.exec(s);
  if (!m) return null;
  const [, int, frac = ""] = m;
  if (int.length > maxInt || frac.length > scale) return null;
  return BigInt(int + frac.padEnd(scale, "0"));
}

export interface ComputedItem {
  id: string;
  name: string;
  sacHsn: string;
  description: string;
  qty: string;
  unitPrice: bigint;
  amount: bigint;
}

export interface Totals {
  items: ComputedItem[];
  subtotal: bigint;
  discountBps: bigint | null; // set when the discount is a percentage
  discount: bigint;
  taxBps: bigint;
  tax: bigint;
  roundOff: bigint; // signed; 0 unless the round-off switch is on
  total: bigint;
}

/**
 * Subtotal -> discount (percent or flat, never more than the subtotal) ->
 * tax on the discounted amount -> optional round-off to a whole unit.
 * Tolerant of unfinished rows so the live preview never throws.
 * Must match Payzoll-back/utils/invoiceValidation.js's computeTotals.
 */
export function computeTotals(form: InvoiceForm): Totals {
  const items: ComputedItem[] = [];
  let subtotal = 0n;
  for (const it of form.items) {
    const price = parseUnits(it.unitPrice, 2, 10);
    const qty = parseUnits(it.qty, 2, 6);
    const shown = {
      id: it.id,
      name: finalText(it.name),
      sacHsn: it.sacHsn.trim(),
      description: finalText(it.description),
    };
    if (price === null || qty === null) {
      if (shown.name || shown.description) items.push({ ...shown, qty: it.qty, unitPrice: 0n, amount: 0n });
      continue;
    }
    const amount = (price * qty + 50n) / 100n; // half-up to the paisa/cent
    subtotal += amount;
    items.push({ ...shown, qty: formatQty(qty), unitPrice: price, amount });
  }

  let discount = 0n;
  let discountBps: bigint | null = null;
  if (form.discountType === "percent") {
    const pct = parseUnits(form.discountValue || "0", 2, 3);
    if (pct !== null && pct <= 10000n) {
      discountBps = pct;
      discount = (subtotal * pct + 5000n) / 10000n;
    }
  } else if (form.discountType === "amount") {
    const amt = parseUnits(form.discountValue || "0", 2, 10);
    if (amt !== null) discount = amt > subtotal ? subtotal : amt;
  }

  const taxable = subtotal - discount;
  const rate = parseUnits(form.taxRate || "0", 2, 3);
  const taxBps = rate !== null && rate <= 10000n ? rate : 0n;
  const tax = (taxable * taxBps + 5000n) / 10000n;
  const beforeRound = taxable + tax;
  const total = form.roundOff ? ((beforeRound + 50n) / 100n) * 100n : beforeRound;
  return { items, subtotal, discountBps, discount, taxBps, tax, roundOff: total - beforeRound, total };
}

/** qty x rate in minor units, or null while either is unfinished/invalid. */
export function lineAmount(qty: string, unitPrice: string): bigint | null {
  const q = parseUnits(qty, 2, 6);
  const p = parseUnits(unitPrice, 2, 10);
  return q === null || p === null ? null : (p * q + 50n) / 100n;
}

function formatQty(hundredths: bigint): string {
  const int = hundredths / 100n;
  const frac = hundredths % 100n;
  if (frac === 0n) return int.toString();
  return `${int}.${frac.toString().padStart(2, "0").replace(/0$/, "")}`;
}

export function formatMoney(units: bigint, currency: Currency): string {
  if (units < 0n) return `-${formatMoney(-units, currency)}`;
  const int = units / 100n;
  const frac = (units % 100n).toString().padStart(2, "0");
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return `${new Intl.NumberFormat(locale).format(int)}.${frac}`;
}

/** Server totals arrive as minor-unit decimal strings ("1770000"). */
export function formatMinorString(units: string, currency: Currency): string {
  return /^-?\d{1,20}$/.test(units) ? formatMoney(BigInt(units), currency) : "-";
}

export function formatTaxRate(bps: bigint): string {
  const int = bps / 100n;
  const frac = (bps % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int.toString();
}

export function displayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

// ---- Validation -------------------------------------------------------------

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
const INVOICE_NO_RE = /^[A-Za-z0-9][A-Za-z0-9\-/]{0,19}$/;
const HSN_RE = /^\d{4,8}$/;
const PO_RE = /^[A-Za-z0-9][A-Za-z0-9\-/ ]{0,29}$/;
/**
 * GSTIN check: 15 characters = 2-digit state code, 10-character PAN, entity
 * number, "Z", and a check character computed from the first 14 (mod-36
 * Luhn-style). This proves the number is well-formed and its checksum
 * matches - it does NOT confirm the GSTIN is registered or active; that
 * needs a lookup on the GST portal.
 * Must match Payzoll-back/utils/invoiceValidation.js's isValidGstin.
 */
const GSTIN_RE = /^(\d{2})[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function isValidGstin(value: string): boolean {
  const g = value.trim().toUpperCase();
  const m = GSTIN_RE.exec(g);
  if (!m) return false;
  const state = Number(m[1]);
  if (!((state >= 1 && state <= 38) || state === 97 || state === 99)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARS.indexOf(g[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36] === g[14];
}

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_RE = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/;
const DOMESTIC_ACCOUNT_RE = /^\d{6,18}$/;
const SWIFT_ACCOUNT_RE = /^[A-Z0-9]{6,34}$/;
const UPI_RE = /^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9]{1,31}$/;

/** https only, no credentials - a payment link is shown as text, never as a
 *  javascript:/data: URL. Returns the normalised URL or null. */
export function parsePaymentLink(value: string): string | null {
  const v = value.trim();
  if (v.length === 0 || v.length > LIMITS.url) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return y >= 2000 && y <= 2100 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export type Errors = Partial<Record<string, string>>;

export function validateInvoice(f: InvoiceForm): Errors {
  const e: Errors = {};

  if (!isRealDate(f.date)) e.date = "Enter a valid date";
  if (f.dueDate) {
    if (!isRealDate(f.dueDate)) e.dueDate = "Enter a valid date";
    else if (isRealDate(f.date) && f.dueDate < f.date) e.dueDate = "Due date is before the invoice date";
  }
  if (!INVOICE_NO_RE.test(f.invoiceNo.trim())) e.invoiceNo = "Letters, numbers, - or / only (max 20)";
  if (f.poNumber && !PO_RE.test(f.poNumber.trim())) e.poNumber = "Letters, numbers, spaces, - or /";

  if (!finalText(f.fromName)) e.fromName = "Required";
  if (!finalText(f.fromAddress)) e.fromAddress = "Required";
  if (f.fromPostal && !/^[A-Za-z0-9 -]{3,12}$/.test(f.fromPostal.trim())) e.fromPostal = "Invalid postal code";
  if (f.fromPhone && !PHONE_RE.test(f.fromPhone.trim())) e.fromPhone = "Invalid phone number";
  if (f.fromEmail && !EMAIL_RE.test(f.fromEmail.trim())) e.fromEmail = "Invalid email address";

  if (!finalText(f.toName)) e.toName = "Required";
  if (!finalText(f.toAddress)) e.toAddress = "Required";
  if (f.toPostal && !/^[A-Za-z0-9 -]{3,12}$/.test(f.toPostal.trim())) e.toPostal = "Invalid postal code";
  if (f.toPhone && !PHONE_RE.test(f.toPhone.trim())) e.toPhone = "Invalid phone number";
  if (f.toCountry && !COUNTRIES.some((c) => c.code === f.toCountry)) e.toCountry = "Pick a country from the list";
  if (f.toTaxId && !isValidGstin(f.toTaxId)) e.toTaxId = "Not a valid GSTIN (check the number)";
  if (f.toEmail && !EMAIL_RE.test(f.toEmail.trim())) e.toEmail = "Invalid email address";

  f.items.forEach((it, i) => {
    if (!finalText(it.name)) e[`item-${i}-name`] = "Required";
    if (it.sacHsn && !HSN_RE.test(it.sacHsn.trim())) e[`item-${i}-sacHsn`] = "4-8 digits";
    const qty = parseUnits(it.qty, 2, 6);
    if (qty === null || qty === 0n) e[`item-${i}-qty`] = "Invalid";
    const price = parseUnits(it.unitPrice, 2, 10);
    if (price === null) e[`item-${i}-unitPrice`] = "Invalid";
  });
  if (f.items.length === 0) e.items = "Add at least one item";

  if (f.taxRate) {
    const r = parseUnits(f.taxRate, 2, 3);
    if (r === null || r > 10000n) e.taxRate = "0 - 100, max 2 decimals";
  }

  if (f.discountType) {
    if (!f.discountValue) {
      e.discountValue = "Required";
    } else {
      const v = parseUnits(f.discountValue, 2, f.discountType === "percent" ? 3 : 10);
      if (v === null || (f.discountType === "percent" && v > 10000n)) {
        e.discountValue = f.discountType === "percent" ? "0 - 100, max 2 decimals" : "Invalid amount";
      } else if (f.discountType === "amount") {
        const subtotal = computeTotals({ ...f, discountType: "" }).subtotal;
        if (v > subtotal) e.discountValue = "Discount is more than the subtotal";
      }
    }
  }

  if (f.clientCountry && !COUNTRIES.some((c) => c.code === f.clientCountry)) e.clientCountry = "Pick a country from the list";

  if (f.bankEnabled) {
    if (!finalText(f.bankHolder)) e.bankHolder = "Required";
    if (f.bankMode === "domestic") {
      if (!DOMESTIC_ACCOUNT_RE.test(f.bankAccount)) e.bankAccount = "6-18 digits";
      if (!IFSC_RE.test(f.bankIfsc.trim())) e.bankIfsc = "Invalid IFSC (e.g. SBIN0001531)";
    } else {
      if (!SWIFT_ACCOUNT_RE.test(f.bankAccount)) e.bankAccount = "6-34 letters/numbers (account or IBAN)";
      if (!SWIFT_RE.test(f.bankSwift.trim())) e.bankSwift = "Invalid SWIFT/BIC (8 or 11 characters)";
    }
  }
  if (f.linkEnabled && !parsePaymentLink(f.paymentLink)) e.paymentLink = "Enter a full https:// link";
  if (f.upiEnabled && !UPI_RE.test(f.upiId.trim())) e.upiId = "Invalid UPI ID (e.g. name@bank)";

  return e;
}

/** Which accordion section each error key belongs to, so a failed save can
 *  open the sections that need attention. */
export function sectionOfError(key: string): string {
  if (["date", "dueDate", "invoiceNo", "poNumber"].includes(key)) return "details";
  if (key.startsWith("from") || key === "logo") return "from";
  if (key.startsWith("to")) return "to";
  if (key.startsWith("item") || key === "taxRate" || key.startsWith("discount")) return "items";
  if (key.startsWith("bank") || ["clientCountry", "paymentLink", "upiId"].includes(key)) return "payment";
  return "notes";
}

/** Same shape the server stores: methods that are switched off are blanked. */
export function withDisabledMethodsCleared(f: InvoiceForm): InvoiceForm {
  const next = { ...f };
  if (!f.bankEnabled) {
    next.bankHolder = next.bankAccount = next.bankIfsc = next.bankSwift = next.bankName = next.bankAddress = "";
  } else if (f.bankMode === "domestic") {
    next.bankSwift = "";
  } else {
    next.bankIfsc = "";
  }
  if (!f.discountType) next.discountValue = "";
  // GSTIN only applies to Indian clients.
  if (f.toCountry && f.toCountry !== "IN") next.toTaxId = "";
  if (!f.linkEnabled) next.paymentLink = "";
  if (!f.upiEnabled) next.upiId = "";
  return next;
}

// ---- Images (logo / signature) ---------------------------------------------

export const IMAGE_MAX_BYTES = 512 * 1024;
const IMAGE_MAX_PIXELS = 4000; // per side, before downscale
// Server rejects anything longer (Payzoll-back/utils/invoiceValidation.js).
export const SIGNATURE_MAX_CHARS = 75000;
export const LOGO_MAX_CHARS = 100000;

const SIGNATURE_OUT = { w: 360, h: 140 };
const LOGO_OUT = { w: 320, h: 128 };

function sniff(bytes: Uint8Array): boolean {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b);
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return png || jpg;
}

/**
 * Accepts only real PNG/JPEG (magic bytes, not the client-supplied MIME or
 * extension - SVG and anything scriptable is rejected outright), then
 * re-encodes through a canvas. The re-encode drops metadata and any
 * appended/polyglot payload, so what reaches the page is a fresh PNG we made.
 * Shrinks until the result fits the size the server will accept.
 */
async function processImage(
  file: File,
  out: { w: number; h: number },
  maxChars: number,
  tooDetailed: string
): Promise<string> {
  if (file.size === 0 || file.size > IMAGE_MAX_BYTES) throw new Error("Image must be under 512 KB");
  const buf = await file.arrayBuffer();
  if (!sniff(new Uint8Array(buf.slice(0, 8)))) throw new Error("Only PNG or JPEG images are allowed");

  const bitmap = await createImageBitmap(new Blob([buf])).catch(() => {
    throw new Error("That image could not be read");
  });
  try {
    if (bitmap.width > IMAGE_MAX_PIXELS || bitmap.height > IMAGE_MAX_PIXELS) {
      throw new Error("Image dimensions are too large");
    }
    for (const shrink of [1, 0.75, 0.5, 0.35]) {
      const scale = Math.min(out.w / bitmap.width, out.h / bitmap.height, 1) * shrink;
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("That image could not be read");
      ctx.drawImage(bitmap, 0, 0, w, h);
      const url = canvas.toDataURL("image/png");
      if (url.length <= maxChars) return url;
    }
    throw new Error(tooDetailed);
  } finally {
    bitmap.close();
  }
}

export const processSignature = (file: File) =>
  processImage(file, SIGNATURE_OUT, SIGNATURE_MAX_CHARS, "Signature is too detailed - use a simpler image");
export const processLogo = (file: File) =>
  processImage(file, LOGO_OUT, LOGO_MAX_CHARS, "Logo is too detailed - use a simpler image");

const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

/** Only ever render an image that is a PNG data URL (our own output). */
export function safeImageSrc(src: string, maxChars: number): string | null {
  return src.length <= maxChars && PNG_DATA_URL.test(src) ? src : null;
}
export const safeSignatureSrc = (src: string) => safeImageSrc(src, SIGNATURE_MAX_CHARS);
export const safeLogoSrc = (src: string) => safeImageSrc(src, LOGO_MAX_CHARS);
