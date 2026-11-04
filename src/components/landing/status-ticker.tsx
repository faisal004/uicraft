import type { CSSProperties } from "react";

/**
 * Dot Matrix Ticker, used as an announcement bar. A still dot mask turns the
 * scrolling text into LEDs, and a stepped scroll makes it jump dot by dot.
 */
export function StatusTicker({ items }: { items: string[] }) {
  const line = items.map((item) => `${item.toUpperCase()}  •  `).join("");

  return (
    <div className="w-full min-w-0 max-w-72 border border-foreground/15 bg-(--craft-page) p-1.5">
      <div className="flex items-center gap-2 border-b border-foreground/10 px-1.5 pb-1.5 font-mono text-[9px] uppercase text-foreground/45">
        <span className="size-1.5 rounded-full bg-(--craft-accent) motion-safe:animate-pulse" aria-hidden="true" />
        Now live
      </div>
      <div role="img" aria-label={items.join(". ")} className="mt-1.5 min-w-0 bg-[#050505] py-2 text-[#91a7ff]">
        <div className="landing-ticker w-full overflow-hidden" style={{ "--ticker-dot": "3px" } as CSSProperties}>
          <div className="landing-ticker__track font-heading flex w-max whitespace-pre text-[26px] leading-none">
            <span>{line}</span>
            <span>{line}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
