"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { plateCaptionClassName } from "@/components/landing/cell-bar";
import { SnapDismiss } from "@/components/landing/snap-dismiss";

// Only the plate that gets picked is downloaded.
const LineLandscapes = dynamic(() => import("@/components/mdx/line-landscapes").then((m) => m.LineLandscapes), {
  ssr: false,
});
const TextToParticles = dynamic(() => import("@/components/mdx/text-to-particles").then((m) => m.TextToParticles), {
  ssr: false,
});

/** How each craft is put to work when it lands in the rotating plate. */
export const ROTATING_DEMOS: Record<string, { use: string; demo: () => ReactNode; fill?: boolean }> = {
  "thanos-snap": { use: "as a dismiss", demo: () => <SnapDismiss /> },
  "line-landscapes": { use: "as a picker", demo: () => <LineLandscapes />, fill: true },
  "text-to-particles": { use: "as an intro", demo: () => <TextToParticles bare text="UICraft" />, fill: true },
};

type Option = { slug: string; title: string; href: string };

const STORAGE_KEY = "uicraft:last-plate";

// One pick per page load, so effects that run twice still agree.
let chosen: Option | null = null;

/** Pick one craft at random, never the same one twice in a row. */
function pick(options: Option[]) {
  if (chosen) return chosen;
  let last: string | null = null;
  try {
    last = sessionStorage.getItem(STORAGE_KEY);
  } catch {}

  const pool = options.length > 1 ? options.filter((option) => option.slug !== last) : options;
  const option = pool[Math.floor(Math.random() * pool.length)];

  try {
    sessionStorage.setItem(STORAGE_KEY, option.slug);
  } catch {}
  chosen = option;
  return option;
}

/**
 * A landing plate that shows a different craft on every page load. The pick
 * happens in the browser: the page is static, so a server pick would never change.
 */
export function RotatingPlate({ options, number }: { options: Option[]; number: number }) {
  const [craft, setCraft] = useState<Option | null>(null);
  useEffect(() => setCraft(pick(options)), [options]);

  const entry = craft ? ROTATING_DEMOS[craft.slug] : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-(--craft-muted-surface)/60 p-4">
        {entry ? (
          entry.fill ? (
            <div className="absolute inset-0 [&>*]:h-full [&>*]:!min-h-0">{entry.demo()}</div>
          ) : (
            entry.demo()
          )
        ) : null}
      </div>
      {craft && entry ? (
        <Link href={craft.href} className={plateCaptionClassName}>
          <span className="truncate">
            {String(number).padStart(2, "0")} · {craft.title}{" "}
            <span className="text-foreground/35">{entry.use}</span>
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 text-(--craft-accent)" aria-hidden="true" />
        </Link>
      ) : (
        // Holds the caption's height so the plate doesn't jump when the pick lands.
        <div className={plateCaptionClassName} aria-hidden="true">&nbsp;</div>
      )}
    </div>
  );
}
