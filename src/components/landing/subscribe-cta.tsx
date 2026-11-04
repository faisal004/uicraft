"use client";

import { ArrowRight, Check } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Tasteful button, used as a call to action: a gradient body, an inner top
 * highlight, layered shadows, and a one-pixel press. It flips to a
 * confirmation, then resets so the next visitor can try it.
 */
export function SubscribeCta() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setDone(false), 2200);
    return () => window.clearTimeout(id);
  }, [done]);

  return (
    <div className="flex w-full max-w-64 items-center gap-1.5 rounded-xl border border-foreground/10 bg-(--craft-page) p-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.06)]">
      <span className="min-w-0 flex-1 truncate px-2 text-xs text-foreground/40">you@studio.dev</span>
      <button
        type="button"
        onClick={() => setDone(true)}
        aria-live="polite"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-800 bg-linear-to-b from-zinc-700 via-zinc-800 to-zinc-950 px-3 text-xs font-medium text-white shadow-[0_1px_1px_rgb(0_0_0/0.08),0_2px_6px_rgb(0_0_0/0.16),inset_0_1px_0_rgb(255_255_255/0.18)] transition-[filter,transform] duration-150 ease-out hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--craft-accent) active:translate-y-px active:scale-[0.98] dark:border-zinc-300 dark:from-white dark:via-zinc-100 dark:to-zinc-300 dark:text-zinc-900 dark:shadow-[0_1px_1px_rgb(0_0_0/0.3),0_2px_8px_rgb(0_0_0/0.5),inset_0_1px_0_rgb(255_255_255/0.9)]"
      >
        {done ? "You’re in" : "Subscribe"}
        {done ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <ArrowRight className="size-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
