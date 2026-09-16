import type { ReactNode } from "react";
import SideBar from "./sideBar";
import KycBanner from "./KycBanner";
import StablecoinBanner from "./StablecoinBanner";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden flex flex-col w-screen bg-white md:bg-gray-100">
      <KycBanner />
      <StablecoinBanner />

      <div className="flex flex-1 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 md:py-4 md:pr-4">
        {/* Sidebar nav is desktop-only - mobile uses the bottom tab bar instead. */}
        <div className="hidden md:block md:w-80 md:h-full px-5">
          <SideBar />
        </div>

        <div className="flex gap-2 w-full min-w-0 p-2 md:p-0">
          <div className="bg-white md:rounded-sm w-full h-full overflow-y-auto">{children}</div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
