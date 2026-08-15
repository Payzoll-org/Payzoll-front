import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

/**
 * Adds the authenticated user as the owner Person on their XflowPay
 * account, reusing the PAN details already submitted via
 * businessIdentifiersApi - required before activation.
 */
export async function submitOwnerPerson() {
  const response = await http(API_ROUTES.person.owner, {
    method: "POST",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.person;
}

/**
 * Submits ToS acceptance and activates the user's XflowPay account.
 */
export async function activateAccount() {
  const response = await http(API_ROUTES.account.activate, {
    method: "POST",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.account;
}
