import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export interface BusinessIdentifiersPayload {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  panNumber: string;
  nameOnPan: string;
  // Sole-proprietorship only - the frontend sends this only for that
  // onboarding type.
  gstin?: string;
}

const ROUTES = API_ROUTES.businessIdentifiers;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function submitBusinessIdentifiers(payload: BusinessIdentifiersPayload) {
  const response = await http(ROUTES.submit, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.account;
}

export async function uploadPanCard(file: File) {
  const formData = new FormData();
  formData.append("panCard", file);

  const response = await http(ROUTES.pan, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.account;
}

export async function uploadAddressDocument(file: File, documentType: string) {
  const formData = new FormData();
  formData.append("documentType", documentType);
  formData.append("addressDocument", file);

  const response = await http(ROUTES.address, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.account;
}

/**
 * Saved to Cloudinary + our own DB only - never sent to XflowPay.
 */
export async function uploadSourceOfIncome(file: File) {
  const formData = new FormData();
  formData.append("sourceOfIncome", file);

  const response = await http(ROUTES.sourceOfIncome, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.account;
}
