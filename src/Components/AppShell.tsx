import type { ReactNode } from "react";
import SideBar from "./sideBar";
import KycBanner from "./KycBanner";
import StablecoinBanner from "./StablecoinBanner";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden flex flex-col w-screen bg-gray-100">
      <KycBanner />
      <StablecoinBanner />
      <div className="flex flex-1 overflow-hidden py-4 pr-4">
        <div className=" w-80 px-5 h-full">
          <SideBar />
        </div>
        <div className="flex gap-2 w-full">
          <div className="bg-white rounded-sm w-full h-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
