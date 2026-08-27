// components/ProtectedRoute.tsx
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "../Zustand/userStore";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, hasHydrated } = useAuthStore();
  const navigate = useNavigate();

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
    }
  }, [user, navigate, hasHydrated]);

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 text-lg">Checking session...</p>
      </div>
    );
  }

  if (!user || user.userType == null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 text-lg">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}