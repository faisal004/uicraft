"use client";

import { Tabs } from "@base-ui/react/tabs";

const STYLES = [
  { value: "satellite", label: "Satellite", note: "Daylight imagery with relief and clouds." },
  { value: "night", label: "Night", note: "City lights on a dark planet." },
  { value: "paper", label: "Paper atlas", note: "A flat printed map on warm paper." },
];

export function TastefulTabs() {
  return (
    <Tabs.Root defaultValue="satellite" className="flex flex-col items-center gap-4">
      <Tabs.List
        aria-label="Map style"
        className="relative z-0 flex w-fit items-center rounded-full bg-zinc-100 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] dark:bg-zinc-900 dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]"
      >
        {STYLES.map((style) => (
          <Tabs.Tab
            key={style.value}
            value={style.value}
            className="h-8 rounded-full px-3.5 text-sm font-medium whitespace-nowrap text-zinc-500 outline-none select-none transition-[color,scale] duration-200 ease-out hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400/60 active:scale-[0.97] data-[active]:text-zinc-950 motion-reduce:active:scale-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:data-[active]:text-white"
          >
            {style.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="absolute top-(--active-tab-top) left-0 -z-10 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.1),0_2px_6px_-2px_rgb(0_0_0/0.08)] transition-[translate,width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none dark:bg-zinc-700 dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08),inset_0_1px_0_rgb(255_255_255/0.08),0_2px_6px_-1px_rgb(0_0_0/0.5)]" />
      </Tabs.List>
      {STYLES.map((style) => (
        <Tabs.Panel key={style.value} value={style.value} className="text-sm text-zinc-500 outline-none dark:text-zinc-400">
          {style.note}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
