"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ path }: { path: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex min-h-9 items-center gap-2 border border-foreground/15 px-3 text-xs font-medium text-foreground transition-colors hover:bg-[var(--craft-muted-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--craft-accent)]"
        aria-label={`Copy link to ${path.split("/").at(-1)?.replaceAll("-", " ")}`}
      >
        {status === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
        {status === "copied" ? "Copied" : status === "error" ? "Copy failed" : "Share"}
      </button>
      <span className="sr-only" role="status">
        {status === "copied" ? "Link copied to clipboard" : status === "error" ? "Unable to copy link" : ""}
      </span>
    </>
  );
}
