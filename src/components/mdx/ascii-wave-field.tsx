"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CraftFrame, RangeControl } from "@/components/mdx/craft-controls";
import { cn } from "@/lib/utils";

const ASCII_RAMP = [" ",".",":", "-", "=", "+", "*", "%", "@"] as const;

export type AsciiWaveLayer =
  | "dashes"
  | "hash"
  | "noise"
  | "fbm"
  | "warp"
  | "ascii";

function fract(n: number) {
  return n - Math.floor(n);
}

function hash(x: number, y: number) {
  let px = fract(x * 123.34);
  let py = fract(y * 456.21);
  const d = px * (px + 45.32) + py * (py + 45.32);
  px += d;
  py += d;
  return fract(px * py);
}

function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy * (1 - ux) + (d - b) * ux * uy;
}

function fbm(x: number, y: number) {
  let v = 0;
  let amp = 0.5;
  let px = x;
  let py = y;
  for (let i = 0; i < 4; i++) {
    v += amp * noise(px, py);
    px *= 2.03;
    py *= 2.03;
    amp *= 0.5;
  }
  return v;
}

function warpedField(u: number, v: number, t: number) {
  const driftX = Math.sin(t * 0.05) * 1.3;
  const driftY = Math.cos(t * 0.04) * 1.3;
  const qX = fbm(u + t * 0.012, v + t * 0.012);
  const qY = fbm(u + 3.1 + t * 0.009, v + 1.7 + t * 0.009);
  const rX = fbm(u + 3 * qX + 1.2 + driftX, v + 3 * qY + 7.3 + driftY);
  const rY = fbm(u + 3 * qX + 4.8 + driftX, v + 3 * qY + 2.1 + driftY);
  return Math.min(1, Math.max(0, fbm(u + 3 * rX, v + 3 * rY)));
}

function sample(
  layer: AsciiWaveLayer,
  u: number,
  v: number,
  t: number,
  col: number,
  row: number,
) {
  if (layer === "dashes") return 0.45;
  if (layer === "hash") return hash(col, row);
  if (layer === "noise") return noise(u * 2.4, v * 2.4);
  if (layer === "fbm") return fbm(u * 2.4, v * 2.4);
  return warpedField(u, v, t);
}

export function AsciiWaveField({
  cellSize = 13,
  speed = 1,
  layer = "ascii",
  className,
}: {
  cellSize?: number;
  speed?: number;
  layer?: AsciiWaveLayer;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let started = 0;
    const cell = Math.max(8, Math.min(28, cellSize));
    const animate = (layer === "warp" || layer === "ascii") && speed > 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (now: number) => {
      if (!started) started = now;
      const t = motion.matches || !animate ? 0 : ((now - started) / 1000) * speed;

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
      context.font = `500 ${cell}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      const aspect = width / Math.max(height, 1);
      const scaleX = aspect * 2.4;
      const scaleY = 2.4;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = (col + 0.5) * cell;
          const y = (row + 0.5) * cell;
          const u = (x / width) * scaleX;
          const v = (y / height) * scaleY;
          const value = sample(layer, u, v, t, col, row);

          if (layer === "dashes") {
            context.globalAlpha = 0.35;
            context.fillStyle = "#b8becc";
            context.fillText("-", x, y);
            continue;
          }

          if (layer === "hash" || layer === "noise" || layer === "fbm") {
            if (value < 0.2) continue;
            context.globalAlpha = 0.12 + value * 0.55;
            context.fillStyle = value > 0.65 ? "#ffffff" : "#b8becc";
            context.fillText(value > 0.55 ? "=" : ".", x, y);
            continue;
          }

          if (layer === "warp") {
            if (value < 0.2) continue;
            context.globalAlpha = 0.12 + value * 0.6;
            context.fillStyle = value > 0.65 ? "#ffffff" : "#b8becc";
            context.fillText(value > 0.55 ? "+" : "-", x, y);
            continue;
          }

          const level = Math.min(
            ASCII_RAMP.length - 1,
            Math.max(0, Math.round(value * (ASCII_RAMP.length - 1))),
          );
          const glyph = ASCII_RAMP[level];
          if (glyph === " ") continue;
          const density = level / (ASCII_RAMP.length - 1);
          const ridge = density * density;
          context.fillStyle = ridge > 0.35 ? "#ffffff" : "#b8becc";
          context.globalAlpha = 0.05 + ridge * 0.78;
          context.fillText(glyph, x, y);
        }
      }

      context.globalAlpha = 1;
      if (animate && !motion.matches) frame = requestAnimationFrame(paint);
    };

    const restart = () => {
      cancelAnimationFrame(frame);
      started = 0;
      resize();
      frame = requestAnimationFrame(paint);
    };

    restart();
    window.addEventListener("resize", resize);
    motion.addEventListener("change", restart);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      motion.removeEventListener("change", restart);
    };
  }, [cellSize, speed, layer]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("block size-full", className)}
    />
  );
}

export function AsciiWaveFieldDemo() {
  return (
    <CraftFrame label="Ambient field" meta="ASCII · FBM">
      <div className="relative h-72 w-full overflow-hidden bg-black sm:h-80">
        <AsciiWaveField />
        <span className="sr-only">
          Animated ASCII characters forming drifting wave clouds on a black background.
        </span>
      </div>
    </CraftFrame>
  );
}

export function AsciiWaveFieldPlayground() {
  const [cellSize, setCellSize] = useState(13);
  const [speed, setSpeed] = useState(1);

  const reset = () => {
    setCellSize(13);
    setSpeed(1);
  };

  return (
    <CraftFrame label="Playground" meta="Cell size · Speed">
      <div className="relative h-64 w-full overflow-hidden border-b border-(--demo-border) bg-black sm:h-72">
        <AsciiWaveField cellSize={cellSize} speed={speed} />
      </div>
      <div className="grid gap-5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-(--demo-ink)">Field controls</p>
            <p className="mt-0.5 text-xs text-(--demo-muted)">
              Tune the lattice and how fast the warped field drifts.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-8 items-center gap-1.5 border border-(--demo-border) bg-(--demo-bg) px-2.5 text-[11px] font-medium text-(--demo-muted) outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-(--demo-bar) hover:text-(--demo-ink) focus-visible:ring-2 focus-visible:ring-[#1736f5]/25 active:scale-[0.97]"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Reset
          </button>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <RangeControl
            label="Cell size"
            value={cellSize}
            min={8}
            max={24}
            step={1}
            unit="px"
            onChange={setCellSize}
          />
          <RangeControl
            label="Speed"
            value={speed}
            min={0}
            max={2.5}
            step={0.1}
            unit="×"
            decimals={1}
            onChange={setSpeed}
          />
        </div>
      </div>
    </CraftFrame>
  );
}

const STEP_META = [
  { label: "Lattice", layer: "dashes" as const },
  { label: "Hash", layer: "hash" as const },
  { label: "Value noise", layer: "noise" as const },
  { label: "FBM", layer: "fbm" as const },
  { label: "Domain warp", layer: "warp" as const },
  { label: "ASCII ramp", layer: "ascii" as const },
];

export function AsciiWaveFieldStep({ step }: { step: number | string }) {
  const current = Math.min(STEP_META.length - 1, Math.max(0, Number(step)));
  const meta = STEP_META[current];

  return (
    <CraftFrame label={`Stage ${String(current + 1).padStart(2, "0")}`} meta={meta.label}>
      <div className="relative h-56 w-full overflow-hidden bg-black sm:h-64">
        <AsciiWaveField layer={meta.layer} cellSize={14} speed={1} />
      </div>
    </CraftFrame>
  );
}
