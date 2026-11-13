"use client";

import { useEffect, useState } from "react";
import { AlignLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export type TocItem = { id: string; title: string; depth: 2 | 3 };

export function PageToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id);

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!headings.length) return;

    // The active entry is the last heading that has scrolled past the top band.
    const update = () => {
      let current = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= 120) current = heading.id;
      }
      // Short final sections never reach the top band, so the page bottom selects the last one.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = headings[headings.length - 1].id;
      setActiveId(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-[13px]">
      <p className="flex items-center gap-2 text-foreground/55">
        <AlignLeft className="size-3.5" aria-hidden="true" />
        On this page
      </p>
      <ul className="mt-3 border-l border-foreground/10">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "-ml-px block border-l py-1 leading-5 transition-colors duration-150",
                  item.depth === 3 ? "pl-6" : "pl-3",
                  active
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-foreground/50 hover:text-foreground",
                )}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
