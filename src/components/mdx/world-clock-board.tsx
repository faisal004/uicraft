"use client";

import { RotateCcw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { CraftFrame, RangeControl } from "@/components/mdx/craft-controls";

const FONT: Record<string, string> = {
  " ": "0000000000000000000000000000000000000",
  "0": "01110100011001110101110011000101110",
  "1": "00100011000010000100001000010001110",
  "2": "01110100010000100010001000100011111",
  "3": "11110000010000101110000010000111110",
  "4": "00010001100101010010111110001000010",
  "5": "11111100001000011110000010000111110",
  "6": "00110010001000011110100011000101110",
  "7": "11111000010001000100010000100001000",
  "8": "01110100011000101110100011000101110",
  "9": "01110100011000101111000010001001100",
  ":": "00000001000010000000001000010000000",
  A: "01110100011000111111100011000110001",
  B: "11110100011000111110100011000111110",
  C: "01110100011000010000100001000101110",
  D: "11110100011000110001100011000111110",
  E: "11111100001000011110100001000011111",
  F: "11111100001000011110100001000010000",
  G: "01110100011000010111100011000101111",
  H: "10001100011000111111100011000110001",
  I: "01110001000010000100001000010001110",
  J: "00111000100001000010000101001001100",
  K: "10001100101010011000101001001010001",
  L: "10000100001000010000100001000011111",
  M: "10001110111010110101100011000110001",
  N: "10001110011010110011100011000110001",
  O: "01110100011000110001100011000101110",
  P: "11110100011000111110100001000010000",
  Q: "01110100011000110001101011001001101",
  R: "11110100011000111110101001001010001",
  S: "01111100001000001110000010000111110",
  T: "11111001000010000100001000010000100",
  U: "10001100011000110001100011000101110",
  V: "10001100011000110001010100010000100",
  W: "10001100011000110101101011010101010",
  X: "10001100010101000100010101000110001",
  Y: "10001100010101000100001000010000100",
  Z: "11111000010001000100010001000011111",
};

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CELL_W = 5;
const CELL_H = 7;
const HOLD_MS = 480;

const DEFAULT_CITIES = [
  { name: "NEW YORK CITY", timeZone: "America/New_York" },
  { name: "TOKYO", timeZone: "Asia/Tokyo" },
  { name: "HAWAII", timeZone: "Pacific/Honolulu" },
  { name: "LOS ANGELES", timeZone: "America/Los_Angeles" },
];

type City = {
  name: string;
  timeZone: string;
};

type WorldClockBoardProps = {
  cities?: City[];
  staggerMs?: number;
  cycleMs?: number;
  replay?: number;
  announce?: boolean;
  className?: string;
};

function formatTime(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour.slice(-2).padStart(2, "0")}:${minute.slice(-2).padStart(2, "0")}`;
}

function clockLines(cities: City[], date: Date | null) {
  const labels = cities.map((city) => city.name.trim().toUpperCase() || "CITY");
  const width = Math.max(...labels.map((label) => `00:00   ${label}`.length)) + 3;
  return labels.map((label, index) => {
    const time = date ? formatTime(cities[index].timeZone, date) : "     ";
    return `${time}   ${label}`.padEnd(width, " ");
  });
}

function lit(character: string, x: number, y: number) {
  const glyph = FONT[character] ?? FONT[" "];
  return glyph[y * CELL_W + x] === "1";
}

function matrixCells(lines: string[]) {
  const width = lines[0]?.length ?? 0;
  const columns = width * (CELL_W + 1);
  const on: boolean[] = [];

  lines.forEach((line, rowIndex) => {
    for (let y = 0; y < CELL_H; y += 1) {
      for (let column = 0; column < width; column += 1) {
        for (let x = 0; x < CELL_W; x += 1) on.push(lit(line[column] ?? " ", x, y));
        on.push(false);
      }
    }
    if (rowIndex < lines.length - 1) {
      for (let gap = 0; gap < 2; gap += 1) {
        for (let column = 0; column < columns; column += 1) on.push(false);
      }
    }
  });

  return { on, columns };
}

function LedMatrix({ lines }: { lines: string[] }) {
  const { on, columns } = matrixCells(lines);
  if (columns === 0) return null;

  return (
    <div
      className="grid w-full"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: "clamp(1px, 0.16cqi, 2px)",
      }}
    >
      {on.map((lamp, index) => (
        <span
          key={index}
          className={
            lamp
              ? "aspect-square w-full rounded-full bg-white shadow-[0_0_4px_rgb(255_255_255/0.8)]"
              : "aspect-square w-full rounded-full bg-white/15"
          }
        />
      ))}
    </div>
  );
}

function useFlapRows(rows: string[], staggerMs: number, cycleMs: number, replay: number) {
  const signature = rows.join("\n");
  const [shown, setShown] = useState(() => rows.map((row) => " ".repeat(row.length)));
  const previous = useRef<string[] | null>(null);
  const replaySeen = useRef(replay);

  useEffect(() => {
    const next = signature.length === 0 ? [] : signature.split("\n");
    const stagger = Math.min(160, Math.max(12, staggerMs));
    const cycle = Math.min(180, Math.max(32, cycleMs));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const prior = previous.current;
    const force = replay !== replaySeen.current;

    const dirty = next.map((row, rowIndex) =>
      [...row].map((character, column) => {
        if (character === " ") return false;
        if (reduce) return false;
        if (force || prior === null) return true;
        return prior[rowIndex]?.[column] !== character;
      }),
    );

    const rank = dirty.map((row) => {
      let order = 0;
      return row.map((cell) => (cell ? order++ : -1));
    });

    if (!dirty.some((row) => row.some(Boolean))) {
      previous.current = next;
      replaySeen.current = replay;
      setShown(next);
      return;
    }

    const started = performance.now();
    let timer = 0;

    const paint = () => {
      const now = performance.now();
      let pending = false;
      const frame = next.map((row, rowIndex) => {
        let line = "";
        for (let column = 0; column < row.length; column += 1) {
          const goal = row[column] ?? " ";
          const place = rank[rowIndex]?.[column] ?? -1;
          if (place === -1 || now >= started + HOLD_MS + place * stagger) {
            line += goal;
          } else {
            pending = true;
            line += CHARSET[Math.floor(Math.random() * CHARSET.length)];
          }
        }
        return line;
      });
      setShown(frame);
      if (!pending) {
        previous.current = next;
        replaySeen.current = replay;
        window.clearInterval(timer);
      }
    };

    paint();
    timer = window.setInterval(paint, cycle);
    return () => window.clearInterval(timer);
  }, [signature, staggerMs, cycleMs, replay]);

  return shown;
}

export function WorldClockBoard({
  cities = DEFAULT_CITIES,
  staggerMs = 70,
  cycleMs = 80,
  replay = 0,
  announce = true,
  className,
}: WorldClockBoardProps) {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    const publish = () => {
      const next = new Date();
      setDate((current) => {
        if (current && clockLines(cities, current).join("\n") === clockLines(cities, next).join("\n")) {
          return current;
        }
        return next;
      });
    };

    publish();
    const timer = window.setInterval(publish, 1000);
    return () => window.clearInterval(timer);
  }, [cities]);

  const rows = clockLines(cities, date);
  const shown = useFlapRows(rows, staggerMs, cycleMs, replay);
  const label = date
    ? rows
        .map((row) => row.trim().replace(/ +/g, " "))
        .filter(Boolean)
        .join(". ")
    : "";

  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-white/10 bg-black px-3 py-6 shadow-[inset_0_0_16px_rgba(0,0,0,0.9)] sm:px-5 sm:py-7${className ? ` ${className}` : ""}`}
      style={{ containerType: "inline-size" }}
    >
      <p className="sr-only" aria-live={announce ? "polite" : undefined}>
        {label}
      </p>
      <div aria-hidden="true">
        <LedMatrix lines={shown} />
      </div>
    </div>
  );
}

const SAMPLE = clockLines(
  [
    { name: "NEW YORK CITY", timeZone: "America/New_York" },
    { name: "TOKYO", timeZone: "Asia/Tokyo" },
    { name: "HAWAII", timeZone: "Pacific/Honolulu" },
    { name: "LOS ANGELES", timeZone: "America/Los_Angeles" },
  ],
  new Date("2026-10-04T23:45:00Z"),
);

function BoardFrame({
  children,
  label,
  meta,
  onReplay,
}: {
  children: ReactNode;
  label: string;
  meta: string;
  onReplay?: () => void;
}) {
  return (
    <CraftFrame
      label={label}
      meta={meta}
      leading={<span className="size-2 bg-emerald-400 shadow-[0_0_8px_rgb(74_222_128/0.7)]" />}
    >
      <div className="surface-grid p-5 sm:p-8">
        <div className="relative">
          {children}
          {onReplay ? (
            <button
              type="button"
              onClick={onReplay}
              className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55 outline-none transition-colors duration-150 hover:text-white focus-visible:text-white"
            >
              Replay
            </button>
          ) : null}
        </div>
      </div>
    </CraftFrame>
  );
}

export function WorldClockBoardDemo() {
  const [replay, setReplay] = useState(0);

  return (
    <BoardFrame
      label="Board online"
      meta="WC–01"
      onReplay={() => setReplay((value) => value + 1)}
    >
      <WorldClockBoard replay={replay} className="pt-10" />
    </BoardFrame>
  );
}

export function WorldClockBoardPlayground() {
  const [stagger, setStagger] = useState(70);
  const [replay, setReplay] = useState(0);

  return (
    <CraftFrame label="Playground" meta="Board controls">
      <div className="surface-grid border-b border-(--demo-border) p-5 sm:p-8">
        <WorldClockBoard staggerMs={stagger} cycleMs={Math.round(40 + stagger * 0.55)} replay={replay} announce={false} />
      </div>
      <div className="grid gap-5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-(--demo-ink)">Board controls</p>
            <p className="mt-0.5 text-xs text-(--demo-muted)">
              Column delay is how long each cell waits for the cell on its left.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReplay((value) => value + 1)}
              className="inline-flex h-8 items-center border border-(--demo-ink) bg-(--demo-ink) px-2.5 text-[11px] font-medium text-(--demo-bg) outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[#1736f5]/25 active:scale-[0.97]"
            >
              Replay
            </button>
            <button
              type="button"
              onClick={() => {
                setStagger(70);
                setReplay((value) => value + 1);
              }}
              className="inline-flex h-8 items-center gap-1.5 border border-(--demo-border) bg-(--demo-bg) px-2.5 text-[11px] font-medium text-(--demo-muted) outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-(--demo-bar) hover:text-(--demo-ink) focus-visible:ring-2 focus-visible:ring-[#1736f5]/25 active:scale-[0.97]"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
        <RangeControl
          label="Column delay"
          value={stagger}
          min={20}
          max={140}
          step={2}
          unit="ms"
          onChange={setStagger}
        />
      </div>
    </CraftFrame>
  );
}

function FlapSample() {
  const [replay, setReplay] = useState(0);
  const shown = useFlapRows(SAMPLE, 70, 80, replay);

  useEffect(() => {
    const timer = window.setInterval(() => setReplay((value) => value + 1), 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-white/10 bg-black px-3 py-6 sm:px-5 sm:py-7"
      style={{ containerType: "inline-size" }}
    >
      <LedMatrix lines={shown} />
    </div>
  );
}

export function WorldClockBoardStep({ step }: { step: number | string }) {
  const current = Number(step);
  const labels = ["Plain text", "Aligned cells", "LED matrix", "Flip", "Live clock"];

  return (
    <CraftFrame label={`Stage ${String(current + 1).padStart(2, "0")}`} meta={labels[current]}>
      <div className="surface-grid p-5 sm:p-8">
        {current === 0 ? (
          <div className="grid gap-2 font-mono text-sm text-(--demo-ink) sm:text-base">
            {["19:45   NEW YORK CITY", "08:45   TOKYO", "13:45   HAWAII", "16:45   LOS ANGELES"].map(
              (line) => (
                <p key={line}>{line}</p>
              ),
            )}
          </div>
        ) : current === 1 ? (
          <pre className="overflow-x-auto font-mono text-xs leading-6 text-(--demo-ink) sm:text-sm">
            {SAMPLE.map((line) => line.replaceAll(" ", "·")).join("\n")}
          </pre>
        ) : current === 2 ? (
          <div
            className="w-full overflow-hidden rounded-xl border border-white/10 bg-black px-3 py-6 sm:px-5 sm:py-7"
            style={{ containerType: "inline-size" }}
          >
            <LedMatrix lines={SAMPLE} />
          </div>
        ) : current === 3 ? (
          <FlapSample />
        ) : (
          <WorldClockBoard announce={false} />
        )}
      </div>
    </CraftFrame>
  );
}

export function WorldClockBoardThumbnail() {
  return <WorldClockBoard announce={false} className="pointer-events-none rounded-none border-0 shadow-none" />;
}
