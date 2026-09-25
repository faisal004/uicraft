"use client";

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

export function TastefulButtonDemo() {
  return (
    <div className="grid min-h-72 place-items-center rounded-xl border border-(--demo-border) bg-(--demo-bg) p-8">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 px-4 text-sm font-medium text-white shadow-[0_1px_1px_rgb(0_0_0/0.08),0_2px_6px_rgb(0_0_0/0.16),inset_0_1px_0_rgb(255_255_255/0.18)] transition-[filter,transform,box-shadow] duration-150 ease-out hover:brightness-105 active:translate-y-px active:scale-[0.98]"
      >
        View project
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function TastefulButtonThumbnail() {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 px-4 text-sm font-medium text-white shadow-[0_1px_1px_rgb(0_0_0/0.08),0_2px_6px_rgb(0_0_0/0.16),inset_0_1px_0_rgb(255_255_255/0.18)]">
      View project
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </span>
  );
}

export function TastefulButtonPlayground() {
  const [active, setActive] = useState(3);
  const options = [
    { label: "Default", stage: "default" as const },
    { label: "Structure", stage: "structure" as const },
    { label: "Material", stage: "material" as const },
    { label: "Press", stage: "press" as const },
  ];

  return (
    <div className="not-prose my-6 overflow-hidden border border-(--demo-border) bg-(--demo-bg)">
      <div className="flex items-center justify-between border-b border-(--demo-border) bg-(--demo-bar) px-4 py-2.5">
        <span className="font-heading text-xs text-(--demo-ink)">Playground</span>
        <span className="font-mono text-[10px] text-(--demo-subtle)">Build stages</span>
      </div>
      <div className="grid sm:grid-cols-[12rem_1fr]">
        <nav aria-label="Button build stages" className="grid border-b border-(--demo-border) sm:border-r sm:border-b-0">
          {options.map((option, index) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setActive(index)}
              className={`flex items-center gap-3 border-b border-(--demo-border) px-4 py-3 text-left text-xs last:border-b-0 ${active === index ? "bg-(--demo-ink) text-(--demo-bg)" : "text-(--demo-muted) hover:bg-(--demo-bar)"}`}
            >
              <span className="font-mono text-[10px] opacity-60">{String(index + 1).padStart(2, "0")}</span>
              {option.label}
            </button>
          ))}
        </nav>
        <div className="surface-grid grid min-h-60 place-items-center p-8">
          <TastefulButtonStepPreview stage={options[active].stage} bare />
        </div>
      </div>
    </div>
  );
}

const stages = [
  {
    number: "01",
    title: "Default",
    note: "The browser gives us function, but no character.",
    preview: (
      <span className="inline-flex h-9 items-center rounded-md border border-(--demo-border) bg-(--demo-bg) px-4 text-sm text-(--demo-ink)">
        View project
      </span>
    ),
  },
  {
    number: "02",
    title: "Structured",
    note: "Spacing, shape, contrast, and an icon clarify the action.",
    preview: (
      <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white">
        View project
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </span>
    ),
  },
  {
    number: "03",
    title: "Finished",
    note: "Light, depth, and a restrained press response make it tactile.",
    preview: <TastefulButtonThumbnail />,
  },
];

type TastefulButtonStage = "default" | "structure" | "material" | "press";

export function TastefulButtonStepPreview({
  stage,
  bare = false,
}: {
  stage: TastefulButtonStage;
  bare?: boolean;
}) {
  const buttonByStage = {
    default: (
      <button type="button">View project</button>
    ),
    structure: (
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
      >
        View project
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </button>
    ),
    material: <TastefulButtonThumbnail />,
    press: (
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 px-4 text-sm font-medium text-white shadow-[0_1px_1px_rgb(0_0_0/0.08),0_2px_6px_rgb(0_0_0/0.16),inset_0_1px_0_rgb(255_255_255/0.18)] transition-[filter,transform,box-shadow] duration-150 ease-out hover:brightness-105 active:translate-y-px active:scale-[0.98]"
      >
        View project
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </button>
    ),
  } satisfies Record<TastefulButtonStage, React.ReactNode>;

  if (bare) return buttonByStage[stage];

  return (
    <div className="not-prose my-6 grid min-h-44 place-items-center rounded-xl border border-(--demo-border) bg-(--demo-bar) p-6">
      {buttonByStage[stage]}
    </div>
  );
}

export function TastefulButtonProgression() {
  return (
    <div className="not-prose mt-2 grid overflow-hidden rounded-xl border border-(--demo-border) bg-(--demo-bar) md:grid-cols-3">
      {stages.map((stage) => (
        <div
          key={stage.number}
          className="flex min-h-56 flex-col border-b border-(--demo-border) p-5 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="font-heading text-xs text-(--demo-subtle)">{stage.number}</span>
            <span className="text-xs text-(--demo-subtle)">{stage.title}</span>
          </div>
          <div className="grid flex-1 place-items-center py-7">{stage.preview}</div>
          <p className="text-sm leading-6 text-(--demo-muted)">{stage.note}</p>
        </div>
      ))}
    </div>
  );
}
