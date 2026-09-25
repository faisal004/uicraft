"use client";

import { RotateCcw } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { CraftFrame, RangeControl } from "@/components/mdx/craft-controls";
import { cn } from "@/lib/utils";

const COLORS = ["#4ade80", "#fb923c", "#f87171", "#60a5fa", "#f8fafc"] as const;

const palette = [
  { name: "Green", value: "#4ade80" },
  { name: "Orange", value: "#fb923c" },
  { name: "Red", value: "#f87171" },
  { name: "Blue", value: "#60a5fa" },
  { name: "White", value: "#f8fafc" },
] as const;

type DotShape = "circle" | "square" | "diamond";

type DotMatrixTickerProps = {
  text: string;
  speed?: number;
  steps?: number;
  color?: string;
  glow?: number;
  dotShape?: DotShape;
  dotSize?: number;
  dotSpacing?: number;
  className?: string;
};

type TickerStyle = CSSProperties & {
  "--ticker-color": string;
  "--ticker-duration": string;
  "--ticker-steps": number;
  "--ticker-glow-shadow": string;
};

function DotMatrixBoundary({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 max-w-full overflow-x-clip contain-[inline-size]">
      {children}
    </div>
  );
}

export function DotMatrixTicker({
  text,
  speed = 1.5,
  steps = 200,
  color,
  glow = 1,
  dotShape = "circle",
  dotSize = 3,
  dotSpacing = 1,
  className,
}: DotMatrixTickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(12);
  const [colorIndex, setColorIndex] = useState(0);
  const displayText = `${text.trim().toUpperCase() || "DOT MATRIX TICKER"} `;

  const updateDuration = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const distance = track.scrollWidth / 2;
    const normalizedSpeed = Math.min(Math.max(speed, 0), 10);
    if (normalizedSpeed === 0) return;

    setDuration(distance / (normalizedSpeed * 100));
  }, [speed]);

  useEffect(() => {
    updateDuration();
    const track = trackRef.current;
    if (!track) return;

    const observer = new ResizeObserver(updateDuration);
    observer.observe(track);
    return () => observer.disconnect();
  }, [displayText, updateDuration]);

  const canChangeColor = color === undefined;
  const currentColor = color ?? COLORS[colorIndex];
  const glowStrength = Math.min(Math.max(glow, 0), 3);
  const glowShadow =
    glowStrength === 0
      ? "none"
      : `0 0 ${4 * glowStrength}px currentColor, 0 0 ${9 * glowStrength}px currentColor, 0 0 ${16 * glowStrength}px currentColor`;
  const size = Math.min(Math.max(dotSize, 1), 6);
  const spacing = Math.min(Math.max(dotSpacing, 0.5), 4);
  const cell = size + spacing;
  const center = size / 2;
  const masks: Record<DotShape, string> = {
    circle: `radial-gradient(circle at ${center}px ${center}px, transparent 0 ${center}px, #000 ${center + 0.2}px)`,
    square: `conic-gradient(from 90deg at ${size}px ${size}px, transparent 25%, #000 0)`,
    diamond:
      "linear-gradient(45deg, #000 0 32%, transparent 32% 68%, #000 68%), linear-gradient(-45deg, #000 0 32%, transparent 32% 68%, #000 68%)",
  };

  const cycleColor = () => {
    if (canChangeColor) {
      setColorIndex((current) => (current + 1) % COLORS.length);
    }
  };

  return (
    <div
      role={canChangeColor ? "button" : "img"}
      tabIndex={canChangeColor ? 0 : undefined}
      aria-label={
        canChangeColor
          ? `Ticker displaying “${text}”. Activate to change its color.`
          : `Ticker displaying “${text}”.`
      }
      onClick={cycleColor}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          cycleColor();
        }
      }}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-[inset_0_0_16px_rgba(0,0,0,0.9),0_8px_30px_rgba(0,0,0,0.35)] outline-none",
        "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        canChangeColor &&
          "cursor-pointer transition-transform duration-150 ease-out active:scale-[0.99]",
        className,
      )}
      style={
        {
          "--ticker-color": currentColor,
          "--ticker-duration": `${duration}s`,
          "--ticker-steps": Math.max(1, Math.round(steps)),
          "--ticker-glow-shadow": glowShadow,
        } as TickerStyle
      }
    >
      <div className="relative overflow-hidden mask-[linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),transparent_35%,transparent_65%,rgba(255,255,255,0.08))]" />
        <div className="pointer-events-none absolute top-[-80%] left-[-10%] z-20 h-[220%] w-full skew-x-[-55deg] bg-[linear-gradient(10deg,transparent_35%,rgba(255,255,255,0.16),transparent_65%)] blur-xl" />

        <div className="relative py-3 sm:py-4">
          <div
            ref={trackRef}
            aria-hidden="true"
            className={cn(
              "flex w-max animate-dot-matrix-ticker whitespace-nowrap text-(--ticker-color) will-change-transform motion-reduce:animate-none",
              speed <= 0 && "paused",
            )}
          >
            {[0, 1].map((copy) => (
              <span
                key={copy}
                className="pr-8 font-mono text-3xl font-medium leading-none tracking-[0.08em] text-shadow-(--ticker-glow-shadow) sm:text-4xl"
              >
                {displayText}
              </span>
            ))}
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 bg-black"
            style={{
              maskImage: masks[dotShape],
              WebkitMaskImage: masks[dotShape],
              maskSize: `${cell}px ${cell}px`,
              WebkitMaskSize: `${cell}px ${cell}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function DotMatrixTickerDemo() {
  return (
    <DotMatrixBoundary>
      <CraftFrame
        label="Display online"
        meta="DM–01"
        leading={
          <span className="size-2 bg-emerald-400 shadow-[0_0_8px_rgb(74_222_128/0.7)]" />
        }
      >
        <div className="surface-grid flex min-h-72 min-w-0 max-w-full items-center overflow-hidden p-5 sm:p-8">
          <DotMatrixTicker text="Dot matrix ticker — built with Tailwind CSS —" speed={1.25} />
        </div>
      </CraftFrame>
    </DotMatrixBoundary>
  );
}

export function DotMatrixTickerPlayground() {
  const [text, setText] = useState("Ship interfaces that feel fast");
  const [speed, setSpeed] = useState(1.5);
  const [glow, setGlow] = useState(1);
  const [dotSize, setDotSize] = useState(3);
  const [spacing, setSpacing] = useState(1);
  const [shape, setShape] = useState<DotShape>("circle");
  const [color, setColor] = useState<string>(palette[0].value);

  const reset = () => {
    setText("Ship interfaces that feel fast");
    setSpeed(1.5);
    setGlow(1);
    setDotSize(3);
    setSpacing(1);
    setShape("circle");
    setColor(palette[0].value);
  };

  return (
    <DotMatrixBoundary>
      <CraftFrame label="Playground" meta="Display controls">
        <div className="surface-grid flex min-h-56 min-w-0 max-w-full items-center overflow-hidden border-b border-(--demo-border) p-5 sm:p-8">
          <DotMatrixTicker
            text={text}
            speed={speed}
            color={color}
            glow={glow}
            dotSize={dotSize}
            dotSpacing={spacing}
            dotShape={shape}
            className="rounded-[4px]"
          />
        </div>
        <div className="grid min-w-0 max-w-full gap-5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-(--demo-ink)">Display controls</p>
              <p className="mt-0.5 text-xs text-(--demo-muted)">Tune the message, matrix, and movement.</p>
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

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="grid min-w-0 gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-(--demo-muted)">
                Message
              </span>
              <input
                value={text}
                maxLength={80}
                onChange={(event) => setText(event.target.value)}
                placeholder="Type a ticker message"
                className="h-10 min-w-0 w-full border border-(--demo-border) bg-(--demo-bg) px-3 text-sm text-(--demo-ink) outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-(--demo-subtle) focus:border-[#181916]/50 focus:ring-2 focus:ring-[#1736f5]/20"
              />
            </label>

            <div className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-(--demo-muted)">
                Color
              </span>
              <div className="flex gap-1.5" role="group" aria-label="Ticker color">
                {palette.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    title={item.name}
                    aria-label={item.name}
                    aria-pressed={color === item.value}
                    onClick={() => setColor(item.value)}
                    className={cn(
                      "size-10 cursor-pointer border-4 border-white outline-none transition-[transform,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[#1736f5]/40 active:scale-95",
                      color === item.value
                        ? "shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_0_2px_#181916]"
                        : "shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_0_1px_rgb(24_25_22/0.15)]",
                    )}
                    style={{ backgroundColor: item.value }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-(--demo-muted)">
              Matrix shape
            </span>
            <div className="grid grid-cols-3 border border-(--demo-border) bg-(--demo-bar) p-1" role="group" aria-label="Dot shape">
              {(["circle", "square", "diamond"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={shape === item}
                  onClick={() => setShape(item)}
                  className={cn(
                    "px-3 py-2 text-xs font-medium capitalize outline-none transition-[background-color,color,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1736f5]/25",
                    shape === item
                      ? "bg-(--demo-bg) text-(--demo-ink) shadow-[0_1px_3px_rgb(24_25_22/0.12)]"
                      : "text-(--demo-muted) hover:text-(--demo-ink)",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <RangeControl label="Speed" value={speed} min={0} max={4} step={0.25} unit="×" decimals={2} onChange={setSpeed} />
            <RangeControl label="Glow" value={glow} min={0} max={3} step={0.1} unit="×" decimals={1} onChange={setGlow} />
            <RangeControl label="Dot size" value={dotSize} min={1} max={6} step={0.25} unit="px" decimals={2} onChange={setDotSize} />
            <RangeControl label="Spacing" value={spacing} min={0.5} max={4} step={0.25} unit="px" decimals={2} onChange={setSpacing} />
          </div>
        </div>
      </CraftFrame>
    </DotMatrixBoundary>
  );
}

export function DotMatrixTickerStep({ step }: { step: number | string }) {
  const current = Number(step);
  const labels = ["Plain text", "Light", "Matrix", "Enclosure"];
  const message = "SHIP INTERFACES THAT FEEL FAST";

  return (
    <CraftFrame label={`Stage ${String(current + 1).padStart(2, "0")}`} meta={labels[current]}>
      <div className="surface-grid flex min-h-48 min-w-0 items-center overflow-hidden p-5 sm:p-8">
        {current === 0 ? (
          <p className="font-mono text-xl font-medium tracking-[0.04em] text-(--demo-ink) sm:text-2xl">
            Ship interfaces that feel fast.
          </p>
        ) : current === 1 ? (
          <div className="relative w-full overflow-hidden border border-zinc-800 bg-black px-0 py-4">
            <p className="whitespace-nowrap font-mono text-3xl font-medium leading-none tracking-[0.08em] text-green-400 text-shadow-[0_0_4px_currentColor,0_0_9px_currentColor,0_0_16px_currentColor]">
              {message}
            </p>
          </div>
        ) : current === 2 ? (
          <div className="relative w-full overflow-hidden border border-zinc-800 bg-black px-0 py-4">
            <p className="whitespace-nowrap font-mono text-3xl font-medium leading-none tracking-[0.08em] text-green-400 text-shadow-[0_0_4px_currentColor,0_0_9px_currentColor,0_0_16px_currentColor]">
              {message}
            </p>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_0_1.45px,#000_1.7px)] bg-size-[4px_4px]"
            />
          </div>
        ) : (
          <DotMatrixTicker
            text="Ship interfaces that feel fast"
            speed={0}
            color="#4ade80"
            className="rounded-[4px]"
          />
        )}
      </div>
    </CraftFrame>
  );
}

export function DotMatrixTickerThumbnail() {
  return (
    <DotMatrixTicker
      text="Dot matrix — Tailwind —"
      speed={1.1}
      color="#4ade80"
      className="pointer-events-none rounded-none"
    />
  );
}
