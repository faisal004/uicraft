import { ArrowUpRight } from "lucide-react";

import { SpinStar } from "@/components/spin-star";

import { links } from "@/lib/site";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--craft-accent)";

/** End-of-tutorial card: the reader just finished a lesson, so ask for a star or a hello. */
export function SupportCta({ className }: { className?: string }) {
  return (
    <aside
      aria-labelledby="support-cta-title"
      className={cn("mt-20 border border-foreground/10 bg-(--craft-surface) p-6 sm:p-8", className)}
    >
      <p id="support-cta-title" className="font-heading text-lg leading-tight tracking-tight">
        Found this useful?
      </p>
      <p className="mt-2 max-w-xl text-pretty text-sm leading-6 text-(--craft-muted)">
        UICraft is free and open source. A star on GitHub helps more people find it, and if you
        want something like this built, or just want to talk about it, say hi.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={links.repo}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "star-trigger inline-flex min-h-9 items-center gap-2 bg-foreground px-3.5 text-xs font-medium text-(--craft-page) transition-opacity hover:opacity-85",
            focusRing,
          )}
        >
          <SpinStar size={16} />
          Star on GitHub
        </a>
        <a
          href={links.contact}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex min-h-9 items-center gap-2 border border-foreground/15 px-3.5 text-xs font-medium transition-colors hover:bg-(--craft-muted-surface)",
            focusRing,
          )}
        >
          Get in touch
          <ArrowUpRight className="size-4 text-(--craft-accent)" aria-hidden="true" />
        </a>
      </div>
    </aside>
  );
}

/** Two quiet links that sit under the "On this page" rail. */
export function SupportLinks() {
  const link = cn(
    "flex items-center gap-2 text-xs text-foreground/55 transition-colors hover:text-(--craft-accent)",
    focusRing,
  );

  return (
    <div className="mt-8 flex flex-col gap-2.5 border-t border-foreground/10 pt-5">
      <a href={links.repo} target="_blank" rel="noreferrer" className={cn("star-trigger", link)}>
        <SpinStar size={14} />
        Star on GitHub
      </a>
      <a href={links.contact} target="_blank" rel="noreferrer" className={link}>
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
        Get in touch
      </a>
    </div>
  );
}
