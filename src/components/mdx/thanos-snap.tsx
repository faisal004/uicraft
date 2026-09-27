import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";

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

export function ThanosSnapThumbnail() {
  return (
    <div className="flex h-52 w-full items-center overflow-hidden border border-black/10 bg-white px-6 font-[Arial,sans-serif] text-[#202124]">
      <div className="w-full">
        <div className="flex items-center justify-between rounded-full border border-[#dadce0] px-4 py-2 text-xs">Thanos Snap <Search className="size-3 text-[#4285f4]" aria-hidden="true" /></div>
        <div className="mt-5 text-[10px]">marvel.com › characters › thanos</div>
        <div className="mt-1 text-base text-[#1a0dab]">Thanos | Marvel Characters</div>
        <div className="mt-1 text-[10px] text-[#4d5156]">Meet the Mad Titan and the Infinity Stones.</div>
      </div>
    </div>
  );
}
