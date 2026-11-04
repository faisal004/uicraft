import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { BlueprintBlock } from "@/components/blueprint";
import { BitmapTimer } from "@/components/landing/bitmap-timer";
import { ParticleWordmark } from "@/components/landing/particle-wordmark";
import { StatusTicker } from "@/components/landing/status-ticker";
import { WavingBanner } from "@/components/landing/waving-banner";
import type { ContentEntry } from "@/lib/content";
import { cn } from "@/lib/utils";

type Plate = { slug: string; use: string; demo: ReactNode };

/**
 * Four crafts put to work: each plate uses a craft's technique for something
 * you might ship, and links to the craft that teaches it.
 */
export function LandingPlates({ crafts }: { crafts: ContentEntry[] }) {
  const newest = [...crafts]
    .filter((craft) => craft.publishedAt)
    .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))[0];

  const plates: Plate[] = [
    { slug: "text-to-particles", use: "as a wordmark", demo: <ParticleWordmark /> },
    {
      slug: "dot-matrix-ticker",
      use: "as a status bar",
      demo: (
        <StatusTicker
          items={[`New: ${newest?.title ?? "craft"}`, `${crafts.length} crafts and counting`]}
        />
      ),
    },
    { slug: "bitmap-device", use: "as a timer", demo: <BitmapTimer /> },
    { slug: "waving-flag", use: "as a banner", demo: <WavingBanner /> },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-baseline justify-between gap-4 px-5 py-3 font-mono text-[10px] uppercase text-foreground/50 sm:px-8 lg:px-10">
        <span>Fig 0.1 · Four crafts, put to work</span>
        <Link
          href="/craft"
          className="shrink-0 text-(--craft-accent) transition-opacity duration-150 hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          All {crafts.length} →
        </Link>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 border-t border-foreground/10">
        {plates.map((plate, index) => {
          const craft = crafts.find((item) => item.slug === plate.slug);
          if (!craft) return null;

          return (
            <BlueprintBlock
              key={plate.slug}
              label={`PLATE ${String(index + 1).padStart(2, "0")}`}
              delay={900 + index * 110}
              className={cn(
                "min-h-0 border-foreground/10",
                index % 2 === 0 && "border-r",
                index < 2 && "border-b",
              )}
            >
              <div className="group flex h-full min-h-0 flex-col">
                <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-(--craft-muted-surface)/60 p-4">
                  {plate.demo}
                </div>
                <Link
                  href={`/craft/${craft.slug}`}
                  className="flex items-center justify-between gap-3 border-t border-foreground/10 px-3 py-2 font-mono text-[10px] uppercase text-foreground/55 transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--craft-accent)"
                >
                  <span className="truncate">
                    {String(index + 1).padStart(2, "0")} · {craft.title}{" "}
                    <span className="text-foreground/35">{plate.use}</span>
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-(--craft-accent)" aria-hidden="true" />
                </Link>
              </div>
            </BlueprintBlock>
          );
        })}
      </div>
    </div>
  );
}
