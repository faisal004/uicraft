import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ThanosSnapDemo as CopyPasteDemo } from "@/components/mdx/thanos-snap-demo";

export function ThanosSnapDemo() {
  return (
    <div className="craft-fill relative grid min-h-[26rem] w-full place-items-center text-(--demo-ink)">
      <CopyPasteDemo />
      <Link href="/demo/thanos-snap" target="_blank" rel="noopener noreferrer" className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 text-xs text-(--craft-accent) underline underline-offset-4">Open full page demo <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
    </div>
  );
}
