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
    if (hasHydrated && !user) {
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 text-lg">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}