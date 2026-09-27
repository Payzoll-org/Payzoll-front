import {
  COUNTRIES,
  computeTotals,
  displayDate,
  finalText,
  formatMoney,
  formatTaxRate,
  parsePaymentLink,
  safeLogoSrc,
  safeSignatureSrc,
} from "../libs/invoice";
import type { InvoiceForm } from "../libs/invoice";

export const SHEET_WIDTH = 800;
export const SHEET_HEIGHT = 1131; // A4 ratio

const NAVY = "#1f3864";
const BLUE = "#3c78d8";
const PALE = "#cfe2f3";
const RULE = "#b7b7b7";

const label: React.CSSProperties = { color: NAVY, fontWeight: 700, fontSize: 12, letterSpacing: 0.2 };

// The printed/previewed invoice. Purely presentational: every value is
// rendered as a React text node (auto-escaped) - no dangerouslySetInnerHTML,
// no user-controlled URLs/styles. The payment link is shown as plain text
// (never an href), and the two images (logo, signature) are re-checked
// against safeLogoSrc()/safeSignatureSrc() here as well as when created.
export default function InvoiceSheet({ form }: { form: InvoiceForm }) {
  const t = computeTotals(form);
  const money = (v: bigint) => formatMoney(v, form.currency);
  const logo = safeLogoSrc(form.logo);
  const sig = safeSignatureSrc(form.signature);
  const placeholder = (v: string, ph: string) => finalText(v) || <span style={{ color: "#b5b5b5" }}>{ph}</span>;
  // Business/client names print in bold capitals (display only - the stored
  // value keeps whatever case was typed).
  const nameText = (v: string, ph: string) =>
    finalText(v) ? (
      <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{finalText(v)}</span>
    ) : (
      <span style={{ color: "#b5b5b5" }}>{ph}</span>
    );
  const wrap: React.CSSProperties = { overflowWrap: "anywhere", whiteSpace: "pre-line" };

  const link = form.linkEnabled ? parsePaymentLink(form.paymentLink) : null;
  const upi = form.upiEnabled ? finalText(form.upiId) : "";
  const showBank =
    form.bankEnabled && !!(form.bankHolder || form.bankAccount || form.bankIfsc || form.bankSwift || form.bankName || form.bankAddress);
  const hasPayment = showBank || !!link || !!upi;
  const countryName = COUNTRIES.find((c) => c.code === form.toCountry)?.name ?? "";
  const hasHsn = t.items.some((it) => it.sacHsn);
  const cols = hasHsn ? ["34%", "12%", "8%", "20%", "26%"] : ["42%", "0", "10%", "22%", "26%"];

  const rightRow = (text: string, mt: number) => (
    <div style={{ marginTop: mt, borderBottom: `1px solid ${RULE}`, paddingBottom: 8, textAlign: "center", overflowWrap: "anywhere", ...label }}>
      {text}
    </div>
  );

  return (
    <div
      style={{
        width: SHEET_WIDTH,
        minHeight: SHEET_HEIGHT,
        background: "#fff",
        color: "#222",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 14,
        padding: "24px 56px 40px 56px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Header: logo + seller left, dates + invoice no right */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 32 }}>
        <div style={{ width: 340, lineHeight: 1.45, fontSize: 15 }}>
          {logo && (
            <img
              src={logo}
              alt="Logo"
              style={{ display: "block", maxWidth: 200, maxHeight: 80, objectFit: "contain", marginBottom: 12 }}
            />
          )}
          <div style={{ ...wrap, fontSize: 16 }}>{nameText(form.fromName, "Your name / business")}</div>
          <div style={{ ...wrap, marginTop: 6 }}>{placeholder(form.fromAddress, "Your address")}</div>
          {finalText(form.fromPostal) && <div style={{ marginTop: 6 }}>{finalText(form.fromPostal)}</div>}
          {finalText(form.fromPhone) && <div style={{ marginTop: 6 }}>{finalText(form.fromPhone)}</div>}
          {finalText(form.fromEmail) && <div style={{ marginTop: 6, overflowWrap: "anywhere" }}>{finalText(form.fromEmail)}</div>}
        </div>

        <div style={{ width: 310 }}>
          <div style={{ textAlign: "right", color: NAVY, fontWeight: 700, fontSize: 26, letterSpacing: 1, marginBottom: 24 }}>
            TAX INVOICE
          </div>
          {rightRow(`DATE: ${displayDate(form.date) || "--/--/----"}`, 0)}
          {displayDate(form.dueDate) && rightRow(`DUE DATE: ${displayDate(form.dueDate)}`, 28)}
          {rightRow(`INVOICE NO. ${finalText(form.invoiceNo) || "---"}`, 28)}
          {finalText(form.poNumber) && rightRow(`PO NO. ${finalText(form.poNumber)}`, 28)}
        </div>
      </div>

      {/* Bill to */}
      <div style={{ marginTop: 40, width: 225 }}>
        <div style={{ ...label, borderBottom: `1px solid ${RULE}`, paddingBottom: 6 }}>BILL TO</div>
      </div>
      <div style={{ marginTop: 20, width: 360, lineHeight: 1.45, fontSize: 15 }}>
        <div style={{ ...wrap, fontSize: 16 }}>{nameText(form.toName, "Client name")}</div>
        <div style={{ ...wrap, marginTop: 6 }}>{placeholder(form.toAddress, "Client address")}</div>
        {finalText(form.toPostal) && <div style={{ marginTop: 2 }}>{finalText(form.toPostal)}</div>}
        {countryName && <div style={{ marginTop: 2 }}>{countryName}</div>}
        {finalText(form.toPhone) && <div style={{ marginTop: 2 }}>{finalText(form.toPhone)}</div>}
        {finalText(form.toEmail) && <div style={{ marginTop: 2, overflowWrap: "anywhere" }}>{finalText(form.toEmail)}</div>}
        {finalText(form.toTaxId) && <div style={{ marginTop: 2 }}>GSTIN: {finalText(form.toTaxId)}</div>}
      </div>

      {/* Items */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 48, tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: BLUE, color: "#fff", fontSize: 11, fontWeight: 700 }}>
            <th style={{ padding: "8px 6px", textAlign: "center", width: cols[0] }}>ITEM</th>
            {hasHsn && <th style={{ padding: "8px 6px", textAlign: "center", width: cols[1] }}>SAC/HSN</th>}
            <th style={{ padding: "8px 6px", textAlign: "center", width: cols[2] }}>QTY</th>
            <th style={{ padding: "8px 6px", textAlign: "center", width: cols[3] }}>RATE</th>
            <th style={{ padding: "8px 6px", textAlign: "center", width: cols[4] }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {t.items.length === 0 && (
            <tr>
              <td colSpan={hasHsn ? 5 : 4} style={{ padding: 10, color: "#b5b5b5", border: `1px solid ${RULE}` }}>
                Add an item to see it here
              </td>
            </tr>
          )}
          {t.items.map((it) => (
            <tr key={it.id} style={{ fontSize: 13 }}>
              <td style={{ padding: "6px 6px", border: `1px solid ${RULE}`, verticalAlign: "top", ...wrap }}>
                <div>{it.name}</div>
                {it.description && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{it.description}</div>}
              </td>
              {hasHsn && (
                <td style={{ padding: "6px 6px", border: `1px solid ${RULE}`, textAlign: "center", verticalAlign: "top" }}>{it.sacHsn}</td>
              )}
              <td style={{ padding: "6px 6px", border: `1px solid ${RULE}`, textAlign: "center", verticalAlign: "top" }}>{it.qty}</td>
              <td style={{ padding: "6px 6px", border: `1px solid ${RULE}`, textAlign: "right", verticalAlign: "top" }}>{money(it.unitPrice)}</td>
              <td style={{ padding: "6px 6px", border: `1px solid ${RULE}`, textAlign: "right", verticalAlign: "top" }}>{money(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Remarks */}
      <div style={{ marginTop: 6, fontSize: 12, width: "52%", ...wrap }}>
        Remarks / Payment Instructions: {finalText(form.remarks)}
      </div>

      <div style={{ flex: 1, minHeight: 40 }} />

      {/* Summary */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "46%" }}>
          <Row k="SUBTOTAL" v={money(t.subtotal)} rule />
          {t.discount > 0n && (
            <Row
              k={t.discountBps !== null ? `DISCOUNT (${formatTaxRate(t.discountBps)}%)` : "DISCOUNT"}
              v={`- ${money(t.discount)}`}
              top
            />
          )}
          <Row k={t.taxBps > 0n ? `TOTAL TAX (${formatTaxRate(t.taxBps)}%)` : "TOTAL TAX"} v={money(t.tax)} top />
          {form.roundOff && t.roundOff !== 0n && <Row k="ROUND OFF" v={money(t.roundOff)} top />}
          <div
            style={{
              marginTop: 14,
              background: PALE,
              borderBottom: "1px solid #222",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              gap: 12,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 16, color: "#333" }}>Balance Due</span>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#000", overflowWrap: "anywhere", textAlign: "right" }}>
              {form.currency} : {money(t.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment methods + signature */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 28, gap: 24 }}>
        <div style={{ width: 340, fontSize: 10.5, lineHeight: 1.4, overflowWrap: "anywhere" }}>
          {hasPayment && (
            <>
              <div style={{ fontWeight: 700, textDecoration: "underline", marginBottom: 4 }}>Payment Methods:</div>
              {showBank && (
                <div style={{ marginBottom: 6, fontWeight: 700 }}>
                  <div>{form.bankMode === "swift" ? "International bank transfer (SWIFT)" : "Bank transfer"}</div>
                  {finalText(form.bankHolder) && <div>Name on Bank account: {finalText(form.bankHolder)}</div>}
                  {form.bankAccount && <div>{form.bankMode === "swift" ? "Account No. / IBAN" : "Account No."}: {form.bankAccount}</div>}
                  {form.bankMode === "domestic" && finalText(form.bankIfsc) && <div>IFSC Code: {finalText(form.bankIfsc)}</div>}
                  {form.bankMode === "swift" && finalText(form.bankSwift) && <div>SWIFT / BIC: {finalText(form.bankSwift)}</div>}
                  {finalText(form.bankName) && <div>Bank: {finalText(form.bankName)}</div>}
                  {finalText(form.bankAddress) && <div style={{ whiteSpace: "pre-line" }}>Bank Address: {finalText(form.bankAddress)}</div>}
                </div>
              )}
              {link && (
                <div style={{ marginBottom: 6, fontWeight: 700 }}>
                  <div>Payment link</div>
                  <div>{link}</div>
                </div>
              )}
              {upi && (
                <div style={{ fontWeight: 700 }}>
                  <div>UPI ID: {upi}</div>
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ width: 180, height: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          {sig && <img src={sig} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, rule, top }: { k: string; v: string; rule?: boolean; top?: boolean }) {
  return (
    <div
      style={{
        marginTop: top ? 8 : 0,
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 6,
        borderBottom: rule ? `1px solid ${RULE}` : undefined,
        fontSize: 12,
      }}
    >
      <span style={{ color: NAVY, fontWeight: 700, fontSize: 11 }}>{k}</span>
      <span style={{ overflowWrap: "anywhere", textAlign: "right" }}>{v}</span>
    </div>
  );
}
