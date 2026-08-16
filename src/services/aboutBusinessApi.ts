import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface PurposeCodeOption {
  code: string;
  label: string;
}

// Matches AuthService/utils/purposeCodes.js exactly - keep in sync so
// nothing selected here gets rejected by the backend's validation.
export const PURPOSE_CODE_OPTIONS: PurposeCodeOption[] = [
  { code: "P0102", label: "P0102 - Realisation of export bills (goods) sent on collection" },
  { code: "P0103", label: "P0103 - Advance receipts against export contracts" },
  { code: "P0201", label: "P0201 - Surplus freight/passenger fare by Indian shipping companies" },
  { code: "P0301", label: "P0301 - Purchases towards travel" },
  { code: "P0306", label: "P0306 - Other travel receipts" },
  { code: "P0224", label: "P0224 - Postal & courier services by air" },
  { code: "P0801", label: "P0801 - Hardware consultancy/implementation" },
  { code: "P0802", label: "P0802 - Software consultancy/implementation" },
  { code: "P0803", label: "P0803 - Database, data processing charges" },
  { code: "P0804", label: "P0804 - Repair and maintenance of computer and software" },
  { code: "P0806", label: "P0806 - Other information services" },
  { code: "P0807", label: "P0807 - Off site software exports" },
  { code: "P0808", label: "P0808 - Telecommunication services" },
  { code: "P0901", label: "P0901 - Franchises services" },
  { code: "P0902", label: "P0902 - Licensing of produced originals or prototypes" },
  { code: "P1002", label: "P1002 - Commission on exports/imports" },
  { code: "P1003", label: "P1003 - Operational leasing services" },
  { code: "P1004", label: "P1004 - Legal services" },
  { code: "P1005", label: "P1005 - Accounting, auditing, tax consulting services" },
  { code: "P1006", label: "P1006 - Business and management consultancy" },
  { code: "P1007", label: "P1007 - Advertising, trade fair, market research" },
  { code: "P1008", label: "P1008 - Research & development services" },
  { code: "P1009", label: "P1009 - Architectural, engineering, technical services" },
  { code: "P1014", label: "P1014 - Engineering services" },
  { code: "P1016", label: "P1016 - Market research and public opinion polling" },
  { code: "P1017", label: "P1017 - Publishing and printing services" },
  { code: "P1019", label: "P1019 - Commission agent services" },
  { code: "P1020", label: "P1020 - Wholesale and retailing trade services" },
  { code: "P1022", label: "P1022 - Other technical services" },
  { code: "P1101", label: "P1101 - Audio-visual and related services" },
  { code: "P1104", label: "P1104 - Entertainment services" },
  { code: "P1107", label: "P1107 - Educational services" },
  { code: "P1109", label: "P1109 - Other personal, cultural & recreational services" },
  { code: "P1306", label: "P1306 - Receipts / refund of taxes" },
  { code: "P1501", label: "P1501 - Refunds / rebates on account of imports" },
  { code: "P1502", label: "P1502 - Reversal of wrong entries, non-import refunds" },
  { code: "P1701", label: "P1701 - Receipts on account of processing of goods" },
  { code: "S0101", label: "S0101 - Advance payment against imports" },
  { code: "S0102", label: "S0102 - Payment towards imports" },
  { code: "S0802", label: "S0802 - Software consultancy / implementation" },
  { code: "S0803", label: "S0803 - Database, data processing charges" },
  { code: "S1005", label: "S1005 - Accounting, auditing, book-keeping services" },
  { code: "S1009", label: "S1009 - Architectural services" },
  { code: "S1010", label: "S1010 - Agricultural services" },
  { code: "S1013", label: "S1013 - Environmental services" },
  { code: "S1015", label: "S1015 - Tax consulting services" },
  { code: "S1016", label: "S1016 - Market research and public opinion polling" },
  { code: "S1017", label: "S1017 - Publishing and printing services" },
  { code: "S1105", label: "S1105 - Museums, library and archival services" },
  { code: "S1106", label: "S1106 - Recreation and sporting activities services" }
];

export interface AboutBusinessPayload {
  website: string;
  productDescription: string;
  dba: string;
  purposeCode: { code: string }[];
  estimatedMonthlyVolume: string;
  estimatedAnnualRevenue: string;
  // Sole-proprietorship (and other non-individual) accounts only - required
  // by XflowPay for stablecoin_exports_v1, not for "individual".
  businessIndustry?: string;
}

export interface IndustryCodeOption {
  code: string;
  label: string;
}

const ROUTES = API_ROUTES.aboutBusiness;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function submitAboutBusiness(payload: AboutBusinessPayload) {
  const response = await http(ROUTES.submit, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.account;
}

let industryCodesCache: IndustryCodeOption[] | null = null;

/**
 * ~1000 NAICS codes (utils/industryCodes.js on the backend) - fetched once
 * and cached in module scope rather than bundled into the frontend, since
 * it's only ever needed by sole-proprietorship users on this one step.
 */
export async function getIndustryCodes(): Promise<IndustryCodeOption[]> {
  if (industryCodesCache) {
    return industryCodesCache;
  }

  const response = await http(ROUTES.industryCodes, { method: "GET" });
  const data = await response.json();
  assertData(response, data);

  industryCodesCache = data?.data?.industryCodes || [];
  return industryCodesCache;
}
