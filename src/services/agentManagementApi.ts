import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";

const ROUTES = API_ROUTES.agentManagement;

export const AgentManagementApi = {
  getFolders: async () => {
    const response = await http(ROUTES.folders, {
      method: "GET",
      service: "agentManagement",
    });
    return response.json();
  },
  createFolder: async (payload: { name: string }) => {
    const response = await http(ROUTES.createFolder, {
      method: "POST",
      service: "agentManagement",
      body: JSON.stringify(payload),
    });
    return response.json();
  },
  updateFolder: async (folderId: string, payload: { name: string }) => {
    const response = await http(ROUTES.updateFolder(folderId), {
      method: "PUT",
      service: "agentManagement",
      body: JSON.stringify(payload),
    });
    return response.json();
  },
  deleteFolder: async (folderId: string) => {
    const response = await http(ROUTES.deleteFolder(folderId), {
      method: "DELETE",
      service: "agentManagement",
    });
    return response.json();
  },
  createAgent: async (payload: Record<string, unknown>) => {
    const response = await http(ROUTES.createAgent, {
      method: "POST",
      service: "agentManagement",
      body: JSON.stringify(payload),
    });
    return response.json();
  },
  getAgentConfig: async (agentId: string) => {
    const response = await http(ROUTES.getAgentConfig(agentId), {
      method: "GET",
      service: "agentManagement",
    });
    return response.json();
  },
  saveAgentConfig: async (
    agentId: string,
    payload: Record<string, unknown>
  ) => {
    const response = await http(ROUTES.saveAgentConfig(agentId), {
      method: "POST",
      service: "agentManagement",
      body: JSON.stringify(payload),
    });
    return response.json();
  },
};

