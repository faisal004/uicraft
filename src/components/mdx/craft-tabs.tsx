"use client";

import type { ReactNode } from "react";

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
  "h-full rounded-none px-4 text-[#5d5e62] shadow-none transition-colors duration-150 hover:bg-[#3155d9]/8 hover:text-[#10121b] data-active:bg-[#10121b] data-active:text-[#f7f7f4] data-active:shadow-none data-active:hover:bg-[#10121b] data-active:hover:text-[#f7f7f4] dark:data-active:border-transparent dark:data-active:bg-[#10121b] dark:data-active:text-[#f7f7f4] dark:data-active:hover:bg-[#10121b] dark:data-active:hover:text-[#f7f7f4]";

const panelClassName =
  "min-w-0 bg-white p-5 outline-none sm:p-8 lg:p-10 [&_ol]:max-w-none [&_p]:max-w-none [&_ul]:max-w-none";

export function CraftTabs({ implementation, howItWorks }: CraftTabsProps) {
  return (
    <Tabs
      className="mt-16 w-full gap-0 overflow-hidden border border-[#10121b]/10 bg-white sm:mt-24"
      defaultValue="implementation"
    >
      <TabsList
        aria-label="Craft article sections"
        className="h-12 w-full rounded-none border-b border-[#10121b]/10 bg-[#ededeb] p-0"
      >
        <TabsTrigger className={tabClassName} value="implementation">
          Copy/paste component
        </TabsTrigger>
        <TabsTrigger className={tabClassName} value="how-it-works">
          How does it work?
        </TabsTrigger>
      </TabsList>

      <TabsContent className={panelClassName} value="implementation">
        {implementation}
      </TabsContent>
      <TabsContent className={panelClassName} value="how-it-works">
        {howItWorks}
      </TabsContent>
    </Tabs>
  );
}
