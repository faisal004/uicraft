import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type BlueprintBlockProps = {
  /** Mono label drawn on the wireframe, e.g. "TITLE 01". */
  label: string;
  /** When the wireframe starts drawing, in ms after page load. */
  delay: number;
  className?: string;
  children: ReactNode;
};

/**
 * Wraps a piece of landing content. On load a hatched wireframe the exact
 * size of the content draws in, holds, then fades as the content rises.
 * Pure CSS, so the content is in the HTML from the start.
 */
export function BlueprintBlock({ label, delay, className, children }: BlueprintBlockProps) {
  return (
    <div className={cn("relative", className)} style={{ "--bp-delay": `${delay}ms` } as CSSProperties}>
      <div aria-hidden="true" className="bp-mark">
        <span className="bp-label">{label}</span>
      </div>
      <div className="bp-content h-full">{children}</div>
    </div>
  );
}

/** Guide lines and a faint drafting grid that sketch the layout first. */
export function BlueprintGuides() {
  return (
    <div aria-hidden="true" className="bp-guides">
      <div className="bp-paper" />
      <div className="bp-line bp-line-x" />
      <div className="bp-line bp-line-y" />
      <span className="bp-tag left-3 top-[calc(50%+0.5rem)]">ROW 02</span>
      <span className="bp-tag left-[calc(50%+0.75rem)] top-3">COL 02</span>
    </div>
  );
}
