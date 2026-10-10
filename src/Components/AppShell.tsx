import { useState, type ReactNode } from "react";
import SideBar from "./sideBar";
import KycBanner from "./KycBanner";
import StablecoinBanner from "./StablecoinBanner";
import MobileBottomNav from "./MobileBottomNav";

const SIDEBAR_COLLAPSED_KEY = "payzoll:sidebarCollapsed";

export default function AppShell({ children }: { children: ReactNode }) {
  // Per-viewer convenience only - remember whether the desktop sidebar was
  // left collapsed. Guarded so a blocked/unavailable localStorage (private
  // window, etc.) just falls back to the expanded default.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore - the toggle still works for this session.
      }
      return next;
    });
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col w-screen bg-white md:bg-gray-100">
      <KycBanner />
      <StablecoinBanner />

      <div className="flex flex-1 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 md:py-4 md:pr-4">
        {/* Sidebar nav is desktop-only - mobile uses the bottom tab bar instead. */}
        <div
          className={`hidden md:block md:h-full shrink-0 transition-[width] duration-200 ease-in-out ${
            collapsed ? "md:w-20 px-2" : "md:w-80 px-5"
          }`}
        >
          <SideBar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </div>

        <div className="flex gap-2 w-full min-w-0 p-2 md:p-0">
          <div className="bg-white md:rounded-sm w-full h-full overflow-y-auto">{children}</div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
