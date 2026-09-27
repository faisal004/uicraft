import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";

import { CraftFrame } from "@/components/mdx/craft-controls";

export function ThanosSnapDemo() {
  return (
    <CraftFrame label="Thanos snap" meta="Full page demo">
      <div className="bg-white p-5 font-[Arial,sans-serif] text-[#202124] sm:p-8">
        <div className="flex max-w-xl items-center gap-3 rounded-full border border-[#dadce0] px-5 py-3 text-sm shadow-[0_1px_4px_#20212412]">
          <span className="flex-1">Thanos Snap</span><Search className="size-4 text-[#4285f4]" aria-hidden="true" />
        </div>
        <div className="mt-8 grid gap-7 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="space-y-6">
            <div><p className="text-xs">marvel.com › characters › thanos</p><p className="mt-1 text-lg text-[#1a0dab]">Thanos | Marvel Characters</p><p className="mt-1 text-xs leading-5 text-[#4d5156]">Meet the Mad Titan and discover the Infinity Stones.</p></div>
            <div><p className="text-xs">en.wikipedia.org › wiki › Thanos</p><p className="mt-1 text-lg text-[#1a0dab]">Thanos - Wikipedia</p><p className="mt-1 text-xs leading-5 text-[#4d5156]">A single snap changed the universe.</p></div>
          </div>
          <div className="hidden border border-[#dadce0] p-4 sm:block"><p className="text-lg">Thanos Snap</p><span className="mt-3 block size-12 bg-contain bg-no-repeat" style={{ backgroundImage: "url('/thanos/thanos_idle.png')" }} aria-hidden="true" /><p className="mt-3 text-xs leading-5 text-[#4d5156]">Click the gauntlet to turn half the results to dust.</p></div>
        </div>
        <Link href="/demo/thanos-snap" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 rounded bg-[#1a73e8] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1557ad]">Open full page demo <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
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
