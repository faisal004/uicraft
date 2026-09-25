import type { CSSProperties, ReactNode } from "react";

import { ExperimentsSidebar } from "@/components/experiments-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
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
      className="min-h-dvh bg-(--craft-sidebar)"
      style={{ "--sidebar-width": "15rem" } as CSSProperties}
    >
      <ExperimentsSidebar crafts={crafts} />
      <SidebarInset className="bg-(--craft-page) text-foreground">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-foreground/10 px-4 md:hidden">
          <SidebarTrigger aria-label="Open experiments navigation" />
          <span className="font-heading text-sm">UIcraft / Craft</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
