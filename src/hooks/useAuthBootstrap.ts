import { useEffect } from "react";
import { useAuthStore } from "../Zustand/userStore";
import { bootstrapSession } from "../services/authApi";

export function useAuthBootstrap() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) {
      void bootstrapSession();
    }
  }, [hasHydrated]);
}

