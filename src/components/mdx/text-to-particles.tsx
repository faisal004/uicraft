"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CraftFrame, RangeControl } from "@/components/mdx/craft-controls";

type Stage = "text" | "targets" | "scatter" | "animate";

type Particle = {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  delayMs: number;
  travelMs: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => 1 - Math.pow(1 - value, 3);
const random = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43_758.5453;
  return value - Math.floor(value);
};

export function TextToParticles({
  text = "SNAP",
  sampleGap = 1,
  particleSize = 2.1,
  duration = 3_500,
  stage = "animate",
  compact = false,
  replay = 0,
}: {
  text?: string;
  sampleGap?: number;
  particleSize?: number;
  duration?: number;
  stage?: Stage;
  compact?: boolean;
  replay?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const message = text.trim().slice(0, 24) || "SNAP";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let elapsed = 0;
    let lastTime = performance.now();
    let visible = true;
    let font = "800 20px system-ui, sans-serif";

    const rebuild = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const mask = document.createElement("canvas");
      mask.width = Math.max(1, Math.round(width));
      mask.height = Math.max(1, Math.round(height));
      const maskContext = mask.getContext("2d");
      if (!maskContext) return;

      maskContext.fillStyle = "white";
      maskContext.textAlign = "center";
      maskContext.textBaseline = "middle";
      let fontSize = Math.min(140, height * 0.3, width * 0.18);
      font = `800 ${fontSize}px system-ui, sans-serif`;
      maskContext.font = font;
      while (maskContext.measureText(message).width > width * 0.82 && fontSize > 20) {
        fontSize -= 2;
        font = `800 ${fontSize}px system-ui, sans-serif`;
        maskContext.font = font;
      }
      maskContext.fillText(message, width / 2, height / 2);

      const pixels = maskContext.getImageData(0, 0, mask.width, mask.height).data;
      const targets: Array<[number, number]> = [];
      for (let y = 0; y < mask.height; y += sampleGap) {
        for (let x = 0; x < mask.width; x += sampleGap) {
          if (pixels[(y * mask.width + x) * 4 + 3] > 120) targets.push([x, y]);
        }
      }

      const maxParticles = compact ? 4_500 : width < 640 ? 7_000 : 20_000;
      const stride = Math.max(1, Math.ceil(targets.length / maxParticles));
      particles = targets
        .filter((_, index) => index % stride === 0)
        .map(([targetX, targetY], index) => {
          const freeX = random(index + 1) > 0.5;
          const side = random(index + 2_003) > 0.5 ? 1 : -1;
          return {
            startX: freeX
              ? targetX + (random(index + 4_019) * 4 - 2) * width
              : targetX + side * (width + random(index + 6_023) * width),
            startY: freeX
              ? targetY + side * (height + random(index + 8_029) * height)
              : targetY + (random(index + 10_037) * 4 - 2) * height,
            targetX,
            targetY,
            delayMs:
              duration *
              ((targetX / Math.max(width, 1)) * 0.22 + random(index + 12_043) * 0.11),
            travelMs: duration * (0.22 + random(index + 14_057) * 0.45),
          };
        });
    };

    const draw = (time: number) => {
      elapsed += Math.min(time - lastTime, 32);
      lastTime = time;
      const hold = 1_500;
      const cycle = elapsed % (duration * 2 + hold + 500);
      const formationTime = reducedMotion || stage === "targets"
        ? duration
        : stage === "scatter"
          ? duration * 0.2
          : cycle < duration
            ? cycle
            : cycle < duration + hold
              ? duration
              : cycle < duration * 2 + hold
                ? duration - (cycle - duration - hold)
                : 0;

      context.clearRect(0, 0, width, height);
      if (stage === "text") {
        context.font = font;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "#f7f7f4";
        context.fillText(message, width / 2, height / 2);
        return;
      }
      context.fillStyle = "#f7f7f4";
      context.globalAlpha = 0.18 + ease(formationTime / duration) * 0.82;
      context.beginPath();

      for (const particle of particles) {
        const localProgress = ease(
          clamp((formationTime - particle.delayMs) / particle.travelMs),
        );
        const x = particle.startX + (particle.targetX - particle.startX) * localProgress;
        const y = particle.startY + (particle.targetY - particle.startY) * localProgress;
        context.rect(x, y, particleSize, particleSize);
      }

      context.fill();
      context.globalAlpha = 1;
      if (stage === "animate" && !reducedMotion && visible) {
        frame = requestAnimationFrame(draw);
      }
    };

    const requestDraw = () => {
      cancelAnimationFrame(frame);
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    };
    const resizeObserver = new ResizeObserver(() => {
      rebuild();
      if (visible) requestDraw();
    });
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) requestDraw();
    });

    rebuild();
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    requestDraw();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [compact, duration, message, particleSize, replay, sampleGap, stage]);

  return (
    <div
      className={`relative overflow-hidden border border-white/10 bg-[#090a0b] ${compact ? "h-52" : "h-[30rem]"}`}
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
      <span className="sr-only">Particles converge to form the text {message}.</span>
    </div>
  );
}

export function TextToParticlesDemo() {
  return (
    <CraftFrame label="Text to particles" meta="Canvas 2D">
      <TextToParticles />
    </CraftFrame>
  );
}

export function TextToParticlesPlayground() {
  const [text, setText] = useState("SNAP");
  const [sampleGap, setSampleGap] = useState(1);
  const [particleSize, setParticleSize] = useState(2.1);
  const [duration, setDuration] = useState(3_500);
  const [replay, setReplay] = useState(0);

  const reset = () => {
    setText("SNAP");
    setSampleGap(1);
    setParticleSize(2.1);
    setDuration(3_500);
    setReplay((value) => value + 1);
  };

  return (
    <CraftFrame label="Playground" meta="Particle controls">
      <div className="border-b border-[var(--demo-border)]">
        <TextToParticles
          text={text}
          sampleGap={sampleGap}
          particleSize={particleSize}
          duration={duration}
          replay={replay}
          compact
        />
      </div>
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
          <label className="grid min-w-0 gap-2 text-xs text-[var(--demo-muted)]">
            <span className="font-heading">Text</span>
            <input
              value={text}
              maxLength={24}
              onChange={(event) => setText(event.target.value)}
              className="h-9 min-w-0 border border-[var(--demo-border)] bg-[var(--demo-bg)] px-3 text-sm text-[var(--demo-ink)] outline-none focus:ring-2 focus:ring-[#1736f5]/20"
            />
          </label>
          <button
            type="button"
            onClick={() => setReplay((value) => value + 1)}
            className="h-9 border border-[var(--demo-ink)] bg-[var(--demo-ink)] px-3 text-xs text-[var(--demo-bg)]"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center gap-1.5 border border-[var(--demo-border)] px-3 text-xs text-[var(--demo-muted)] hover:bg-[var(--demo-bar)]"
          >
            <RotateCcw className="size-3" aria-hidden="true" /> Reset
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <RangeControl label="Sample gap" value={sampleGap} min={1} max={5} step={1} unit="px" onChange={setSampleGap} />
          <RangeControl label="Particle size" value={particleSize} min={1} max={4} step={0.1} unit="px" onChange={setParticleSize} />
          <RangeControl label="Formation" value={duration} min={1_000} max={6_000} step={100} unit="ms" onChange={setDuration} />
        </div>
      </div>
    </CraftFrame>
  );
}

export function TextToParticlesStep({ step }: { step: number | string }) {
  const current = Number(step);
  const stages: Stage[] = ["text", "targets", "scatter", "animate"];
  const labels = ["Draw the word", "Sample the pixels", "Scatter the particles", "Animate the return"];

  return (
    <CraftFrame label={`Step ${current + 1} · ${labels[current] ?? "Canvas"}`}>
      <TextToParticles stage={stages[current] ?? "animate"} compact />
    </CraftFrame>
  );
}

export function TextToParticlesThumbnail() {
  return <TextToParticles stage="targets" compact />;
}
