"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";

import { CraftFrame } from "@/components/mdx/craft-controls";
import { playClick } from "@/lib/click";

// Pull cord theme toggle: a light-switch string hanging from the top of the demo. The cord is a
// Verlet rope: a chain of points that each remember where they were one step ago, fall under
// gravity, and are pulled back to a fixed distance from their neighbours. Drag the handle down past
// the trigger point and let go to flip the theme. The rope recoils and swings until it settles.

// The scene is a fixed 200 × 300 SVG drawn at 1 SVG unit per CSS pixel.
const WIDTH = 200;
const HEIGHT = 300;
const ANCHOR = { x: WIDTH / 2, y: 0 };

const POINTS = 12;
const LENGTH = 130; // rest length of the whole cord
const SEGMENT = LENGTH / (POINTS - 1); // rest length between two neighbouring points

const STEP_MS = 1000 / 120; // the simulation always advances in 120 Hz steps
const GRAVITY = 0.12; // px per step²
const DAMPING = 0.985; // share of velocity kept each step
const STIFFNESS = 0.5; // share of a length error fixed per pass
const PASSES = 6; // constraint passes per step

const MAX_STRETCH = 70; // how far past its rest length the cord can be pulled
const TRIGGER = 38; // pull past this and let go to toggle

type Vec = { x: number; y: number };
type Point = { x: number; y: number; px: number; py: number };

// 1 · draw · 2 · move · 3 · constrain · 4 · grab · 5 · toggle
type Stage = 1 | 2 | 3 | 4 | 5;

function createRope(): Point[] {
  return Array.from({ length: POINTS }, (_, i) => {
    const y = ANCHOR.y + i * SEGMENT;
    return { x: ANCHOR.x, y, px: ANCHOR.x, py: y };
  });
}

// What the first render draws. After that, the animation loop writes the path and handle directly,
// and these props never change, so React never puts them back.
const REST = createRope();
const REST_END = REST[REST.length - 1];

// Velocity is not stored: it is the gap between where a point is and where it was.
function integrate(points: Point[]) {
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const vx = (p.x - p.px) * DAMPING;
    const vy = (p.y - p.py) * DAMPING;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + GRAVITY;
  }
}

function pin(p: Point, to: Vec) {
  p.x = p.px = to.x;
  p.y = p.py = to.y;
}

// Push every pair of neighbours back towards SEGMENT apart. The anchor never moves, and while the
// handle is held neither does the last point, so the rope between them has to stretch.
function constrain(points: Point[], grab: Vec | null) {
  const last = points.length - 1;
  for (let pass = 0; pass < PASSES; pass++) {
    pin(points[0], ANCHOR);
    if (grab) pin(points[last], grab);
    for (let i = 1; i <= last; i++) {
      const a = points[i - 1];
      const b = points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const pull = ((distance - SEGMENT) / distance) * STIFFNESS;
      // How much of the fix `a` takes. A pinned point takes none of it.
      const share = i === 1 ? 0 : grab && i === last ? 1 : 0.5;
      a.x += dx * pull * share;
      a.y += dy * pull * share;
      b.x -= dx * pull * (1 - share);
      b.y -= dy * pull * (1 - share);
    }
  }
}

// The handle can't be pulled further than MAX_STRETCH past the cord's rest length.
function clampGrab(to: Vec): Vec {
  const dx = to.x - ANCHOR.x;
  const dy = to.y - ANCHOR.y;
  const distance = Math.hypot(dx, dy) || 1;
  const max = LENGTH + MAX_STRETCH;
  if (distance <= max) return to;
  return { x: ANCHOR.x + (dx / distance) * max, y: ANCHOR.y + (dy / distance) * max };
}

function stretchOf(points: Point[]) {
  const end = points[points.length - 1];
  return Math.hypot(end.x - ANCHOR.x, end.y - ANCHOR.y) - LENGTH;
}

// Reduced motion: no simulation. The cord is a straight line from the anchor to `end`.
function layStraight(points: Point[], end: Vec) {
  points.forEach((p, i) => {
    const t = i / (points.length - 1);
    pin(p, { x: ANCHOR.x + (end.x - ANCHOR.x) * t, y: ANCHOR.y + (end.y - ANCHOR.y) * t });
  });
}

// A smooth curve through the points: each point is a control point, the midpoints are on the curve.
function ropePath(points: Point[]) {
  const n = (value: number) => value.toFixed(1);
  let d = `M ${n(points[0].x)} ${n(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    d += ` Q ${n(a.x)} ${n(a.y)} ${n((a.x + b.x) / 2)} ${n((a.y + b.y) / 2)}`;
  }
  const end = points[points.length - 1];
  return `${d} L ${n(end.x)} ${n(end.y)}`;
}

function isMoving(points: Point[]) {
  return points.some((p) => Math.abs(p.x - p.px) + Math.abs(p.y - p.py) > 0.01);
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function setDark(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    // The theme still changes when storage is unavailable.
  }
}

function PullCordScene({ stage, replayKey = 0 }: { stage: Stage; replayKey?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const handleRef = useRef<SVGGElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);

  const rope = useRef<Point[]>(createRope());
  const grab = useRef<Vec | null>(null);
  const pressStart = useRef<Vec | null>(null);
  const wake = useRef(() => {});
  const reducedMotion = useRef(false);

  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  // Follow the site theme, whichever control changed it.
  const dark = useSyncExternalStore(subscribeToTheme, isDark, () => false);

  const canGrab = stage >= 4;
  const canToggle = stage >= 5;
  const showPoints = stage <= 3;

  useEffect(() => {
    const points = rope.current;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = stage >= 5 && motionQuery.matches;

    // The replay button restarts the earlier steps with a sideways flick of the free end.
    if (stage >= 2 && stage <= 3) {
      points.splice(0, points.length, ...createRope());
      points.forEach((p, i) => (p.px = p.x - 4 * (i / (POINTS - 1))));
    }

    function draw() {
      pathRef.current?.setAttribute("d", ropePath(points));
      const end = points[points.length - 1];
      const before = points[points.length - 2];
      const angle = (Math.atan2(end.y - before.y, end.x - before.x) * 180) / Math.PI - 90;
      handleRef.current?.setAttribute("transform", `translate(${end.x} ${end.y}) rotate(${angle})`);
      points.forEach((p, i) => {
        dotRefs.current[i]?.setAttribute("cx", String(p.x));
        dotRefs.current[i]?.setAttribute("cy", String(p.y));
      });
    }

    let frame = 0;
    let last = 0;
    let owed = 0;
    let still = 0;

    function tick(now: number) {
      // Run as many fixed steps as the elapsed time owes; cap the backlog after a stalled tab.
      owed = Math.min(owed + now - last, STEP_MS * 8);
      last = now;
      if (reducedMotion.current) {
        layStraight(points, grab.current ?? { x: ANCHOR.x, y: ANCHOR.y + LENGTH });
        owed = 0;
      }
      while (owed >= STEP_MS) {
        integrate(points);
        if (stage >= 3) constrain(points, grab.current);
        owed -= STEP_MS;
      }
      // Step 2 has nothing holding the points, so they fall away. Hang a fresh rope once they're gone.
      if (stage === 2 && points[1].y > HEIGHT + 40) {
        points.splice(0, points.length, ...createRope());
      }
      draw();

      // Sleep once the rope has been still for half a second.
      still = grab.current || isMoving(points) ? 0 : still + 1;
      if (still > 30) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    wake.current = () => {
      if (frame || stage === 1) return;
      last = performance.now();
      owed = 0;
      still = 0;
      frame = requestAnimationFrame(tick);
    };

    draw();
    wake.current();
    return () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
  }, [stage, replayKey]);

  function toScene(event: PointerEvent): Vec {
    const box = svgRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * WIDTH,
      y: ((event.clientY - box.top) / box.height) * HEIGHT,
    };
  }

  function setArmedOnce(next: boolean) {
    if (armedRef.current === next) return;
    armedRef.current = next;
    setArmed(next);
    if (next) playClick();
  }

  function toggle() {
    setDark(!isDark());
  }

  // A tap or a key press tugs the cord: kick the lower points downwards, then flip the theme.
  function tug() {
    if (!reducedMotion.current) {
      rope.current.forEach((p, i) => (p.py = p.y - 9 * (i / (POINTS - 1)) ** 2));
    }
    playClick();
    toggle();
    wake.current();
  }

  function onPointerDown(event: PointerEvent<SVGGElement>) {
    if (!canGrab) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pressStart.current = toScene(event);
    grab.current = clampGrab(pressStart.current);
    wake.current();
  }

  function onPointerMove(event: PointerEvent<SVGGElement>) {
    if (!grab.current) return;
    grab.current = clampGrab(toScene(event));
    if (canToggle) setArmedOnce(stretchOf(rope.current) > TRIGGER);
  }

  function onPointerUp(event: PointerEvent<SVGGElement>) {
    if (!grab.current) return;
    const start = pressStart.current!;
    const end = toScene(event);
    grab.current = null;
    pressStart.current = null;
    if (canToggle) {
      if (armedRef.current) toggle();
      else if (Math.hypot(end.x - start.x, end.y - start.y) < 4) tug();
    }
    setArmedOnce(false);
  }

  function onKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (!canToggle || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    tug();
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      className="block overflow-visible text-(--demo-ink)"
      aria-hidden={canToggle ? undefined : true}
    >
      <rect x={ANCHOR.x - 14} y={-4} width={28} height={8} rx={3} fill="currentColor" opacity={0.25} />
      <path
        ref={pathRef}
        d={ropePath(REST)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.75}
      />
      {showPoints
        ? REST.map((p, i) => (
            <circle
              key={i}
              ref={(node) => {
                dotRefs.current[i] = node;
              }}
              cx={p.x}
              cy={p.y}
              r={i === 0 ? 3.5 : 2.5}
              className={i === 0 ? "fill-current" : "fill-[#f97316]"}
            />
          ))
        : null}
      {stage >= 4 ? (
        <g
          ref={handleRef}
          transform={`translate(${REST_END.x} ${REST_END.y})`}
          role={canToggle ? "switch" : undefined}
          aria-checked={canToggle ? dark : undefined}
          aria-label={canToggle ? "Dark theme" : undefined}
          tabIndex={canToggle ? 0 : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="group cursor-grab touch-none outline-none active:cursor-grabbing"
        >
          {/* A bigger invisible circle makes the handle easy to catch with a finger. */}
          <circle cy={12} r={24} fill="transparent" />
          <circle
            cy={12}
            r={17}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="opacity-0 transition-opacity group-focus-visible:opacity-60"
          />
          <rect
            x={-6}
            y={0}
            width={12}
            height={24}
            rx={6}
            fill={armed ? "#f97316" : "currentColor"}
            className="transition-[fill] duration-150"
          />
        </g>
      ) : null}
    </svg>
  );
}

export function PullCordDemo() {
  return (
    <CraftFrame label="Pull cord" meta="SVG · Verlet rope">
      <div className="surface-grid relative flex h-[340px] justify-center overflow-hidden">
        <PullCordScene stage={5} />
        <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center font-mono text-[11px] text-(--demo-subtle)">
          Pull the cord down and let go
        </p>
      </div>
    </CraftFrame>
  );
}

const STEP_LABELS: Record<Stage, string> = {
  1: "Draw the cord",
  2: "Give the points motion",
  3: "Hold them together",
  4: "Grab the handle",
  5: "Pull to toggle",
};

export function PullCordStep({ step }: { step: number | string }) {
  const stage = Number(step) as Stage;
  const [replayKey, setReplayKey] = useState(0);
  const canReplay = stage === 2 || stage === 3;

  return (
    <CraftFrame
      label={`Step ${stage} · ${STEP_LABELS[stage]}`}
      meta={stage >= 4 ? "drag the handle" : undefined}
    >
      <div className="surface-grid relative flex h-[340px] justify-center overflow-hidden">
        <PullCordScene stage={stage} replayKey={replayKey} />
        {canReplay ? (
          <button
            type="button"
            onClick={() => setReplayKey((key) => key + 1)}
            className="absolute bottom-3 right-3 border border-(--demo-border) bg-(--demo-bg) px-3 py-1.5 font-mono text-[11px] text-(--demo-ink) hover:bg-(--demo-bar)"
          >
            Replay
          </button>
        ) : null}
      </div>
    </CraftFrame>
  );
}
