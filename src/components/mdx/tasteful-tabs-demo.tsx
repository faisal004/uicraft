"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useState } from "react";

import { TastefulTabs } from "@/components/mdx/tasteful-tabs";
import { Tabs as ShadcnTabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STYLES = [
  { value: "satellite", label: "Satellite" },
  { value: "night", label: "Night" },
  { value: "paper", label: "Paper atlas" },
];

export function TastefulTabsDemo() {
  return (
    <div className="grid min-h-72 place-items-center p-8">
      <TastefulTabs />
    </div>
  );
}

// The tutorial builds the finished tabs in stages. Each stage is the class names that step adds, so the
// previews below render exactly the code shown in that step.
export type TastefulTabsStage = "default" | "track" | "labels" | "thumb" | "motion" | "final";

const LIST = {
  track: "flex w-fit items-center rounded-full bg-zinc-100 p-1 dark:bg-zinc-900",
  labels:
    "flex w-fit items-center rounded-full bg-zinc-100 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] dark:bg-zinc-900 dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]",
  thumb:
    "relative z-0 flex w-fit items-center rounded-full bg-zinc-100 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] dark:bg-zinc-900 dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]",
};

const TAB = {
  track: "h-8 rounded-full px-3.5 text-sm font-medium whitespace-nowrap data-[active]:bg-white dark:data-[active]:bg-zinc-700",
  labels:
    "h-8 rounded-full px-3.5 text-sm font-medium whitespace-nowrap text-zinc-500 transition-colors duration-200 ease-out hover:text-zinc-900 data-[active]:bg-white data-[active]:text-zinc-950 data-[active]:shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.1),0_2px_6px_-2px_rgb(0_0_0/0.08)] dark:text-zinc-400 dark:hover:text-zinc-100 dark:data-[active]:bg-zinc-700 dark:data-[active]:text-white",
  thumb:
    "h-8 rounded-full px-3.5 text-sm font-medium whitespace-nowrap text-zinc-500 transition-colors duration-200 ease-out hover:text-zinc-900 data-[active]:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 dark:data-[active]:text-white",
};

const THUMB =
  "absolute top-(--active-tab-top) left-0 -z-10 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.1),0_2px_6px_-2px_rgb(0_0_0/0.08)] dark:bg-zinc-700 dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08),inset_0_1px_0_rgb(255_255_255/0.08),0_2px_6px_-1px_rgb(0_0_0/0.5)]";

const MOTION = "transition-[translate,width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]";

function StageTabs({ stage }: { stage: Exclude<TastefulTabsStage, "default" | "final"> }) {
  const list = stage === "motion" ? LIST.thumb : LIST[stage];
  const tab = stage === "motion" ? TAB.thumb : TAB[stage];
  const sliding = stage === "thumb" || stage === "motion";

  return (
    <Tabs.Root defaultValue="satellite">
      <Tabs.List aria-label="Map style" className={list}>
        {STYLES.map((style) => (
          <Tabs.Tab key={style.value} value={style.value} className={tab}>
            {style.label}
          </Tabs.Tab>
        ))}
        {sliding ? <Tabs.Indicator className={stage === "motion" ? `${THUMB} ${MOTION}` : THUMB} /> : null}
      </Tabs.List>
    </Tabs.Root>
  );
}

function StageContent({ stage }: { stage: TastefulTabsStage }) {
  if (stage === "default") {
    return (
      <ShadcnTabs defaultValue="satellite">
        <TabsList aria-label="Map style">
          {STYLES.map((style) => (
            <TabsTrigger key={style.value} value={style.value}>
              {style.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </ShadcnTabs>
    );
  }
  if (stage === "final") return <TastefulTabs />;
  return <StageTabs stage={stage} />;
}

export function TastefulTabsStepPreview({ stage, bare = false }: { stage: TastefulTabsStage; bare?: boolean }) {
  if (bare) return <StageContent stage={stage} />;

  return (
    <div className="not-prose my-6 grid min-h-44 place-items-center rounded-xl border border-(--demo-border) bg-(--demo-bg) p-6">
      <StageContent stage={stage} />
    </div>
  );
}

const PLAYGROUND: { label: string; stage: TastefulTabsStage }[] = [
  { label: "shadcn default", stage: "default" },
  { label: "Track", stage: "track" },
  { label: "Labels", stage: "labels" },
  { label: "One thumb", stage: "thumb" },
  { label: "Motion", stage: "motion" },
  { label: "Finished", stage: "final" },
];

export function TastefulTabsPlayground() {
  const [active, setActive] = useState(PLAYGROUND.length - 1);

  return (
    <div className="not-prose my-6 overflow-hidden border border-(--demo-border) bg-(--demo-bg)">
      <div className="flex items-center justify-between border-b border-(--demo-border) bg-(--demo-bar) px-4 py-2.5">
        <span className="font-heading text-xs text-(--demo-ink)">Playground</span>
        <span className="font-mono text-[10px] text-(--demo-subtle)">Build stages</span>
      </div>
      <div className="grid sm:grid-cols-[12rem_1fr]">
        <nav aria-label="Tabs build stages" className="grid border-b border-(--demo-border) sm:border-r sm:border-b-0">
          {PLAYGROUND.map((option, index) => (
            <button
              key={option.stage}
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
          {/* Remount per stage so each one starts on Satellite. */}
          <TastefulTabsStepPreview key={PLAYGROUND[active].stage} stage={PLAYGROUND[active].stage} bare />
        </div>
      </div>
    </div>
  );
}
