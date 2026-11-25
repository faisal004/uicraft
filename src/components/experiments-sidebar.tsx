"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, House } from "lucide-react";

import { SpinStar } from "@/components/spin-star";

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
  useSidebar,
} from "@/components/ui/sidebar";
import type { ConceptGroup } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";
import { links } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ExperimentsSidebar({ groups }: { groups: ConceptGroup[] }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };
  const footerAction =
    "flex min-h-16 flex-col items-center justify-center gap-2 border border-foreground/10 bg-(--craft-surface) px-1 text-center text-[11px] font-medium text-foreground/65 transition-colors hover:border-(--craft-accent) hover:text-(--craft-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--craft-accent)";

  return (
    <Sidebar collapsible="offcanvas" className="border-foreground/10 bg-(--craft-sidebar)">
      <SidebarHeader className="h-12 justify-center border-b border-foreground/10 px-3">
        <Link
          href="/"
          onClick={closeMobileSidebar}
          className="group flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--craft-accent)"
        >
          <span className="size-3 rounded-full bg-(--craft-accent)" />
          <span className="font-heading text-sm">UICraft</span>
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
                  onClick={closeMobileSidebar}
                  isActive={pathname === "/craft"}
                  className="h-8 rounded-none px-2 text-[13px] hover:bg-(--craft-accent-soft) data-active:bg-(--craft-accent-soft) data-active:font-medium data-active:text-(--craft-accent)"
                >
                  <span>Introduction</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map((group) => {
          const conceptHref = `/craft/${group.slug}`;
          const isConceptActive = pathname === conceptHref;

          return (
            <SidebarGroup key={group.slug} className="mt-4 p-0">
              <SidebarGroupLabel
                render={<Link href={conceptHref} />}
                onClick={closeMobileSidebar}
                aria-current={isConceptActive ? "page" : undefined}
                className={cn(
                  "mb-0.5 h-6 px-2 text-[11px] font-medium text-foreground/45 hover:text-(--craft-accent)",
                  isConceptActive && "text-(--craft-accent)",
                )}
              >
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.crafts.map((craft, index) => {
                    const isActive = pathname === craft.href;
                    const isHowItWorks = pathname === craft.howItWorksHref;
                    // The write-up link only opens under the craft you're on, so the
                    // list stays one line per craft.
                    const isOpen = Boolean(craft.howItWorksHref) && (isActive || isHowItWorks);

                    return (
                      <SidebarMenuItem key={craft.slug}>
                        <SidebarMenuButton
                          render={<Link href={craft.href} />}
                          onClick={closeMobileSidebar}
                          isActive={isActive}
                          className={cn(
                            "h-8 rounded-none px-2 text-[13px] hover:bg-(--craft-accent-soft) data-active:bg-(--craft-accent-soft) data-active:font-medium data-active:text-(--craft-accent)",
                            isActive && "text-(--craft-accent)",
                            isHowItWorks && "font-medium text-foreground",
                          )}
                        >
                          <span className="w-4 font-mono text-[10px] tabular-nums text-current opacity-40">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span>{craft.title}</span>
                        </SidebarMenuButton>
                        {craft.howItWorksHref ? (
                          <div
                            inert={!isOpen}
                            className={cn(
                              "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                              isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                            )}
                          >
                            <div className="overflow-hidden">
                              <Link
                                href={craft.howItWorksHref}
                                onClick={closeMobileSidebar}
                                aria-current={isHowItWorks ? "page" : undefined}
                                className={cn(
                                  "group/how relative flex h-7 items-center pr-2 pl-8 text-[12px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--craft-accent)",
                                  isHowItWorks
                                    ? "font-medium text-(--craft-accent)"
                                    : "text-foreground/45 hover:text-foreground",
                                )}
                              >
                                {/* A small elbow from the craft's number down into the link. */}
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "absolute top-0 left-[15px] h-1/2 w-2.5 rounded-bl-[5px] border-b border-l transition-colors",
                                    isHowItWorks ? "border-(--craft-accent)/60" : "border-foreground/20",
                                  )}
                                />
                                How it works
                              </Link>
                            </div>
                          </div>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        <SidebarGroup className="mt-4 p-0">
          <SidebarGroupLabel className="mb-0.5 h-6 px-2 text-[11px] font-medium text-foreground/45">
            More from UICraft
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href={links.studio} target="_blank" rel="noreferrer" />}
                  onClick={closeMobileSidebar}
                  className="group/studio h-8 rounded-none px-2 text-[13px] hover:bg-(--craft-accent-soft) hover:text-(--craft-accent)"
                >
                  <span>Studio</span>
                  <span className="text-foreground/45 group-hover/studio:text-current">video templates</span>
                  <ArrowUpRight className="ml-auto size-3.5 opacity-50" aria-hidden="true" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="grid grid-cols-3 gap-2 border-t border-foreground/10 p-2">
        <ThemeToggle className={footerAction} label="Theme" />
        <a
          href={links.repo}
          target="_blank"
          rel="noreferrer"
          aria-label="Star UICraft on GitHub"
          className={cn("star-trigger", footerAction)}
        >
          <SpinStar size={16} />
          <span>Star</span>
        </a>
        <Link href="/" onClick={closeMobileSidebar} className={footerAction}>
          <House className="size-4" aria-hidden="true" />
          <span>Home</span>
        </Link>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
