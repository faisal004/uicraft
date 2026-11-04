import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { BlueprintBlock } from "@/components/blueprint";
import { DeferredPreview } from "@/components/mdx/deferred-preview";
import { previewCrafts } from "@/components/mdx/registry";
import type { ContentEntry } from "@/lib/content";
import { cn } from "@/lib/utils";

/** Four live craft previews laid out as a 2×2 set of plates. */
export function LandingPlates({ crafts, total }: { crafts: ContentEntry[]; total: number }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-baseline justify-between gap-4 px-5 py-3 font-mono text-[10px] uppercase text-foreground/50 sm:px-8 lg:px-10">
        <span>Fig 0.1 · Four pieces, rebuilt from scratch</span>
        <Link
          href="/craft"
          className="shrink-0 text-(--craft-accent) transition-opacity duration-150 hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          All {total} →
        </Link>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 border-t border-foreground/10">
        {crafts.map((craft, index) => {
          const Preview = craft.preview ? previewCrafts[craft.preview] : undefined;

          return (
            <BlueprintBlock
              key={craft.slug}
              label={`PLATE ${String(index + 1).padStart(2, "0")}`}
              delay={900 + index * 110}
              className={cn(
                "min-h-0 border-foreground/10",
                index % 2 === 0 && "border-r",
                index < 2 && "border-b",
              )}
            >
              <Link
                href={`/craft/${craft.slug}`}
                className="group flex h-full min-h-0 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--craft-accent)"
              >
                <div className="relative min-h-0 flex-1 overflow-hidden bg-(--craft-muted-surface)/70 transition-colors duration-200 group-hover:bg-(--craft-muted-surface)">
                  <div className="absolute inset-0 grid place-items-center p-3 [&>div]:origin-center [&>div]:scale-[0.82]">
                    {Preview ? (
                      <DeferredPreview>
                        <Preview />
                      </DeferredPreview>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-foreground/10 px-3 py-2 font-mono text-[10px] uppercase text-foreground/55 group-hover:text-foreground">
                  <span className="truncate">
                    {String(index + 1).padStart(2, "0")} · {craft.title}
                  </span>
                  <ArrowUpRight
                    className="size-3.5 shrink-0 text-(--craft-accent) transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </BlueprintBlock>
          );
        })}
      </div>
    </div>
  );
}
