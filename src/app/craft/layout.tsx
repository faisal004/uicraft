import type { CSSProperties, ReactNode } from "react";

import { ExperimentsSidebar } from "@/components/experiments-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getCraftContent } from "@/lib/content";

export default function CraftLayout({ children }: { children: ReactNode }) {
  const crafts = getCraftContent();

  return (
    <SidebarProvider
      className="min-h-dvh bg-[#f2f2ef]"
      style={{ "--sidebar-width": "15rem" } as CSSProperties}
    >
      <ExperimentsSidebar crafts={crafts} />
      <SidebarInset className="bg-[#f7f7f7] text-[#10121b]">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#10121b]/10 px-4 md:hidden">
          <SidebarTrigger aria-label="Open experiments navigation" />
          <span className="font-heading text-sm">UIcraft / Craft</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
