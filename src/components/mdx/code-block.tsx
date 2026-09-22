"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CodeBlock({
  children,
  className,
  ...props
}: React.ComponentProps<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  async function copyCode() {
    const code = preRef.current?.textContent;

    if (!code) return;

    await navigator.clipboard.writeText(code);
    setCopied(true);

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <pre
        ref={preRef}
        {...props}
        className={cn(
          "overflow-x-auto bg-[#0c0d10] py-5 pr-12 text-sm leading-6 text-[#e6e6e2]",
          className
        )}
      >
        {children}
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={copyCode}
        aria-label={copied ? "Code copied" : "Copy code"}
        title={copied ? "Copied" : "Copy code"}
        className="absolute top-3 right-3 rounded-none border border-white/10 bg-[#17181c]/90 text-zinc-400 shadow-sm backdrop-blur-sm hover:bg-[#222329] hover:text-white focus-visible:border-white/30 focus-visible:ring-white/20"
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Code copied to clipboard" : ""}
      </span>
    </div>
  );
}
