import type { ReactNode } from "react";
import HomeHeader from "../home/HomeHeader";
import { HomeFooter } from "../home/HomeSections";

type SiteLayoutProps = {
  children: ReactNode;
};

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <main className="min-h-screen bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />
      <div className="pt-20">{children}</div>
      <HomeFooter />
    </main>
  );
}