export type ApiService = "auth" | "agentManagement" | "agentChat" | "gateway";

const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL || "http://localhost:3000/s1/platform";
const AGENT_MANAGEMENT_API_URL =
  import.meta.env.VITE_AGENT_MANAGEMENT_API_URL || "http://localhost:3000/s2/agents";
const AGENT_CHAT_API_URL =
  import.meta.env.VITE_AGENT_CHAT_API_URL || "http://localhost:3000/s3/agentchat";
const GATEWAY_API_URL =
  import.meta.env.VITE_GATEWAY_API_URL || "http://localhost:3000";

export const API_BASE_MAP: Record<ApiService, string> = {
  auth: AUTH_API_URL,
  agentManagement: AGENT_MANAGEMENT_API_URL,
  agentChat: AGENT_CHAT_API_URL,
  gateway: GATEWAY_API_URL,
};

export const API_ROUTES = {
  auth: {
    register: "/api/auth/register",
    verifyOtp: "/api/auth/verify-otp",
    resendOtp: "/api/auth/resend-otp",
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    logoutAll: "/api/auth/logout-all",
    refresh: "/api/auth/refresh",
    me: "/api/auth/me",
    sessions: "/api/auth/sessions",
    revokeSession: (sessionId: string) => `/api/auth/sessions/${sessionId}`,
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
    loginRecoverySend: "/api/auth/login-recovery/send",
    loginRecoveryVerify: "/api/auth/login-recovery/verify",
    twoFactor: "/api/auth/two-factor",
  },
  onboarding: {
    submit: "/api/onboarding",
    get: "/api/onboarding",
    update: "/api/onboarding",
  },
  aboutBusiness: {
    submit: "/api/aboutbusiness",
    industryCodes: "/api/aboutbusiness/industry-codes",
  },
  businessIdentifiers: {
    submit: "/api/business-identifiers",
    pan: "/api/business-identifiers/pan",
    address: "/api/business-identifiers/address",
    sourceOfIncome: "/api/business-identifiers/source-of-income",
  },
  bankAccount: {
    list: "/api/bank-account",
    inr: "/api/bank-account/inr",
    eefc: "/api/bank-account/eefc",
  },
  person: {
    owner: "/api/person/owner",
  },
  account: {
    activate: "/api/account/activate",
    balance: "/api/account/balance",
    kycProgress: "/api/account/kyc-progress",
  },
  stablecoin: {
    start: "/api/stablecoin/start",
    accept: "/api/stablecoin/accept",
  },
  partner: {
    create: "/api/partner",
    list: "/api/partner",
  },
  receivable: {
    create: "/api/receivable",
    list: "/api/receivable",
  },
  transaction: {
    list: "/api/transaction",
  },
  payout: {
    list: "/api/payout",
    detail: (id: string) => `/api/payout/${id}`,
    paymentAdvice: (id: string) => `/api/payout/${id}/payment-advice`,
  },
  deposit: {
    list: "/api/deposit",
  },
  fxRate: {
    live: "/api/fx-rate",
    history: "/api/fx-rate/history",
  },
  feePlan: {
    payoutFee: "/api/fee-plan/payout-fee",
  },
  support: {
    create: "/api/support",
    list: "/api/support",
  },
  reconcile: {
    preview: "/api/reconcile/preview",
    submit: "/api/reconcile",
  },
  agentManagement: {
    agents: "/api/agent",
    agentById: (agentId: string) => `/api/agent/${agentId}`,
    agentsBySession: (sessionId: string) => `/api/agent/session/${sessionId}`,
    agentsByUser: (userId: string) => `/api/agent/createdBy/${userId}`,
    agentsByFolder: (folderId: string) => `/api/agent/folder/${folderId}`,
    createAgent: "/api/agent/create",
    getAgentConfig: (agentId: string) =>
      `/api/agentconfig/get-config/${agentId}`,
    saveAgentConfig: (agentId: string) =>
      `/api/agentconfig/save-config/${agentId}`,
    folders: (sessionId: string) => `/api/folder/${sessionId}`,
    createFolder: "/api/folder/create",
    updateFolder: (folderId: string) => `/api/folder/update/${folderId}`,
    deleteFolder: (folderId: string) => `/api/folder/delete/${folderId}`,
  },
  agentChat: {
    chat: "/chat",
    conversations: "/api/chat/conversations",
    sendMessage: "/api/chat/messages",
  },
  livekit: {
    token: "/api/livekit/token",
    createRoom: "/api/livekit/room/create",
    serverUrl: "/api/livekit/url",
  },
};

export function getApiBase(service: ApiService = "auth") {
  return API_BASE_MAP[service];
}

