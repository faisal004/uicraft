import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { BlueprintBlock } from "@/components/blueprint";
import { BitmapTimer } from "@/components/landing/bitmap-timer";
import { CellBar, plateCaptionClassName } from "@/components/landing/cell-bar";
import { ParticleWordmark } from "@/components/landing/particle-wordmark";
import { SnapDismiss } from "@/components/landing/snap-dismiss";
import { StatusTicker } from "@/components/landing/status-ticker";
import { SubscribeCta } from "@/components/landing/subscribe-cta";
import { WavingBanner } from "@/components/landing/waving-banner";
import type { ContentEntry } from "@/lib/content";

type Plate = { slug: string; use: string; demo: ReactNode };

/**
 * Six crafts put to work: each plate uses a craft's technique for something
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
    { slug: "thanos-snap", use: "as a dismiss", demo: <SnapDismiss /> },
    { slug: "bitmap-device", use: "as a timer", demo: <BitmapTimer /> },
    { slug: "tasteful-button", use: "as a call to action", demo: <SubscribeCta /> },
    { slug: "waving-flag", use: "as a banner", demo: <WavingBanner /> },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CellBar>
        <span>Fig 0.1 · Six crafts, put to work</span>
        <Link
          href="/craft"
          className="shrink-0 text-(--craft-accent) transition-opacity duration-150 hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          All {crafts.length} →
        </Link>
      </CellBar>
      {/* A 1px gap over a tinted background draws every inner border at any column count. */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-px bg-foreground/10 lg:grid-cols-3 lg:grid-rows-2">
        {plates.map((plate, index) => {
          const craft = crafts.find((item) => item.slug === plate.slug);
          if (!craft) return null;

          return (
            <BlueprintBlock
              key={plate.slug}
              label={`PLATE ${String(index + 1).padStart(2, "0")}`}
              delay={900 + index * 90}
              className="min-h-52 bg-(--craft-page) lg:min-h-0"
            >
              <div className="flex h-full min-h-0 flex-col">
                <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-(--craft-muted-surface)/60 p-4">
                  {plate.demo}
                </div>
                <Link href={`/craft/${craft.slug}`} className={plateCaptionClassName}>
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
