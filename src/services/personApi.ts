import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message =
      data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export interface PersonRelationship {
  director: boolean;
  owner: boolean;
  representative: boolean;
}

export interface CompanyPerson {
  id: string;
  xflowPersonId: string;
  fullName: string;
  relationship: PersonRelationship;
  status: string;
}

export interface AddCompanyPersonInput {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  email: string;
  panNumber: string;
  isDirector: boolean;
  isOwner: boolean;
  isRepresentative: boolean;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  country?: string;
  panCard: File;
}

/**
 * Add a director / beneficial owner to a company account. Sent as multipart
 * form data because it carries the person's PAN card file (field "panCard").
 */
export async function addCompanyPerson(input: AddCompanyPersonInput): Promise<CompanyPerson> {
  const fd = new FormData();
  fd.append("fullName", input.fullName);
  fd.append("dateOfBirth", input.dateOfBirth);
  fd.append("email", input.email);
  fd.append("panNumber", input.panNumber);
  fd.append("isDirector", String(input.isDirector));
  fd.append("isOwner", String(input.isOwner));
  fd.append("isRepresentative", String(input.isRepresentative));
  fd.append("addressLine1", input.addressLine1);
  if (input.addressLine2) fd.append("addressLine2", input.addressLine2);
  fd.append("city", input.city);
  fd.append("state", input.state);
  fd.append("zipcode", input.zipcode);
  if (input.country) fd.append("country", input.country);
  fd.append("panCard", input.panCard);

  const response = await http(API_ROUTES.person.company, {
    method: "POST",
    body: fd,
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.person as CompanyPerson;
}

/**
 * List all persons (directors + owners) on the account.
 */
export async function listPersons(): Promise<CompanyPerson[]> {
  const response = await http(API_ROUTES.person.list, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);
  return (data?.data?.persons || []) as CompanyPerson[];
}
