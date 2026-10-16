"use client";

import { useEffect, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { animations } from "./bitmap-animations";
import type { DrawAnimation } from "./bitmap-animations/types";

const DISPLAY_SIZE = 768;
const RESOLUTIONS = [32, 64, 128] as const;
type Resolution = (typeof RESOLUTIONS)[number];

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
)}")`;

export function BitmapDevice({ preview = false }: { preview?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(animations[0].id);
  const [resolution, setResolution] = useState<Resolution>(64);
  const [shape, setShape] = useState<"round" | "square">("round");
  const [error, setError] = useState<string | null>(null);
  const selected = animations.find((item) => item.id === scene) ?? animations[0];

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
    <div className="mx-auto w-full max-w-[600px]">
      <div
        className="relative isolate overflow-hidden rounded-[12px] border border-black/70 p-[11px] shadow-[inset_0_1px_0_#ffffff55,inset_0_-3px_6px_#0007,0_22px_40px_#0006,0_4px_10px_#0004] sm:p-[15px]"
        style={{ backgroundImage: "linear-gradient(165deg, #646464 0%, #393939 8%, #282828 35%, #1b1b1b 100%)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80 mix-blend-overlay"
          style={{ backgroundImage: GRAIN, backgroundSize: "180px 180px" }}
        />
        <div className="relative rounded-[3px] border-[3px] border-[#090909] bg-[#050b12] shadow-[inset_0_8px_14px_#000b,0_1px_0_#ffffff1f]">
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
        <div className="mt-5 overflow-hidden rounded-lg border border-[#aeb9bf] bg-[#f8faf9] shadow-[0_2px_8px_#1d2a3512]">
          <div className="flex items-center justify-between border-b border-[#d9e0e2] px-4 py-3">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#4a565b]">Display control</span>
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#50605a]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#2aa670] shadow-[0_0_7px_#2aa670]" /> Live
            </span>
          </div>
          <div className="grid sm:grid-cols-3">
            <div className="grid gap-2 border-b border-[#d9e0e2] p-4 sm:border-r sm:border-b-0">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#657279]">Animation</span>
              <Select
                value={scene}
                onValueChange={(value) => {
                  if (value === null) return;
                  setScene(value);
                  setError(null);
                }}
              >
                <SelectTrigger
                  aria-label="Animation"
                  className="h-10 w-full rounded-md border-[#c6d0d3] bg-white px-3 text-[#1d292e] focus-visible:border-[#3155d9] focus-visible:ring-[#3155d9]/40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {animations.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 border-b border-[#d9e0e2] p-4 sm:border-r sm:border-b-0">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#657279]">Resolution</span>
              <Select
                value={String(resolution)}
                onValueChange={(value) => {
                  if (value !== null) setResolution(Number(value) as Resolution);
                }}
              >
                <SelectTrigger
                  aria-label="Resolution"
                  className="h-10 w-full rounded-md border-[#c6d0d3] bg-white px-3 text-[#1d292e] focus-visible:border-[#3155d9] focus-visible:ring-[#3155d9]/40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} × {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 p-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#657279]">Pixel shape</span>
              <Select
                value={shape}
                onValueChange={(value) => {
                  if (value === "round" || value === "square") setShape(value);
                }}
              >
                <SelectTrigger
                  aria-label="Pixel shape"
                  className="h-10 w-full rounded-md border-[#c6d0d3] bg-white px-3 text-[#1d292e] focus-visible:border-[#3155d9] focus-visible:ring-[#3155d9]/40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p role="alert" className="border-t border-[#d9e0e2] px-4 py-3 text-sm text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
