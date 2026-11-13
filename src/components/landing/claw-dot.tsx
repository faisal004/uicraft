"use client";

import { useEffect, useRef, useState } from "react";

import { CLAW_END, clawPose } from "@/components/mdx/svg-claw";

// Scene in viewBox units (500 × 250). The word is "uicraft" with a dotless i.
const BASELINE = 168;
const FONT = 96;
const STEM = { width: 13, height: 47 };
const GAP = 7; // space either side of the stem
const DOT = { size: 13, above: 18, grip: 34, hold: 5, startY: -80 }; // above: gap between the dot centre and the stem top
const END = CLAW_END + 200;

/** The SVG claw technique as a wordmark: a claw drops the dot onto the i. Hover or tap to replay. */
export function ClawDot() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const uRef = useRef<SVGTextElement>(null);
  const craftRef = useRef<SVGTextElement>(null);
  const carriageRef = useRef<SVGGElement>(null);
  const upperRef = useRef<SVGGElement>(null);
  const lowerRef = useRef<SVGGElement>(null);
  const dotRef = useRef<SVGRectElement>(null);
  const frameRef = useRef(0);
  const [layout, setLayout] = useState<{ start: number; stemX: number; craftX: number } | null>(null);

  // Centre the word once the font has loaded and the two text runs can be measured.
  useEffect(() => {
    document.fonts.ready.then(() => {
      const u = uRef.current?.getComputedTextLength() ?? 0;
      const craft = craftRef.current?.getComputedTextLength() ?? 0;
      if (!u || !craft) return;
      const start = (500 - (u + GAP + STEM.width + GAP + craft)) / 2;
      const stemX = start + u + GAP;
      setLayout({ start, stemX, craftX: stemX + STEM.width + GAP });
    });
  }, []);

  const dotX = layout ? layout.stemX + STEM.width / 2 : 0;
  const dotY = BASELINE - STEM.height - DOT.above;

  function paint(time: number) {
    const jointY = dotY - DOT.grip;
    const pose = clawPose(time, 0, jointY - DOT.startY, DOT.hold);
    const y = jointY - pose.offset;
    carriageRef.current?.setAttribute("transform", `translate(${dotX} ${y}) rotate(90) scale(0.62)`);
    upperRef.current?.setAttribute("transform", `rotate(${-pose.angle})`);
    lowerRef.current?.setAttribute("transform", `rotate(${pose.angle})`);
    dotRef.current?.setAttribute("y", String((pose.holding ? y + DOT.grip : dotY) - DOT.size / 2));
  }

  function play() {
    if (frameRef.current) return; // already running
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(END);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const time = Math.min(END, now - started);
      paint(time);
      frameRef.current = time < END ? requestAnimationFrame(tick) : 0;
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (!layout) return;
    paint(0);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        play();
      },
      { threshold: 0.5 },
    );
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
    // Playback reads the measured layout through paint's closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  return (
    <div
      ref={sceneRef}
      onPointerEnter={play}
      onClick={play}
      className="w-full max-w-sm cursor-pointer text-foreground"
    >
      <svg viewBox="0 0 500 250" className="block w-full" role="img" aria-label="A claw drops the dot onto the i of uicraft">
        <g
          fill="currentColor"
          fontFamily="var(--font-geist-sans), Arial, sans-serif"
          fontSize={FONT}
          fontWeight="800"
          letterSpacing="-3"
          opacity={layout ? 1 : 0}
        >
          <text ref={uRef} x={layout?.start ?? 0} y={BASELINE}>u</text>
          <rect x={layout?.stemX ?? 0} y={BASELINE - STEM.height} width={STEM.width} height={STEM.height} rx="1" />
          <text ref={craftRef} x={layout?.craftX ?? 0} y={BASELINE}>craft</text>
        </g>
        {layout ? (
          <>
            <rect ref={dotRef} x={dotX - DOT.size / 2} y={-DOT.size} width={DOT.size} height={DOT.size} rx="1" fill="currentColor" />
            <g
              ref={carriageRef}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              transform={`translate(${dotX} -200)`}
            >
              <path d="M -500 0 H 0" />
              <g ref={upperRef}><path d="M 0 0 L 28 -25 L 56 -7" /></g>
              <g ref={lowerRef}><path d="M 0 0 L 28 25 L 56 7" /></g>
              <circle r="9" fill="var(--craft-muted-surface)" />
            </g>
          </>
        ) : null}
      </svg>
    </div>
  );
}
