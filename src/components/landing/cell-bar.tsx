import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The mono header row every landing cell starts with, so all four line up. */
export function CellBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-10 shrink-0 items-center justify-between gap-4 border-b border-foreground/10 bg-(--craft-page) px-5 font-mono text-[10px] uppercase text-foreground/50 sm:px-8 lg:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The mono caption row under a live plate. */
export const plateCaptionClassName =
  "flex items-center justify-between gap-3 border-t border-foreground/10 px-3 py-2 font-mono text-[10px] uppercase text-foreground/55 transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--craft-accent)";
