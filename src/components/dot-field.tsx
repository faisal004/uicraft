"use client";

import { useEffect, useRef } from "react";

// Ambient ASCII field inspired by creative-ui Portrait Reveal (domain-warped FBM).
// https://www.creative-ui.dev/c/portrait-reveal
const ASCII_RAMP = [" ", ".", ":", "-", "=", "+", "*", "%", "@"] as const;
const CELL = 13;

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

function field(u: number, v: number, t: number) {
  const driftX = Math.sin(t * 0.05) * 1.3;
  const driftY = Math.cos(t * 0.04) * 1.3;
  const qX = fbm(u + t * 0.012, v + t * 0.012);
  const qY = fbm(u + 3.1 + t * 0.009, v + 1.7 + t * 0.009);
  const rX = fbm(u + 3 * qX + 1.2 + driftX, v + 3 * qY + 7.3 + driftY);
  const rY = fbm(u + 3 * qX + 4.8 + driftX, v + 3 * qY + 2.1 + driftY);
  return Math.min(1, Math.max(0, fbm(u + 3 * rX, v + 3 * rY)));
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

export function DotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let started = 0;
    let running = false;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (now: number) => {
      if (!running) return;
      if (!started) started = now;
      const t = motion.matches ? 0 : (now - started) / 1000;

      context.clearRect(0, 0, width, height);
      context.font = `500 ${CELL}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      const cols = Math.ceil(width / CELL);
      const rows = Math.ceil(height / CELL);
      const aspect = width / Math.max(height, 1);
      const scaleX = aspect * 2.4;
      const scaleY = 2.4;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = (col + 0.5) * CELL;
          const y = (row + 0.5) * CELL;
          const value = field((x / width) * scaleX, (y / height) * scaleY, t);
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
      if (!motion.matches) frame = requestAnimationFrame(paint);
    };

    const start = () => {
      if (running || !isDark()) return;
      running = true;
      started = 0;
      resize();
      frame = requestAnimationFrame(paint);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
    };

    const syncTheme = () => {
      if (isDark()) start();
      else stop();
    };

    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const onMotionChange = () => {
      if (!running) return;
      cancelAnimationFrame(frame);
      started = 0;
      frame = requestAnimationFrame(paint);
    };

    syncTheme();
    window.addEventListener("resize", resize);
    motion.addEventListener("change", onMotionChange);

    return () => {
      stop();
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      motion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 hidden size-full dark:block"
    />
  );
}
