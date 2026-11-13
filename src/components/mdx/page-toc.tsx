"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { AlignLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export type TocItem = { id: string; title: string; depth: 2 | 3 };

// The rail runs at one x for top-level entries and bends inward for sub-entries.
const RAIL_X = { 2: 1, 3: 13 } as const;

type Row = { top: number; bottom: number; x: number };

function railPath(rows: Row[]) {
  return rows
    .map((row, index) => {
      const start = `${index === 0 ? "M" : "L"}${row.x} ${row.top}`;
      return `${start} L${row.x} ${row.bottom}`;
    })
    .join(" ");
}

export function PageToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const [rows, setRows] = useState<Row[]>([]);
  const listRef = useRef<HTMLUListElement>(null);

  // Measure every link so the rail can follow wrapped lines and bend between depths.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const links = [...list.querySelectorAll<HTMLAnchorElement>("a[data-depth]")];
      setRows(
        links.map((link) => ({
          top: link.offsetTop + 4,
          bottom: link.offsetTop + link.offsetHeight - 4,
          x: RAIL_X[Number(link.dataset.depth) as 2 | 3],
        })),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [items]);

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

  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeId));
  const active = rows[activeIndex];
  const height = rows.at(-1)?.bottom ?? 0;
  const path = railPath(rows);

  const jump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav aria-label="On this page" className="text-[13px]">
      <p className="flex items-center gap-2 text-foreground/55">
        <AlignLeft className="size-3.5" aria-hidden="true" />
        On this page
      </p>

      <div className="relative mt-3">
        {rows.length ? (
          <>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 overflow-visible text-foreground/15"
              width={14}
              height={height}
            >
              <path d={path} fill="none" stroke="currentColor" strokeWidth={1} strokeLinejoin="round" />
            </svg>
            {active ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 size-[5px] rounded-full bg-foreground transition-transform duration-300 ease-out motion-reduce:transition-none"
                style={{
                  transform: `translate(${active.x - 2}px, ${(active.top + active.bottom) / 2 - 2.5}px)`,
                }}
              />
            ) : null}
          </>
        ) : null}

        <ul ref={listRef} className="relative">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  data-depth={item.depth}
                  onClick={(event) => jump(event, item.id)}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "block py-1.5 leading-5 transition-colors duration-200",
                    item.depth === 3 ? "pl-7" : "pl-4",
                    isActive ? "font-medium text-foreground" : "text-foreground/50 hover:text-foreground",
                  )}
                >
                  {item.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
