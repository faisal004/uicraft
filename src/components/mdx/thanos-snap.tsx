import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { CraftFrame } from "@/components/mdx/craft-controls";
import { ThanosSnapDemo as CopyPasteDemo } from "@/components/mdx/thanos-snap-demo";

export function ThanosSnapDemo() {
  return (
    <CraftFrame label="Thanos snap" meta="Canvas masks + DOM copies">
      <CopyPasteDemo />
      <div className="border-t border-(--demo-border) p-4">
        <Link href="/demo/thanos-snap" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-(--craft-accent) underline underline-offset-4">Open full page demo <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
      </div>
    </CraftFrame>
  );
}
