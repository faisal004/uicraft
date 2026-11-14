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
  const dotRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const trailSvgRef = useRef<SVGSVGElement>(null);
  const motionRef = useRef({ x: 0, y: 0, tail: 0, ready: false });

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

  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeId));
  const active = rows[activeIndex];
  const targetX = active?.x;
  const targetY = active ? (active.top + active.bottom) / 2 : undefined;

  // The dot and its tail chase the same target at different speeds. While they are apart,
  // the rail between them is lit and fades out behind the dot, then shrinks back into it.
  useLayoutEffect(() => {
    if (targetX === undefined || targetY === undefined) return;
    const dot = dotRef.current;
    const trail = trailRef.current;
    const trailSvg = trailSvgRef.current;
    if (!dot || !trail || !trailSvg) return;

    const motion = motionRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!motion.ready || reduce) {
      motion.x = targetX;
      motion.y = targetY;
      motion.tail = targetY;
      motion.ready = true;
    }

    const draw = () => {
      // Offset by half the 5px dot so its center sits exactly on the rail's center line.
      dot.style.transform = `translate(${motion.x - 2.5}px, ${motion.y - 2.5}px)`;
      const top = Math.min(motion.y, motion.tail);
      const length = Math.abs(motion.y - motion.tail);
      trail.style.transform = `translateY(${top}px)`;
      trail.style.height = `${length}px`;
      trailSvg.style.top = `${-top}px`;
      // Brightest at the dot, fading toward the tail, whichever way it is travelling.
      const mask = `linear-gradient(${motion.tail < motion.y ? "to bottom" : "to top"}, transparent, black)`;
      trail.style.maskImage = mask;
      trail.style.webkitMaskImage = mask;
      trail.style.opacity = String(Math.min(1, length / 24) * 0.7);
    };

    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      // Exponential approach: the dot settles in ~200ms, the tail lags at ~3× that.
      const dotEase = 1 - Math.exp(-dt / 55);
      const tailEase = 1 - Math.exp(-dt / 150);
      motion.x += (targetX - motion.x) * dotEase;
      motion.y += (targetY - motion.y) * dotEase;
      motion.tail += (targetY - motion.tail) * tailEase;
      const settled =
        Math.abs(targetY - motion.y) < 0.05 &&
        Math.abs(targetX - motion.x) < 0.05 &&
        Math.abs(targetY - motion.tail) < 0.05;
      if (settled) {
        motion.x = targetX;
        motion.y = targetY;
        motion.tail = targetY;
      }
      draw();
      if (!settled) frame = requestAnimationFrame(step);
    };

    draw();
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [targetX, targetY]);

  if (items.length < 2) return null;
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
            {/* Comet tail: the stretch of rail between the dot and its slower tail, fading away from the dot. */}
            <div
              ref={trailRef}
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 overflow-hidden"
              style={{ width: 14, height: 0 }}
            >
              <svg
                ref={trailSvgRef}
                className="absolute left-0 overflow-visible text-foreground"
                width={14}
                height={height}
              >
                <path d={path} fill="none" stroke="currentColor" strokeWidth={1} strokeLinejoin="round" />
              </svg>
            </div>
            {active ? (
              <span
                ref={dotRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 size-[5px] rounded-full bg-foreground"
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
