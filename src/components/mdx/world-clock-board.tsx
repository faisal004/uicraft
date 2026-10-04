"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { CraftFrame } from "@/components/mdx/craft-controls";

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
const TIME_SLOTS = 5;
const CITY_SLOTS = 15;
const HOLD_MS = 320;

const DEFAULT_CITIES = [
  { name: "NEW YORK CITY", timeZone: "America/New_York" },
  { name: "TOKYO", timeZone: "Asia/Tokyo" },
  { name: "HAWAII", timeZone: "Pacific/Honolulu" },
  { name: "LOS ANGELES", timeZone: "America/Los_Angeles" },
  { name: "NEW DELHI", timeZone: "Asia/Kolkata" },
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
  return cities.map((city) => {
    const time = date ? formatTime(city.timeZone, date) : " ".repeat(TIME_SLOTS);
    const name = (city.name.trim().toUpperCase() || "CITY").slice(0, CITY_SLOTS);
    return `${time}${name.padEnd(CITY_SLOTS, " ")}`;
  });
}

function lit(character: string, x: number, y: number) {
  const glyph = FONT[character] ?? FONT[" "];
  return glyph[y * CELL_W + x] === "1";
}

function LedMatrix({ lines }: { lines: string[] }) {
  return (
    <div
      className="grid w-full gap-y-[clamp(14px,2.4cqi,28px)]"
    >
      {lines.map((line, rowIndex) => (
        <div
          key={rowIndex}
          className="grid items-start gap-x-[clamp(4px,0.7cqi,8px)]"
          style={{ gridTemplateColumns: `repeat(${TIME_SLOTS}, minmax(0, 1fr)) minmax(0, 1fr) repeat(${CITY_SLOTS}, minmax(0, 1fr))` }}
        >
          {[...line].map((character, column) => (
            <div
              key={column}
              className="grid grid-cols-5 gap-[clamp(1px,0.16cqi,2px)]"
              style={column === TIME_SLOTS ? { gridColumn: column + 2 } : undefined}
            >
              {Array.from({ length: CELL_W * CELL_H }, (_, dot) => (
                <span
                  key={dot}
                  className={`aspect-square w-full rounded-full ${lit(character, dot % CELL_W, Math.floor(dot / CELL_W)) ? "bg-[#f2f2f2]" : "bg-[#434343]"}`}
                />
              ))}
            </div>
          ))}
        </div>
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
        if (reduce) return false;
        if (force || prior === null) return true;
        if (column >= TIME_SLOTS && prior[rowIndex]?.slice(0, TIME_SLOTS) !== row.slice(0, TIME_SLOTS)) return true;
        return prior[rowIndex]?.[column] !== character;
      }),
    );

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
          const city = column >= TIME_SLOTS;
          const position = city ? column - TIME_SLOTS : column;
          const last = city ? CITY_SLOTS - 1 : TIME_SLOTS - 1;
          const delay = stagger * last * (1 - Math.cos(Math.PI * position / last)) / 2;
          if (!dirty[rowIndex]?.[column] || now >= started + delay + HOLD_MS) {
            line += goal;
          } else if (now < started + delay) {
            pending = true;
            line += prior?.[rowIndex]?.[column] ?? " ";
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
      return pending;
    };

    if (paint()) timer = window.setInterval(paint, cycle);
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
        .map((row) => `${row.slice(0, TIME_SLOTS)} ${row.slice(TIME_SLOTS).trim()}`)
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
    { name: "NEW DELHI", timeZone: "Asia/Kolkata" },
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
  const labels = ["Plain text", "Fixed slots", "LED matrix", "Shuffle", "Live clock"];

  return (
    <CraftFrame label={`Stage ${String(current + 1).padStart(2, "0")}`} meta={labels[current]}>
      <div className="surface-grid p-5 sm:p-8">
        {current === 0 ? (
          <div className="grid gap-2 font-mono text-sm text-(--demo-ink) sm:text-base">
            {["19:45   NEW YORK CITY", "08:45   TOKYO", "13:45   HAWAII", "16:45   LOS ANGELES", "05:15   NEW DELHI"].map(
              (line) => (
                <p key={line}>{line}</p>
              ),
            )}
          </div>
        ) : current === 1 ? (
          <pre className="overflow-x-auto font-mono text-xs leading-6 text-(--demo-ink) sm:text-sm">
            {SAMPLE.map((line) => `${line.slice(0, TIME_SLOTS)}   ${line.slice(TIME_SLOTS).replaceAll(" ", "·")}`).join("\n")}
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
