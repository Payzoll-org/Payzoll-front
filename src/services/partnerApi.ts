import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface PartnerPayload {
  legalName: string;
  nickname: string;
  country: string;
  email: string;
  partnerType: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
}

export interface Partner {
  _id: string;
  xflowPartnerAccountId: string;
  legalName: string;
  nickname: string;
  email: string;
  partnerType: string;
  status: string;
  createdAt: string;
}

// Matches AuthService/Middleware/validation.Middleware.js's PARTNER_TYPES
// exactly - keep in sync so nothing selected here gets rejected by the
// backend's validation.
export const PARTNER_TYPE_OPTIONS = [
  { value: "company", label: "Company" },
  { value: "individual", label: "Individual" },
  { value: "limited_liability_partnership", label: "Limited Liability Partnership" },
  { value: "partnership", label: "Partnership" },
  { value: "sole_proprietor", label: "Sole Proprietor" },
];

const ROUTES = API_ROUTES.partner;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function createPartner(payload: PartnerPayload) {
  const response = await http(ROUTES.create, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.partner;
}

export async function getPartners(): Promise<Partner[]> {
  const response = await http(ROUTES.list, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.partners || [];
}
