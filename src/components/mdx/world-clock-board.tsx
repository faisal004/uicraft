"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { CraftFrame } from "@/components/mdx/craft-controls";

const FONT: Record<string, string> = {
  " ": "00000000000000000000000000000000000",
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

function lit(glyph: string, x: number, y: number) {
  return glyph[y * CELL_W + x] === "1";
}

function LedGlyph({ glyph }: { glyph: string }) {
  return (
    <svg viewBox={`0 0 ${CELL_W} ${CELL_H}`} className="block w-full" focusable="false">
      {Array.from({ length: CELL_W * CELL_H }, (_, dot) => {
        const x = dot % CELL_W;
        const y = Math.floor(dot / CELL_W);
        return (
          <circle
            key={dot}
            cx={x + 0.5}
            cy={y + 0.5}
            r={0.38}
            className={lit(glyph, x, y) ? "fill-[#f2f2f2]" : "fill-[#434343]"}
          />
        );
      })}
    </svg>
  );
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
              style={column === TIME_SLOTS ? { gridColumn: column + 2 } : undefined}
            >
              <LedGlyph glyph={FONT[character] ?? FONT[" "]} />
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

const SAMPLE = clockLines(DEFAULT_CITIES, new Date("2026-10-04T23:45:00Z"));

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

export function WorldClockBitmapWorkshop() {
  const [glyph, setGlyph] = useState(FONT["0"]);
  const [selected, setSelected] = useState(17);
  const row = Math.floor(selected / CELL_W);
  const column = selected % CELL_W;

  return (
    <CraftFrame label="Make one bitmap letter" meta="5 × 7 lights">
      <div className="surface-grid grid gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-(--demo-muted)">Start with</span>
          {["0", "A", ":", " "].map((character) => (
            <button
              key={character}
              type="button"
              aria-pressed={glyph === FONT[character]}
              onClick={() => { setGlyph(FONT[character]); setSelected(17); }}
              className={`min-w-9 border px-2.5 py-1.5 font-mono text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--craft-accent) motion-reduce:transition-none ${glyph === FONT[character] ? "border-(--demo-ink) bg-(--demo-ink) text-(--demo-bg)" : "border-(--demo-border) bg-(--demo-bg) text-(--demo-ink) hover:border-(--demo-ink)"}`}
            >
              {character === " " ? "Blank" : character}
            </button>
          ))}
          <span className="text-xs text-(--demo-muted)">Choose a shape, then edit its lights.</span>
        </div>

        <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
          <div className="border border-(--demo-border) bg-(--demo-bg)">
            <div className="flex items-center justify-between gap-3 border-b border-(--demo-border) px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-(--demo-muted)">01 / Draw with switches</p>
              <span className="font-mono text-[10px] tabular-nums text-(--demo-muted)">R{row + 1} · C{column + 1}</span>
            </div>
            <div className="bg-[#101010] px-3 py-4 text-white">
              <div className="mx-auto grid w-full max-w-[272px] grid-cols-[18px_repeat(5,minmax(0,1fr))] gap-1.5">
                <span />
                {Array.from({ length: CELL_W }, (_, x) => <span key={x} className="text-center font-mono text-[10px] text-white/55">{x + 1}</span>)}
                {Array.from({ length: CELL_W * CELL_H }, (_, dot) => (
                  <div key={dot} className="contents">
                    {dot % CELL_W === 0 ? <span className="self-center font-mono text-[10px] text-white/55">{Math.floor(dot / CELL_W) + 1}</span> : null}
                    <button
                      type="button"
                      aria-label={`Row ${Math.floor(dot / CELL_W) + 1}, column ${dot % CELL_W + 1}: ${glyph[dot] === "1" ? "on" : "off"}. Toggle light.`}
                      aria-pressed={glyph[dot] === "1"}
                      onClick={() => {
                        setSelected(dot);
                        setGlyph((current) => current.slice(0, dot) + (current[dot] === "1" ? "0" : "1") + current.slice(dot + 1));
                      }}
                      className={`aspect-square border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--craft-accent) motion-reduce:transition-none ${glyph[dot] === "1" ? "border-[#f2f2f2] bg-[#f2f2f2]" : "border-[#494949] bg-[#292929] hover:border-[#8a8a8a]"} ${selected === dot ? "ring-2 ring-(--craft-accent) ring-offset-2 ring-offset-[#101010]" : ""}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-5 flex w-full max-w-[272px] items-center justify-between border-t border-white/15 pt-3 font-mono text-[10px] text-white/65">
                <span className="flex items-center gap-1.5"><span className="size-2.5 bg-[#f2f2f2]" /> 1 = on</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 border border-[#494949] bg-[#292929]" /> 0 = off</span>
              </div>
            </div>
            <div className="flex items-center gap-4 border-t border-(--demo-border) px-4 py-3">
              <div className="w-12 shrink-0 bg-black p-1" style={{ containerType: "inline-size" }} aria-hidden="true"><LedGlyph glyph={glyph} /></div>
              <p className="text-xs leading-5 text-(--demo-muted)">The same 35 switches, now shown as round LEDs.</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="border border-(--demo-border) bg-(--demo-bg)">
              <div className="flex items-center justify-between gap-3 border-b border-(--demo-border) px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-(--demo-muted)">02 / Save the drawing</p>
                <span className="font-mono text-[10px] text-(--demo-muted)">35 BITS</span>
              </div>
              <div className="px-3 py-3 sm:px-4">
                <div className="flex items-center justify-between px-2 pb-1.5 font-mono text-[9px] uppercase tracking-wider text-(--demo-muted)">
                  <span>Row</span><span>Pattern</span><span>Index</span>
                </div>
                <div className="grid gap-0.5 font-mono text-sm tabular-nums">
                  {Array.from({ length: CELL_H }, (_, y) => (
                    <div key={y} className={`flex items-center justify-between gap-2 px-2 py-1 ${row === y ? "bg-(--craft-accent-soft)" : ""}`}>
                      <span className="w-8 text-[10px] text-(--demo-muted)">{y + 1}</span>
                      <span className="flex gap-1">
                        {[...glyph.slice(y * CELL_W, (y + 1) * CELL_W)].map((bit, x) => (
                          <span key={x} className={selected === y * CELL_W + x ? "font-bold text-(--craft-accent)" : ""}>{bit}</span>
                        ))}
                      </span>
                      <span className="w-11 text-right text-[10px] text-(--demo-muted)">{y * CELL_W}–{y * CELL_W + CELL_W - 1}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-4 text-(--demo-muted)">Read each row left to right, then move down.</p>
              </div>
              <div className="border-t border-(--demo-border) bg-(--demo-bar) px-4 py-3">
                <span className="block font-mono text-[9px] uppercase tracking-wider text-(--demo-muted)">Complete 35-character string</span>
                <code className="mt-1 block break-all font-mono text-xs leading-5 text-(--demo-ink)">{glyph}</code>
              </div>
            </div>

            <div className="border border-(--demo-border) bg-(--demo-bg) p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-(--demo-muted)">03 / Find one light</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-(--demo-ink)">
                <span className="border border-(--demo-border) bg-(--demo-bar) px-2 py-1">string[{selected}] = {glyph[selected]}</span>
                <span aria-hidden="true" className="text-(--demo-muted)">→</span>
                <span className="border border-(--demo-border) bg-(--demo-bar) px-2 py-1">row {row + 1}, col {column + 1}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-(--demo-muted)">{selected} ÷ 5 = {row} complete rows with {column} left over. This LED is <strong className="text-(--demo-ink)">{glyph[selected] === "1" ? "on" : "off"}</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </CraftFrame>
  );
}

export function WorldClockBitmapOutcome() {
  return (
    <CraftFrame label="Repeat the tile" meta="World clock board">
      <div className="surface-grid p-5 sm:p-8">
        <div className="rounded-xl border border-white/10 bg-black px-3 py-6 sm:px-5 sm:py-7" style={{ containerType: "inline-size" }}>
          <div aria-hidden="true"><LedMatrix lines={SAMPLE} /></div>
          <p className="sr-only">19:45 New York City. 08:45 Tokyo. 05:15 New Delhi.</p>
        </div>
      </div>
    </CraftFrame>
  );
}
