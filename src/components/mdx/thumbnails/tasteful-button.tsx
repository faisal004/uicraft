import { ArrowUpRight } from "lucide-react";

export function TastefulButtonThumbnail() {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 px-4 text-sm font-medium text-white shadow-[0_1px_1px_rgb(0_0_0/0.08),0_2px_6px_rgb(0_0_0/0.16),inset_0_1px_0_rgb(255_255_255/0.18)]">
      View project
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </span>
  );
}
