"use client";

import { useEffect, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { playClick } from "@/lib/click";

import { animations } from "./bitmap-animations";
import type { DrawAnimation } from "./bitmap-animations/types";

const DISPLAY_SIZE = 768;
const RESOLUTIONS = [32, 64, 128] as const;
type Resolution = (typeof RESOLUTIONS)[number];

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
)}")`;

type Finish = {
  name: string;
  swatch: string;
  lit: string;
  mid: string;
  body: string;
  deep: string;
  base: string;
  wellTop: string;
  wellBottom: string;
  key: [string, string, string];
  menu: string;
};

const FINISHES: Finish[] = [
  { name: "Black", swatch: "#2a2a2a", lit: "#6e6e6e", mid: "#3c3c3c", body: "#2a2a2a", deep: "#1c1c1c", base: "#121212", wellTop: "#050505", wellBottom: "#242424", key: ["#4a4a4a", "#2e2e2e", "#1a1a1a"], menu: "#1a1a1a" },
  { name: "Orange", swatch: "#ff4c1a", lit: "#ff8a52", mid: "#ff4e1c", body: "#e83a12", deep: "#c42c0c", base: "#8e220c", wellTop: "#120806", wellBottom: "#4a1c12", key: ["#ff5a2a", "#d63612", "#9a240c"], menu: "#3a140e" },
  { name: "Blue", swatch: "#4e6c84", lit: "#7b94a6", mid: "#4e6c84", body: "#34556c", deep: "#243e54", base: "#183044", wellTop: "#060d14", wellBottom: "#1b3144", key: ["#45627a", "#2a455c", "#1a3348"], menu: "#152a3c" },
  { name: "Green", swatch: "#3f7a56", lit: "#8aab96", mid: "#4f7a5e", body: "#365844", deep: "#243c2e", base: "#18281e", wellTop: "#07110c", wellBottom: "#1c3326", key: ["#4d735c", "#2c4a38", "#1a3024"], menu: "#1a2e24" },
  { name: "Red", swatch: "#a33b3b", lit: "#c48a8a", mid: "#8a4545", body: "#6a3030", deep: "#4a2020", base: "#341616", wellTop: "#120808", wellBottom: "#3a1c1c", key: ["#8a4545", "#5c2c2c", "#3a1a1a"], menu: "#2e1818" },
];

const DEFAULT_FINISH = FINISHES[0];

const SHELL_SHADOW = [
  "inset 0 1px 0 rgba(255,255,255,0.55)",
  "inset 0 -3px 6px rgba(0,0,0,0.42)",
  "0 1px 0 rgba(0,0,0,0.45)",
  "0 22px 40px rgba(0,0,0,0.42)",
  "0 4px 10px rgba(0,0,0,0.28)",
].join(", ");

function shellPaint(finish: Finish) {
  return {
    backgroundColor: finish.base,
    backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.16), transparent 14%), linear-gradient(165deg, ${finish.lit} 0%, ${finish.mid} 7%, ${finish.body} 20%, ${finish.deep} 52%, ${finish.base} 100%)`,
    boxShadow: SHELL_SHADOW,
  };
}

function wellPaint(finish: Finish) {
  return {
    background: `linear-gradient(180deg, ${finish.wellTop} 0%, ${finish.wellBottom} 100%)`,
    boxShadow:
      "inset 0 8px 14px rgba(0,0,0,0.75), inset 0 -1px 0 rgba(255,255,255,0.2), 0 1px 0 rgba(255,255,255,0.08)",
  };
}

function keyPaint(finish: Finish) {
  return {
    backgroundImage: `linear-gradient(180deg, ${finish.key[0]} 0%, ${finish.key[1]} 42%, ${finish.key[2]} 100%)`,
  };
}

const keyClass =
  "h-9 w-full rounded-md border border-black/40 px-2.5 font-mono text-[11px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-2px_4px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.4)] transition-[transform,box-shadow,filter] duration-150 ease-out hover:brightness-110 [&_svg]:text-white/70 focus-visible:border-white/40 focus-visible:ring-white/30 active:translate-y-px active:scale-[0.99] motion-reduce:transition-none";

const menuItemClass =
  "focus:bg-white/12 focus:text-white! data-highlighted:bg-white/12 data-highlighted:text-white! focus:**:text-white!";

export function BitmapDevice({ preview = false }: { preview?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(animations[0].id);
  const [resolution, setResolution] = useState<Resolution>(64);
  const [shape, setShape] = useState<"round" | "square">("round");
  const [finishName, setFinishName] = useState(DEFAULT_FINISH.name);
  const [error, setError] = useState<string | null>(null);
  const selected = animations.find((item) => item.id === scene) ?? animations[0];
  const finish = FINISHES.find((item) => item.name === finishName) ?? DEFAULT_FINISH;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;

    const bitmap = document.createElement("canvas");
    bitmap.width = bitmap.height = resolution;
    const bitmapContext = bitmap.getContext("2d");
    if (!bitmapContext) return;

    const cell = DISPLAY_SIZE / resolution;
    const mask = document.createElement("canvas");
    mask.width = mask.height = cell;
    const maskContext = mask.getContext("2d");
    if (!maskContext) return;
    maskContext.fillStyle = "#fff";
    if (shape === "round") {
      maskContext.beginPath();
      maskContext.arc(cell / 2, cell / 2, cell * 0.42, 0, Math.PI * 2);
      maskContext.fill();
    } else {
      maskContext.fillRect(cell * 0.07, cell * 0.07, cell * 0.86, cell * 0.86);
    }
    const pattern = context.createPattern(mask, "repeat");

    let active = true;
    let request = 0;
    let started = 0;
    let previous = -1;
    let render: DrawAnimation | null = null;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const paint = (frame: number) => {
      if (!render) return;
      bitmapContext.clearRect(0, 0, resolution, resolution);
      render(bitmapContext, resolution, frame);
      context.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
      context.imageSmoothingEnabled = false;
      context.drawImage(bitmap, 0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
      if (pattern) {
        context.globalCompositeOperation = "destination-in";
        context.fillStyle = pattern;
        context.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
        context.globalCompositeOperation = "source-over";
      }
    };
    const tick = (now: number) => {
      if (!started) started = now;
      const frame = Math.floor((now - started) / 85);
      if (frame !== previous) {
        paint(frame);
        previous = frame;
      }
      request = requestAnimationFrame(tick);
    };
    const syncMotion = () => {
      cancelAnimationFrame(request);
      started = 0;
      previous = -1;
      if (!render) return;
      if (preview || motion.matches) paint(0);
      else request = requestAnimationFrame(tick);
    };

    motion.addEventListener("change", syncMotion);
    selected.load().then((draw) => {
      if (!active) return;
      render = draw;
      syncMotion();
    }).catch(() => {
      if (active) setError("This animation could not load.");
    });

    return () => {
      active = false;
      cancelAnimationFrame(request);
      motion.removeEventListener("change", syncMotion);
    };
  }, [selected, resolution, shape, preview]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
      <div className="relative min-w-0 w-full max-w-[600px]">
        <div
          className="relative isolate overflow-hidden rounded-[12px] border border-black/70 p-[11px] text-white sm:p-[15px]"
          style={shellPaint(finish)}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-80 mix-blend-overlay"
            style={{ backgroundImage: GRAIN, backgroundSize: "180px 180px" }}
          />

          <div className="relative">
            <div style={wellPaint(finish)} className="rounded-[3px] p-[3px]">
              <div className="overflow-hidden rounded-[2px] border border-black/70 bg-black">
                <canvas
                  ref={canvasRef}
                  width={DISPLAY_SIZE}
                  height={DISPLAY_SIZE}
                  role="img"
                  aria-label={`${selected.label} animation on a ${resolution} by ${resolution} LED display with ${shape} pixels`}
                  className="block aspect-square w-full"
                />
              </div>
            </div>

            {!preview && (
              <div className="relative mt-3 grid gap-2 px-0.5 pb-0.5">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="grid min-w-0 gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">Animation</span>
                    <Select
                      value={scene}
                      onValueChange={(value) => {
                        if (value === null) return;
                        setScene(value);
                        setError(null);
                      }}
                    >
                      <SelectTrigger aria-label="Animation" style={keyPaint(finish)} className={keyClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: finish.menu }} className="border border-white/15 text-white ring-white/15">
                        {animations.map((item) => (
                          <SelectItem key={item.id} value={item.id} className={menuItemClass}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid min-w-0 gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">Resolution</span>
                    <Select
                      value={String(resolution)}
                      onValueChange={(value) => {
                        if (value !== null) setResolution(Number(value) as Resolution);
                      }}
                    >
                      <SelectTrigger aria-label="Resolution" style={keyPaint(finish)} className={keyClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: finish.menu }} className="border border-white/15 text-white ring-white/15">
                        {RESOLUTIONS.map((value) => (
                          <SelectItem key={value} value={String(value)} className={menuItemClass}>
                            {value} × {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid min-w-0 gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">Pixel shape</span>
                    <Select
                      value={shape}
                      onValueChange={(value) => {
                        if (value === "round" || value === "square") setShape(value);
                      }}
                    >
                      <SelectTrigger aria-label="Pixel shape" style={keyPaint(finish)} className={keyClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: finish.menu }} className="border border-white/15 text-white ring-white/15">
                        <SelectItem value="round" className={menuItemClass}>Round</SelectItem>
                        <SelectItem value="square" className={menuItemClass}>Square</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="font-mono text-xs text-red-300">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!preview && (
        <div role="radiogroup" aria-label="Device color" className="flex shrink-0 flex-row gap-3 sm:flex-col">
          {FINISHES.map((item) => {
            const active = item.name === finish.name;
            return (
              <button
                key={item.name}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={item.name}
                onClick={() => {
                  playClick();
                  setFinishName(item.name);
                }}
                style={{ backgroundColor: item.swatch }}
                className={`size-4 rounded-full border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(0,0,0,0.4)] outline-none transition-transform duration-150 ease-out hover:scale-110 focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none ${
                  active ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-(--craft-page)" : ""
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
