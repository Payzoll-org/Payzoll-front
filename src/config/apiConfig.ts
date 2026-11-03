export type ApiService = "auth";

// The Payzoll backend origin. Compiled into the bundle at build time
// (Dockerfile sets VITE_AUTH_API_URL=https://api.payzoll.finance); the
// fallback is the local backend, which runs on port 4000 (Payzoll-back .env).
const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL || "http://localhost:4000";

export const API_BASE_MAP: Record<ApiService, string> = {
  auth: AUTH_API_URL,
};

export const API_ROUTES = {
  auth: {
    checkEmail: "/api/auth/check-email",
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
  invoice: {
    list: "/api/invoice",
    create: "/api/invoice",
    detail: (id: string) => `/api/invoice/${id}`,
    activate: (id: string) => `/api/invoice/${id}/activate`,
    nextNumber: "/api/invoice/next-number",
    prefill: "/api/invoice/prefill",
  },
  reconcile: {
    preview: "/api/reconcile/preview",
    submit: "/api/reconcile",
  },
  referral: {
    me: "/api/referral/me",
    // Public shared-link endpoint - only ever opened as a full-page
    // navigation (Pages/ReferralLandingPage.tsx), never fetch()ed.
    link: (code: string) => `/api/ref/${code}`,
  },
};

export function getApiBase(service: ApiService = "auth") {
  return API_BASE_MAP[service];
}

