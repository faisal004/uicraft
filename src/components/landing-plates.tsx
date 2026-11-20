import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { CellBar, plateCaptionClassName } from "@/components/landing/cell-bar";
import { ClawDot } from "@/components/landing/claw-dot";
import { RotatingPlate } from "@/components/landing/rotating-plate";
import type { ContentEntry } from "@/lib/content";

/** Crafts that take turns in the second plate, one per page load. */
const ROTATING_SLUGS = ["thanos-snap", "line-landscapes", "text-to-particles"];

/**
 * Small crafts put to work: each plate uses a craft's technique for
 * something you might ship, and links to the craft that teaches it.
 */
export function LandingPlates({ crafts }: { crafts: ContentEntry[] }) {
  const claw = crafts.find((item) => item.slug === "svg-claw");
  const rotating = ROTATING_SLUGS.flatMap((slug) => {
    const craft = crafts.find((item) => item.slug === slug);
    return craft ? [{ slug, title: craft.title, href: craft.href }] : [];
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CellBar>
        <span>Two crafts, put to work</span>
        <Link
          href="/craft"
          className="shrink-0 text-(--craft-accent) transition-opacity duration-150 hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          All {crafts.length} →
        </Link>
      </CellBar>
      {/* A 1px gap over a tinted background draws every inner border at any column count. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-foreground/10 sm:grid-cols-2">
        {claw ? (
          <div className="min-h-56 bg-(--craft-page) lg:min-h-0">
            <div className="flex h-full min-h-0 flex-col">
              <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-(--craft-muted-surface)/60 p-4">
                <ClawDot />
              </div>
              <Link href={claw.href} className={plateCaptionClassName}>
                <span className="truncate">
                  01 · {claw.title} <span className="text-foreground/35">as a wordmark</span>
                </span>
                <ArrowUpRight className="size-3.5 shrink-0 text-(--craft-accent)" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : null}
        {rotating.length > 0 ? (
          <div className="min-h-56 bg-(--craft-page) lg:min-h-0">
            <RotatingPlate options={rotating} number={claw ? 2 : 1} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
