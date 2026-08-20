import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

export type SupportCategory = "technical" | "payment" | "general";

export interface SupportTicketAttachment {
  url: string | null;
  publicId: string;
  resourceType: string;
  format: string;
  mimetype: string;
  uploadedAt: string;
}

export interface SupportTicket {
  _id: string;
  category: SupportCategory;
  subject: string;
  description: string;
  attachment?: SupportTicketAttachment;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
}

export interface CreateSupportTicketPayload {
  category: SupportCategory;
  subject: string;
  description: string;
  attachment?: File;
}

const ROUTES = API_ROUTES.support;

function assertData(response: Response, data: any) {
  if (!response.ok) {
    const message = data?.errors?.join(", ") || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
}

export async function createSupportTicket(payload: CreateSupportTicketPayload): Promise<SupportTicket> {
  const formData = new FormData();
  formData.append("category", payload.category);
  formData.append("subject", payload.subject);
  formData.append("description", payload.description);
  if (payload.attachment) {
    formData.append("attachment", payload.attachment);
  }

  const response = await http(ROUTES.create, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.ticket;
}

export async function getSupportTickets(): Promise<SupportTicket[]> {
  const response = await http(ROUTES.list, {
    method: "GET",
  });

  const data = await response.json();
  assertData(response, data);
  return data?.data?.tickets || [];
}
