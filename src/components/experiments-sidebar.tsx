"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, House } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { ContentEntry } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function ExperimentsSidebar({ crafts }: { crafts: ContentEntry[] }) {
  const pathname = usePathname();
  const footerAction =
    "flex min-h-16 flex-col items-center justify-center gap-2 border border-foreground/10 bg-[var(--craft-surface)] px-1 text-center text-[11px] font-medium text-foreground/65 transition-colors hover:border-[var(--craft-accent)] hover:text-[var(--craft-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--craft-accent)]";

  return (
    <Sidebar collapsible="offcanvas" className="border-foreground/10 bg-[var(--craft-sidebar)]">
      <SidebarHeader className="h-12 justify-center border-b border-foreground/10 px-3">
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--craft-accent)]"
        >
          <span className="size-3 rounded-full bg-[var(--craft-accent)]" />
          <span className="font-heading text-sm">UIcraft</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="mb-0.5 h-6 px-2 text-[11px] font-medium text-foreground/45">
            Start here
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/craft" />}
                  isActive={pathname === "/craft"}
                  className="h-8 rounded-none px-2 text-[13px] hover:bg-[var(--craft-accent-soft)] data-active:bg-[var(--craft-accent-soft)] data-active:font-medium data-active:text-[var(--craft-accent)]"
                >
                  <span>Introduction</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4 p-0">
          <SidebarGroupLabel className="mb-0.5 h-6 px-2 text-[11px] font-medium text-foreground/45">
            Experiments
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crafts.map((craft, index) => {
                const href = `/craft/${craft.slug}`;
                const isActive = pathname === href;

                return (
                  <SidebarMenuItem key={craft.slug}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={isActive}
                      className={cn(
                        "h-8 rounded-none px-2 text-[13px] hover:bg-[var(--craft-accent-soft)] data-active:bg-[var(--craft-accent-soft)] data-active:font-medium data-active:text-[var(--craft-accent)]",
                        isActive && "text-[var(--craft-accent)]",
                      )}
                    >
                      <span className="w-4 font-mono text-[10px] tabular-nums text-current opacity-40">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{craft.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="grid grid-cols-3 gap-2 border-t border-foreground/10 p-2">
        <ThemeToggle className={footerAction} label="Theme" />
        <a
          href="https://github.com/faisal004/uicraft"
          target="_blank"
          rel="noreferrer"
          aria-label="Source on GitHub"
          className={footerAction}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          <span>GitHub</span>
        </a>
        <Link href="/" className={footerAction}>
          <House className="size-4" aria-hidden="true" />
          <span>Home</span>
        </Link>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
