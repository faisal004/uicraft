import { Search } from "lucide-react";

export function ThanosSnapThumbnail() {
  return (
    <div className="flex h-52 w-full items-center overflow-hidden border border-black/10 bg-white px-6 font-[Arial,sans-serif] text-[#202124]">
      <div className="w-full">
        <div className="flex items-center justify-between rounded-full border border-[#dadce0] px-4 py-2 text-xs">
          Thanos Snap <Search className="size-3 text-[#4285f4]" aria-hidden="true" />
        </div>
        <div className="mt-5 text-[10px]">marvel.com › characters › thanos</div>
        <div className="mt-1 text-base text-[#1a0dab]">Thanos | Marvel Characters</div>
        <div className="mt-1 text-[10px] text-[#4d5156]">Meet the Mad Titan and the Infinity Stones.</div>
      </div>
    </div>
  );
}
