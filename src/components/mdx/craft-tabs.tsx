"use client";

import { Fragment, useState, type ReactNode } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type CraftTabsProps = {
  implementation: ReactNode;
  howItWorks: ReactNode;
};

const tabClassName =
  "h-full rounded-none px-4 text-(--craft-muted) shadow-none transition-colors duration-150 hover:bg-(--craft-accent-soft) hover:text-foreground data-active:bg-foreground data-active:text-background data-active:shadow-none data-active:hover:bg-foreground data-active:hover:text-background dark:data-active:border-transparent dark:data-active:bg-foreground dark:data-active:text-background dark:data-active:hover:bg-foreground dark:data-active:hover:text-background";

const panelClassName =
  "min-w-0 bg-(--craft-surface) p-5 outline-none sm:p-8 lg:p-10 [&_ol]:max-w-none [&_p]:max-w-none [&_ul]:max-w-none";

export function CraftTabs({ implementation, howItWorks }: CraftTabsProps) {
  const [tab, setTab] = useState<string>("implementation");

  return (
    <Tabs
      className="mt-16 w-full gap-0 overflow-hidden border border-foreground/10 bg-(--craft-surface) sm:mt-24"
      value={tab}
      onValueChange={(value) => setTab(String(value))}
    >
      <TabsList
        aria-label="Craft article sections"
        className="h-12 w-full rounded-none border-b border-foreground/10 bg-(--craft-muted-surface) p-0"
      >
        <TabsTrigger className={tabClassName} value="implementation">
          Copy/paste component
        </TabsTrigger>
        <TabsTrigger className={tabClassName} value="how-it-works">
          How does it work?
        </TabsTrigger>
      </TabsList>

      {/* Both panels stay in the server HTML so search engines can read the tutorial.
          Remounting on activation lets demos measure themselves once visible. */}
      <TabsContent className={panelClassName} value="implementation" keepMounted>
        <Fragment key={tab === "implementation" ? "active" : "hidden"}>{implementation}</Fragment>
      </TabsContent>
      <TabsContent className={panelClassName} value="how-it-works" keepMounted>
        <Fragment key={tab === "how-it-works" ? "active" : "hidden"}>{howItWorks}</Fragment>
      </TabsContent>
    </Tabs>
  );
}
