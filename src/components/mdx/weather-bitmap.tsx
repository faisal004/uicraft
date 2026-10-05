"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BLANK = Array.from({ length: 7 }, () => "00000");

const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "°": ["01100", "10010", "10010", "01100", "00000", "00000", "00000"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
};

const N = 50;
type Pt = [number, number];

const build = (fn: (x: number, y: number) => boolean) =>
  Array.from({ length: N }, (_, y) =>
    Array.from({ length: N }, (_, x) => (fn(x + 0.5, y + 0.5) ? "1" : "0")).join("")
  );

const inCircle = (x: number, y: number, cx: number, cy: number, r: number) =>
  (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

const segDist = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
};

const inPoly = (x: number, y: number, pts: Pt[]) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const cloud = (x: number, y: number, dy: number) =>
  inCircle(x, y, 16, 30 + dy, 8) ||
  inCircle(x, y, 26, 24 + dy, 11) ||
  inCircle(x, y, 36, 31 + dy, 7) ||
  (x >= 16 && x <= 36 && y >= 31 + dy && y <= 38 + dy);

const rad = (deg: number) => (deg * Math.PI) / 180;

const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = rad(i * 45);
  return [25 + 14 * Math.cos(a), 25 + 14 * Math.sin(a), 25 + 22 * Math.cos(a), 25 + 22 * Math.sin(a)];
});

const DROPS = [
  [14, 36],
  [22, 39],
  [30, 36],
  [38, 39],
];

const BOLT: Pt[] = [
  [27, 34],
  [35, 34],
  [30, 40],
  [36, 40],
  [23, 49],
  [26, 42],
  [20, 42],
];

const FLAKE_SEGS: number[][] = (() => {
  const segs: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const a = rad(i * 60);
    const ex = 25 + 21 * Math.cos(a);
    const ey = 25 + 21 * Math.sin(a);
    segs.push([25, 25, ex, ey]);
    for (const [d, len] of [
      [11, 6],
      [16, 4],
    ]) {
      const bx = 25 + d * Math.cos(a);
      const by = 25 + d * Math.sin(a);
      for (const off of [-60, 60]) {
        const b = rad(i * 60 + off);
        segs.push([bx, by, bx + len * Math.cos(b), by + len * Math.sin(b)]);
      }
    }
  }
  return segs;
})();

const ICONS: Record<string, string[]> = {
  sun: build(
    (x, y) =>
      inCircle(x, y, 25, 25, 10) || SUN_RAYS.some(([ax, ay, bx, by]) => segDist(x, y, ax, ay, bx, by) < 1.4)
  ),
  cloud: build((x, y) => cloud(x, y, 0)),
  rain: build(
    (x, y) =>
      cloud(x, y, -5) || DROPS.some(([cx, y0]) => segDist(x, y, cx, y0, cx - 3, y0 + 8) < 1.2)
  ),
  storm: build((x, y) => cloud(x, y, -5) || inPoly(x, y, BOLT)),
  snow: build(
    (x, y) =>
      inCircle(x, y, 25, 25, 2.2) ||
      FLAKE_SEGS.some(([ax, ay, bx, by]) => segDist(x, y, ax, ay, bx, by) < 1.2)
  ),
};

const ALL: Record<string, string[]> = { ...GLYPHS, ...ICONS };

const CONDITIONS = [
  { name: "Sunny", icon: "sun", temperature: 24, color: "text-amber-300" },
  { name: "Cloudy", icon: "cloud", temperature: 22, color: "text-slate-200" },
  { name: "Rainy", icon: "rain", temperature: 18, color: "text-sky-300" },
  { name: "Stormy", icon: "storm", temperature: 16, color: "text-violet-300" },
  { name: "Snowy", icon: "snow", temperature: -2, color: "text-cyan-200" },
] as const;

type Unit = "C" | "F";

const toUnit = (celsius: number, unit: Unit) =>
  unit === "C" ? celsius : Math.round((celsius * 9) / 5 + 32);

function Bitmap({ glyph, large = false }: { glyph: string; large?: boolean }) {
  const rows = ALL[glyph] ?? BLANK;
  const cols = rows[0].length;

  return (
    <span
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      className={`grid ${
        large ? "w-[clamp(72px,30cqi,190px)] gap-[0.5px]" : "w-[clamp(18px,7cqi,40px)] gap-[3px]"
      }`}
    >
      {rows.join("").split("").map((bit, index) => (
        <span
          key={index}
          style={{
            transitionDelay: `${((index % cols) + Math.floor(index / cols)) * (large ? 6 : 14)}ms`,
          }}
          className={`aspect-square rounded-full transition-[background-color,box-shadow] duration-300 motion-reduce:transition-none ${
            bit === "1"
              ? `bg-current ${large ? "shadow-[0_0_3px_currentColor]" : "shadow-[0_0_6px_currentColor]"}`
              : large
                ? "bg-white/[0.04]"
                : "bg-white/[0.06]"
          }`}
        />
      ))}
    </span>
  );
}

export function WeatherBitmap() {
  const [selected, setSelected] = useState(0);
  const [unit, setUnit] = useState<Unit>("C");
  const weather = CONDITIONS[selected];
  const temp = toUnit(weather.temperature, unit);
  const chars = [...`${temp}°${unit}`];

  return (
    <div style={{ containerType: "inline-size" }} className="mx-auto w-full max-w-xl rounded-[26px] border border-[#587084] bg-gradient-to-b from-[#304c62] via-[#193044] to-[#102236] p-2 text-white shadow-[0_2px_0_#8295a5,0_6px_0_#0b1929,0_26px_55px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.25)]">
      <div className="rounded-[19px] border border-black/60 bg-[radial-gradient(circle_at_80%_15%,#244360_0%,#12283b_40%,#091522_85%)] px-5 pt-5 shadow-[inset_0_3px_15px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)] sm:px-7">
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
          <span>Pixel weather</span>
          <span>Sample data</span>
        </div>

        <p className="sr-only" aria-live="polite">
          {weather.name}, {temp} degrees {unit === "C" ? "Celsius" : "Fahrenheit"}. Sample weather data.
        </p>
        <div className="flex min-h-56 items-center justify-between gap-3 py-5 sm:min-h-64 sm:gap-6">
          <div className="min-w-0">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">Current conditions</p>
            <div aria-hidden="true" className="flex gap-1 text-white sm:gap-1.5">
              {chars.map((character, index) => (
                <Bitmap key={index} glyph={character} />
              ))}
            </div>
            <p className="mt-5 text-xl font-medium tracking-tight sm:text-2xl">{weather.name}</p>
          </div>
          <div aria-hidden="true" className={`${weather.color} shrink-0 transition-colors duration-300 motion-reduce:transition-none`}>
            <Bitmap glyph={weather.icon} large />
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 px-3 pb-2 pt-3">
        <div className="grid gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/60">
          <span>Condition</span>
          <Select value={String(selected)} onValueChange={(value) => value !== null && setSelected(Number(value))}>
            <SelectTrigger aria-label="Condition" className="min-w-32 border-white/25 bg-[#0d2031] text-white hover:bg-[#142c40]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border border-white/15 bg-[#152a3c] text-white ring-white/15">
              {CONDITIONS.map((condition, index) => (
                <SelectItem key={condition.name} value={String(index)} className="focus:bg-white/15 focus:text-white">
                  {condition.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1" role="group" aria-label="Temperature unit">
          {(["C", "F"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={`rounded-md border px-3 py-2 font-mono text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none ${
                unit === u
                  ? "border-white bg-white text-[#0b1624]"
                  : "border-white/20 text-white/65 hover:border-white/60 hover:text-white"
              }`}
            >
              °{u}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
