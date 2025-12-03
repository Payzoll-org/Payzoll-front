import { http } from "../lib/httpClient";
import { API_ROUTES } from "../config/apiConfig";
import { useAuthStore } from "../Zustand/userStore";

const ROUTES = API_ROUTES.agentManagement;

export const AgentManagementApi = {
  getFolders: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const response = await http(ROUTES.folders(userId), {
      method: "GET",
      service: "agentManagement",
    });
    return response.json();
  },

  getAgentsBySession: async (sessionId: string) => {
    const response = await http(ROUTES.agentsBySession(sessionId), {
      method: "GET",
      service: "agentManagement",
    });
    return response.json();
  },

  getAgentsByUser: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const response = await http(ROUTES.agentsBySession(userId), {
      method: "GET",
      service: "agentManagement",
    });
    return response.json();
  },

  getAgentsByFolder: async (folderId: string) => {
    const response = await http(ROUTES.agentsByFolder(folderId), {
      method: "GET",
      service: "agentManagement",
    });
    return response.json();
  },

  createFolder: async (payload: { name: string; createdBy: string }) => {
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

