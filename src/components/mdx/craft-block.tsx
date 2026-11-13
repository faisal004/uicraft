"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Code2, Eye, MousePointerClick } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CraftBlockProps = {
  label?: string;
  preview: ReactNode;
  code?: ReactNode;
};

const triggerClassName =
  "h-full flex-none gap-1.5 rounded-none border-0 px-2.5 text-[13px] font-medium text-foreground/50 hover:text-foreground data-active:text-foreground group-data-horizontal/tabs:after:-bottom-px";

const panelClassName =
  "min-w-0 border border-foreground/10 bg-(--craft-surface) outline-none";

export function CraftBlock({ label = "Demo", preview, code }: CraftBlockProps) {
  const [tab, setTab] = useState<string>("preview");

  return (
    <Tabs
      id="demo"
      value={tab}
      onValueChange={(value) => setTab(String(value))}
      className="mt-10 scroll-mt-20 gap-0 border border-foreground/10 bg-(--craft-muted-surface) p-1"
    >
      <div className="flex h-10 items-center justify-between gap-3 pr-1 pl-2.5">
        <span className="flex items-center gap-2 font-mono text-xs text-foreground/70">
          <MousePointerClick className="size-3.5 text-foreground/45" aria-hidden="true" />
          {label}
        </span>
        {code ? (
          <TabsList variant="line" aria-label="Demo view" className="h-full gap-0 p-0">
            <TabsTrigger value="preview" className={triggerClassName}>
              <Eye className="size-3.5" aria-hidden="true" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className={triggerClassName}>
              <Code2 className="size-3.5" aria-hidden="true" />
              Code
            </TabsTrigger>
          </TabsList>
        ) : null}
      </div>

      {/* Both panels stay in the server HTML so the source is crawlable.
          Remounting on activation lets demos measure themselves once visible. */}
      <TabsContent
        value="preview"
        keepMounted
        className={`${panelClassName} craft-preview overflow-hidden`}
      >
        <Fragment key={tab === "preview" ? "active" : "hidden"}>{preview}</Fragment>
      </TabsContent>
      {code ? (
        <TabsContent
          value="code"
          keepMounted
          className={`${panelClassName} max-h-[42rem] overflow-y-auto p-4 sm:p-6 [&>*:first-child]:mt-0 [&_ol]:max-w-none [&_p]:max-w-none [&_ul]:max-w-none`}
        >
          <Fragment key={tab === "code" ? "active" : "hidden"}>{code}</Fragment>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
