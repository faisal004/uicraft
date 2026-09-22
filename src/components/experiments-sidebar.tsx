"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

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
import { cn } from "@/lib/utils";

export function ExperimentsSidebar({ crafts }: { crafts: ContentEntry[] }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" className="border-[#10121b]/10 bg-[#f2f2ef]">
      <SidebarHeader className="h-12 justify-center border-b border-[#10121b]/10 px-3">
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3155d9]"
        >
          <span className="size-3 rounded-full bg-[#3155d9]" />
          <span className="font-heading text-sm">UIcraft</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="mb-0.5 h-6 px-2 text-[11px] font-medium text-[#10121b]/45">
            Start here
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/craft" />}
                  isActive={pathname === "/craft"}
                  className="h-8 rounded-none px-2 text-[13px] hover:bg-[#3155d9]/8 data-active:bg-[#3155d9]/8 data-active:font-medium data-active:text-[#3155d9]"
                >
                  <span>Introduction</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4 p-0">
          <SidebarGroupLabel className="mb-0.5 h-6 px-2 text-[11px] font-medium text-[#10121b]/45">
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
                        "h-8 rounded-none px-2 text-[13px] hover:bg-[#3155d9]/8 data-active:bg-[#3155d9]/8 data-active:font-medium data-active:text-[#3155d9]",
                        isActive && "text-[#3155d9]",
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
      <SidebarFooter className="border-t border-[#10121b]/10 p-2">
        <Link
          href="/"
          className="flex h-8 items-center justify-between px-2 text-[13px] text-[#10121b]/55 transition-colors duration-150 hover:text-[#3155d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3155d9]"
        >
          Back to landing
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
