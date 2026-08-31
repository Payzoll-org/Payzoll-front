// components/ProtectedRoute.tsx
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "../Zustand/userStore";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
  // Redirects to /kyc if the user hasn't completed KYC yet. Without this,
  // sideBar.tsx's own requiresKyc click-handler gate (Transaction History,
  // Withdraw/Deposit/Reconcile) was the *only* enforcement - typing
  // /reconcile or /transactionhistory into the address bar directly
  // bypassed it entirely, since the router itself never checked kycVerified.
  requiresKyc?: boolean;
  // Redirects to /dashboard if the account isn't activated with stablecoin
  // payments enabled yet - same gap as above, but for /international-banking,
  // which sideBar.tsx only ever *disabled* rather than gated at the route.
  requiresInternationalBankingReady?: boolean;
}

export default function ProtectedRoute({
  children,
  requiresKyc,
  requiresInternationalBankingReady,
}: ProtectedRouteProps) {
  const { user, hasHydrated } = useAuthStore();
  const navigate = useNavigate();

  const kycBlocked = requiresKyc && !user?.kycVerified;
  const internationalBankingBlocked =
    requiresInternationalBankingReady && !(user?.accountStatus === "activated" && user?.stablecoinEnabled);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    if (!user) {
      navigate("/auth");
      return;
    }
    // user.userType is null until the onboarding form (legal name, type of
    // user, DOB, etc) is actually submitted - AuthPage shows that form
    // itself once it sees a logged-in user with no userType yet, so route
    // there instead of letting a logged-in-but-not-onboarded user reach a
    // protected page (dashboard, settings, ...) directly.
    if (user.userType == null) {
      navigate("/auth");
      return;
    }
    if (kycBlocked) {
      navigate("/kyc");
      return;
    }
    if (internationalBankingBlocked) {
      navigate("/dashboard");
    }
  }, [user, navigate, hasHydrated, kycBlocked, internationalBankingBlocked]);

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 text-lg">Checking session...</p>
      </div>
    );
  }

  if (!user || user.userType == null || kycBlocked || internationalBankingBlocked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 text-lg">Redirecting...</p>
      </div>
    );
  }

  return <>{children}</>;
}