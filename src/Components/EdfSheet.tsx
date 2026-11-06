import {
  CATEGORY_OF_EXPORTER_OPTIONS,
  COUNTRIES,
  MODE_OF_DELIVERY_OPTIONS,
  MODE_OF_REALISATION_OPTIONS,
  REALIZATION_LABEL,
  TYPE_OF_EXPORT_OPTIONS,
  computeEdfTotals,
  displayDate,
  formatMoney,
} from "../libs/edf";
import type { EdfForm } from "../libs/edf";

export const SHEET_WIDTH = 800;
export const SHEET_HEIGHT = 1131;

const NAVY = "#1f3864";
const RULE = "#b7b7b7";
const PALE = "#eef2f8";
const MUTE = "#b5b5b5";

const label: React.CSSProperties = { color: NAVY, fontWeight: 700, fontSize: 10, letterSpacing: 0.3, textTransform: "uppercase" };
const wrap: React.CSSProperties = { overflowWrap: "anywhere", whiteSpace: "pre-line" };
const optLabel = (opts: { value: string; label: string }[], v: string) => opts.find((o) => o.value === v)?.label ?? v;

export default function EdfSheet({ form }: { form: EdfForm }) {
  const t = computeEdfTotals(form);
  const txt = (v: string) => (v ? v.trim() : "");
  const ph = (v: string, placeholder: string) => (txt(v) ? <span>{txt(v)}</span> : <span style={{ color: MUTE }}>{placeholder}</span>);
  const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code;

  const kv = (lbl: string, node: React.ReactNode) => (
    <div style={{ minWidth: 0 }}>
      <div style={label}>{lbl}</div>
      <div style={{ marginTop: 2, fontSize: 12, ...wrap }}>{node}</div>
    </div>
  );

  const th: React.CSSProperties = { ...label, fontSize: 9, padding: "6px 6px", textAlign: "left", borderBottom: `1px solid ${RULE}` };
  const td: React.CSSProperties = { fontSize: 11, padding: "6px 6px", borderBottom: `1px solid #e3e3e3`, verticalAlign: "top", ...wrap };

  const rows = form.invoices.filter(
    (r) => r.recipientName || r.invoiceNo || r.amount || r.description
  );

  return (
    <div
      style={{
        width: SHEET_WIDTH,
        minHeight: SHEET_HEIGHT,
        background: "#fff",
        color: "#222",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 12,
        padding: "36px 48px 44px 48px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <div style={{ color: NAVY, fontWeight: 700, fontSize: 22, letterSpacing: 0.5 }}>EXPORT DECLARATION FORM</div>
          <div style={{ color: "#666", fontSize: 11, marginTop: 2, letterSpacing: 2 }}>SERVICE EXPORTS &middot; FEMA / EDPMS</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={label}>EDF No.</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 1 }}>{txt(form.edfNo) || "---"}</div>
          <div style={{ ...label, marginTop: 8 }}>Date</div>
          <div style={{ marginTop: 1, fontSize: 12 }}>{displayDate(form.edfDate) || "--/--/----"}</div>
        </div>
      </div>
      <div style={{ height: 3, background: NAVY, marginTop: 10 }} />

      {/* Section 1 - General Information */}
      <div style={{ ...label, fontSize: 11, marginTop: 14, marginBottom: 8 }}>Section 1 &middot; General Information</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 18px" }}>
        {kv("Type of export", optLabel(TYPE_OF_EXPORT_OPTIONS, form.typeOfExport))}
        {kv("Mode of delivery", optLabel(MODE_OF_DELIVERY_OPTIONS, form.modeOfDelivery))}
        {kv("Category of exporter", optLabel(CATEGORY_OF_EXPORTER_OPTIONS, form.categoryOfExporter))}
        {kv("AD code", ph(form.adCode, "--"))}
        {kv("IE Code (IEC)", ph(form.iec, "----------"))}
        {kv("PAN", ph(form.pan, "----------"))}
        {kv("GSTIN", txt(form.gstin) || <span style={{ color: MUTE }}>N/A</span>)}
        {kv("Mode of realisation", optLabel(MODE_OF_REALISATION_OPTIONS, form.modeOfRealisation))}
        {kv("Form No.", txt(form.formNo) || <span style={{ color: MUTE }}>N/A (DTA)</span>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px", marginTop: 12 }}>
        <div>
          <div style={label}>Exporter name &amp; address</div>
          <div style={{ marginTop: 2, fontSize: 12, fontWeight: 700, ...wrap }}>
            {txt(form.exporterName) ? txt(form.exporterName) : <span style={{ color: MUTE, fontWeight: 400 }}>Exporter name</span>}
          </div>
          <div style={{ marginTop: 2, fontSize: 12, ...wrap }}>{ph(form.exporterAddress, "Registered address")}</div>
          {txt(form.exporterPostal) && <div style={{ fontSize: 12, marginTop: 1 }}>{txt(form.exporterPostal)}</div>}
          {txt(form.exporterEmail) && <div style={{ fontSize: 12, marginTop: 1, overflowWrap: "anywhere" }}>{txt(form.exporterEmail)}</div>}
        </div>
        <div>
          <div style={label}>AD bank &amp; account</div>
          <div style={{ marginTop: 2, fontSize: 12, fontWeight: 700, ...wrap }}>{ph(form.adBankName, "AD bank name")}</div>
          {txt(form.adAccountName) && <div style={{ fontSize: 12, marginTop: 1, ...wrap }}>{txt(form.adAccountName)}</div>}
          {txt(form.adAccountNumber) && (
            <div style={{ fontSize: 12, marginTop: 1 }}>
              <span style={{ color: "#666" }}>A/c </span>{txt(form.adAccountNumber)}
              {txt(form.adIfsc) && <span style={{ color: "#666" }}>&nbsp;&middot; IFSC </span>}{txt(form.adIfsc)}
            </div>
          )}
          {!txt(form.adAccountNumber) && txt(form.adIfsc) && <div style={{ fontSize: 12, marginTop: 1 }}><span style={{ color: "#666" }}>IFSC </span>{txt(form.adIfsc)}</div>}
          {txt(form.adCode) && <div style={{ fontSize: 12, marginTop: 1 }}><span style={{ color: "#666" }}>AD code </span>{txt(form.adCode)}</div>}
          {txt(form.adBankAddress) && <div style={{ marginTop: 2, fontSize: 12, ...wrap }}>{txt(form.adBankAddress)}</div>}
        </div>
      </div>
      {txt(form.description) && <div style={{ marginTop: 10 }}>{kv("Description of services", txt(form.description))}</div>}

      {/* Section 2B - Services invoice table */}
      <div style={{ ...label, fontSize: 11, marginTop: 16, marginBottom: 6 }}>Section 2B &middot; Services</div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: PALE }}>
            <th style={{ ...th, width: "5%" }}>#</th>
            <th style={{ ...th, width: "26%" }}>Recipient / Country</th>
            <th style={{ ...th, width: "17%" }}>Invoice</th>
            <th style={{ ...th, width: "17%", textAlign: "right" }}>Amount</th>
            <th style={{ ...th, width: "15%", textAlign: "right" }}>Net realisable</th>
            <th style={{ ...th, width: "10%" }}>SAC</th>
            <th style={{ ...th, width: "10%", textAlign: "right" }}>Realised</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td style={{ ...td, color: MUTE }} colSpan={7}>No invoices added yet.</td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.id}>
                <td style={td}>{i + 1}</td>
                <td style={td}>
                  <div style={{ fontWeight: 700 }}>{txt(r.recipientName) || <span style={{ color: MUTE, fontWeight: 400 }}>Recipient</span>}</div>
                  <div style={{ color: "#666", fontSize: 10 }}>{r.country ? countryName(r.country) : ""}</div>
                  {txt(r.description) && <div style={{ color: "#888", fontSize: 10, marginTop: 1 }}>{txt(r.description)}</div>}
                </td>
                <td style={td}>
                  <div>{txt(r.invoiceNo) || "--"}</div>
                  <div style={{ color: "#666", fontSize: 10 }}>{displayDate(r.invoiceDate)}</div>
                </td>
                <td style={{ ...td, textAlign: "right" }}>{r.amount ? `${r.currency} ${r.amount}` : "--"}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.netRealisable ? `${r.currency} ${r.netRealisable}` : r.amount ? `${r.currency} ${r.amount}` : "--"}</td>
                <td style={td}>{txt(r.sacCode) || "--"}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.realisedAmount ? `${r.currency} ${r.realisedAmount}` : "--"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totals per currency */}
      <div style={{ marginTop: 12, border: `1px solid ${RULE}`, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ ...label, padding: "6px 10px", background: PALE }}>Totals</div>
        {t.totalsByCurrency.length === 0 ? (
          <div style={{ padding: "8px 10px", fontSize: 11, color: MUTE }}>--</div>
        ) : (
          t.totalsByCurrency.map((c) => (
            <div key={c.currency} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "8px 10px", borderTop: `1px solid #e3e3e3`, fontSize: 12 }}>
              <div><span style={label}>Declared </span>{c.currency} {formatMoney(c.declaredMinor, c.currency)}</div>
              <div><span style={label}>Realised </span>{c.currency} {formatMoney(c.realisedMinor, c.currency)}</div>
              <div style={{ textAlign: "right" }}><span style={label}>Outstanding </span><b>{c.currency} {formatMoney(c.outstandingMinor, c.currency)}</b></div>
            </div>
          ))
        )}
        <div style={{ padding: "6px 10px", borderTop: `1px solid ${RULE}`, fontSize: 11 }}>
          <span style={label}>Realization status: </span>
          <span style={{ color: t.status === "realized" ? "#2e7d32" : t.status === "partial" ? "#b26a00" : "#9a3412", fontWeight: 700 }}>
            {REALIZATION_LABEL[t.status]}
          </span>
        </div>
      </div>

      {/* Section 4 - Declaration */}
      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <div style={{ ...label, fontSize: 11, marginBottom: 6 }}>Section 4 &middot; Declaration</div>
        <div style={{ fontSize: 10.5, color: "#555", lineHeight: 1.5 }}>
          I/We declare that I/We am/are the Exporter of the services described above, that the particulars given are true, and
          that the export proceeds will be realised and repatriated to India within the period stipulated by RBI.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 14, alignItems: "end" }}>
          {kv("Realisation commitment date", displayDate(form.realisationCommitmentDate) || <span style={{ color: MUTE }}>--</span>)}
          {kv("Date", displayDate(form.declarationDate) || displayDate(form.edfDate) || <span style={{ color: MUTE }}>--</span>)}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, minHeight: 16 }}>{txt(form.authorisedSignatory)}</div>
            <div style={{ borderTop: `1px solid ${RULE}`, marginTop: 4, paddingTop: 4, ...label }}>Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
