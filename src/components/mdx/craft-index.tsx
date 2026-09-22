import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { previewCrafts } from "@/components/mdx/registry";
import { getCraftContent } from "@/lib/content";

export function CraftIndex() {
  const crafts = getCraftContent();

  return (
    <section className="not-prose pt-16 sm:pt-24">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#10121b]/10 pb-5 sm:mb-10">
        <h2 className="text-balance text-3xl font-medium sm:text-4xl">All experiments</h2>
        <p className="font-mono text-xs tabular-nums text-[#10121b]/40">
          {String(crafts.length).padStart(2, "0")} studies
        </p>
      </div>
      <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
        {crafts.map((craft, index) => {
          const Preview = craft.preview ? previewCrafts[craft.preview] : undefined;

          return (
            <Link
              key={craft.slug}
              href={`/craft/${craft.slug}`}
              className="group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3155d9]"
            >
              <div className="grid aspect-[4/3] place-items-center overflow-hidden border border-[#10121b]/10 bg-[#ededeb] p-6">
                {Preview ? <Preview /> : <span className="font-heading text-sm">Preview</span>}
              </div>
              <div className="pt-5">
                <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase text-[#10121b]/45">
                  <span>{String(index + 1).padStart(2, "0")} / {craft.category}</span>
                  {craft.publishedAt ? (
                    <time dateTime={craft.publishedAt} className="tabular-nums">
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        year: "numeric",
                      }).format(new Date(`${craft.publishedAt}T00:00:00`))}
                    </time>
                  ) : null}
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <h3 className="text-balance text-xl font-medium text-[#10121b]">{craft.title}</h3>
                  <ArrowUpRight
                    className="mt-0.5 size-4 shrink-0 text-[#3155d9]"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-pretty text-sm leading-6 text-[#5d5e62]">
                  {craft.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
