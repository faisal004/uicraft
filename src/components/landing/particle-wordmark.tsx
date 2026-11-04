"use client";

import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; vx: number; vy: number; tx: number; ty: number };

const GAP = 2;
const SIZE = 1.6;
const PUSH_RADIUS = 46;

/**
 * Text to Particles, used as a logo: the wordmark is sampled into dots that
 * spring home, and the cursor pushes them aside.
 */
export function ParticleWordmark({ text = "UICraft" }: { text?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let color = "#000";
    const pointer = { x: -9999, y: -9999 };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const style = getComputedStyle(canvas);
      color = style.color;

      // Draw the word once, offscreen, and keep every filled pixel on the grid.
      const mask = document.createElement("canvas");
      mask.width = Math.max(1, Math.round(width));
      mask.height = Math.max(1, Math.round(height));
      const maskContext = mask.getContext("2d");
      if (!maskContext) return;

      let fontSize = height * 0.55;
      const setFont = () => (maskContext.font = `400 ${fontSize}px ${style.fontFamily}`);
      setFont();
      while (maskContext.measureText(text).width > width * 0.88 && fontSize > 12) {
        fontSize -= 2;
        setFont();
      }
      maskContext.textAlign = "center";
      maskContext.textBaseline = "middle";
      maskContext.fillText(text, width / 2, height / 2);

      const pixels = maskContext.getImageData(0, 0, mask.width, mask.height).data;
      const previous = dots;
      dots = [];
      for (let y = 0; y < mask.height; y += GAP) {
        for (let x = 0; x < mask.width; x += GAP) {
          if (pixels[(y * mask.width + x) * 4 + 3] < 128) continue;
          const old = previous[dots.length];
          dots.push({
            x: old?.x ?? (reducedMotion ? x : Math.random() * width),
            y: old?.y ?? (reducedMotion ? y : Math.random() * height),
            vx: 0,
            vy: 0,
            tx: x,
            ty: y,
          });
        }
      }
    };

    const step = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      context.beginPath();

      for (const dot of dots) {
        // Spring toward the letter, then push away from the cursor.
        dot.vx += (dot.tx - dot.x) * 0.06;
        dot.vy += (dot.ty - dot.y) * 0.06;
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < PUSH_RADIUS && distance > 0.01) {
          const force = (1 - distance / PUSH_RADIUS) * 4;
          dot.vx += (dx / distance) * force;
          dot.vy += (dy / distance) * force;
        }
        dot.vx *= 0.78;
        dot.vy *= 0.78;
        dot.x += dot.vx;
        dot.y += dot.vy;
        context.rect(dot.x, dot.y, SIZE, SIZE);
      }

      context.fill();
      if (visible && !reducedMotion) frame = requestAnimationFrame(step);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    };

    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const leave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const resizeObserver = new ResizeObserver(() => {
      build();
      start();
    });
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
      else cancelAnimationFrame(frame);
    });
    // Theme changes swap the ink color.
    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(canvas).color;
      start();
    });

    // Wait for the pixel font so the first sample uses the right glyphs.
    document.fonts.ready.then(() => {
      build();
      start();
      resizeObserver.observe(canvas);
      intersectionObserver.observe(canvas);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, [text]);

  return (
    <div className="relative size-full">
      <canvas ref={canvasRef} aria-hidden="true" className="font-heading size-full text-foreground" />
      <span className="sr-only">The {text} wordmark drawn from particles.</span>
    </div>
  );
}
