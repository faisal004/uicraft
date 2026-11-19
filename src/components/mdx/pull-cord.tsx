"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { CraftFrame, RangeControl } from "@/components/mdx/craft-controls";
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
export type Physics = {
  gravity: number; // px per step²: speed added downwards every step
  damping: number; // share of velocity kept each step
  stiffness: number; // share of a length error fixed per pass
  passes: number; // constraint passes per step
};

export const PHYSICS: Physics = { gravity: 0.12, damping: 0.985, stiffness: 0.5, passes: 6 };

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
function integrate(points: Point[], { gravity, damping }: Physics) {
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const vx = (p.x - p.px) * damping;
    const vy = (p.y - p.py) * damping;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + gravity;
  }
}

function pin(p: Point, to: Vec) {
  p.x = p.px = to.x;
  p.y = p.py = to.y;
}

// Push every pair of neighbours back towards SEGMENT apart. The anchor never moves, and while the
// handle is held neither does the last point, so the rope between them has to stretch.
function constrain(points: Point[], grab: Vec | null, { stiffness, passes }: Physics) {
  const last = points.length - 1;
  for (let pass = 0; pass < passes; pass++) {
    pin(points[0], ANCHOR);
    if (grab) pin(points[last], grab);
    for (let i = 1; i <= last; i++) {
      const a = points[i - 1];
      const b = points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const pull = ((distance - SEGMENT) / distance) * stiffness;
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

// Teaching overlays for steps 4 and 5. Stretch is measured from the anchor, so the lines are arcs:
// the handle counts as "past the trigger" anywhere outside the outer arc, not only straight down.
function arcPath(radius: number) {
  const spread = (55 * Math.PI) / 180;
  const from = { x: ANCHOR.x - Math.sin(spread) * radius, y: ANCHOR.y + Math.cos(spread) * radius };
  const to = { x: ANCHOR.x + Math.sin(spread) * radius, y: from.y };
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} A ${radius} ${radius} 0 0 0 ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

// A spot on an arc, `degrees` to the right of straight down, for labelling it.
function onArc(radius: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return { x: ANCHOR.x + Math.sin(angle) * radius, y: ANCHOR.y + Math.cos(angle) * radius };
}

function Guides({ showTrigger, stretchRef }: { showTrigger: boolean; stretchRef: RefObject<SVGTextElement | null> }) {
  return (
    <g className="pointer-events-none font-mono" fontSize={9}>
      <path d={arcPath(LENGTH)} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeDasharray="3 4" />
      <text {...onArc(LENGTH + 4, 32)} fill="currentColor" fillOpacity={0.6}>
        rest
      </text>
      {showTrigger ? (
        <>
          <path d={arcPath(LENGTH + TRIGGER)} fill="none" stroke="#f97316" strokeOpacity={0.7} strokeDasharray="3 4" />
          <text {...onArc(LENGTH + TRIGGER + 4, 28)} fill="#f97316">
            trigger
          </text>
        </>
      ) : null}
      <text ref={stretchRef} x={WIDTH - 6} y={HEIGHT - 10} textAnchor="end" fill="currentColor" fillOpacity={0.7}>
        stretch 0px
      </text>
    </g>
  );
}

function PullCordScene({
  stage,
  replayKey = 0,
  physics = PHYSICS,
  guides = false,
  look = "plain",
}: {
  stage: Stage;
  replayKey?: number;
  physics?: Physics;
  guides?: boolean; // draw the rest and trigger lines and a live stretch readout
  look?: "plain" | "real"; // "real" draws a ceiling rose, a braided cord, and a turned wooden pull
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const braidRef = useRef<SVGPathElement>(null);
  const id = useId();
  const stretchRef = useRef<SVGTextElement>(null);
  const physicsRef = useRef(physics);
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

  // The playground changes the numbers while the rope is running.
  useEffect(() => {
    physicsRef.current = physics;
    wake.current();
  }, [physics]);

  const real = look === "real";
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
      const d = ropePath(points);
      pathRef.current?.setAttribute("d", d);
      braidRef.current?.setAttribute("d", d);
      const end = points[points.length - 1];
      const before = points[points.length - 2];
      const angle = (Math.atan2(end.y - before.y, end.x - before.x) * 180) / Math.PI - 90;
      handleRef.current?.setAttribute("transform", `translate(${end.x} ${end.y}) rotate(${angle})`);
      if (stretchRef.current) {
        stretchRef.current.textContent = `stretch ${Math.max(0, stretchOf(points)).toFixed(0)}px`;
      }
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
        integrate(points, physicsRef.current);
        if (stage >= 3) constrain(points, grab.current, physicsRef.current);
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
      {real ? (
        <defs>
          <radialGradient id={`${id}-wood`} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor={armed ? "#fdba74" : "#e8c9a0"} />
            <stop offset="55%" stopColor={armed ? "#f97316" : "#b07a48"} />
            <stop offset="100%" stopColor={armed ? "#c2410c" : "#6b4423"} />
          </radialGradient>
          <linearGradient id={`${id}-metal`} x1="0" x2="1">
            <stop offset="0%" stopColor="#8a8d93" />
            <stop offset="45%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#6b6e74" />
          </linearGradient>
        </defs>
      ) : (
        <rect x={ANCHOR.x - 14} y={-4} width={28} height={8} rx={3} fill="currentColor" opacity={0.25} />
      )}
      {guides && stage >= 4 ? <Guides showTrigger={canToggle} stretchRef={stretchRef} /> : null}
      <path
        ref={pathRef}
        d={ropePath(REST)}
        fill="none"
        stroke="currentColor"
        strokeWidth={real ? 2.4 : 2}
        strokeLinecap="round"
        opacity={real ? 0.85 : 0.75}
      />
      {real ? (
        <>
          {/* Short gaps in a page-coloured stroke read as the twist of a braided cord. */}
          <path
            ref={braidRef}
            d={ropePath(REST)}
            fill="none"
            stroke="var(--craft-page)"
            strokeWidth={2.4}
            strokeDasharray="1.2 2.6"
            opacity={0.35}
          />
          {/* The ceiling rose the cord drops out of. */}
          <rect x={ANCHOR.x - 22} y={-8} width={44} height={14} rx={7} fill="currentColor" opacity={0.9} />
          <rect x={ANCHOR.x - 4} y={5} width={8} height={6} rx={1.5} fill={`url(#${id}-metal)`} />
        </>
      ) : null}
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
          <circle cy={real ? 20 : 12} r={real ? 28 : 24} fill="transparent" />
          <circle
            cy={real ? 21 : 12}
            r={real ? 20 : 17}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="opacity-0 transition-opacity group-focus-visible:opacity-60"
          />
          {real ? (
            <>
              {/* A metal crimp, then a turned wooden pull with a soft highlight. */}
              <rect x={-2.5} y={-1} width={5} height={8} rx={1.2} fill={`url(#${id}-metal)`} />
              <path
                d="M 0 6 C 6 6 10.5 15 10.5 23 C 10.5 30 6 35 0 35 C -6 35 -10.5 30 -10.5 23 C -10.5 15 -6 6 0 6 Z"
                fill={`url(#${id}-wood)`}
              />
              <ellipse cx={-3.6} cy={17} rx={2} ry={4.5} fill="#fff" opacity={0.35} />
            </>
          ) : (
            <rect
              x={-6}
              y={0}
              width={12}
              height={24}
              rx={6}
              fill={armed ? "#f97316" : "currentColor"}
              className="transition-[fill] duration-150"
            />
          )}
        </g>
      ) : null}
    </svg>
  );
}

export function PullCordDemo() {
  return (
    <div className="craft-fill surface-grid relative flex min-h-[30rem] w-full justify-center overflow-hidden text-(--demo-ink)">
      {/* The words switch with the theme class, so the right one is there on the first paint. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/3 px-4 text-center select-none">
        <p className="font-heading text-[clamp(3.5rem,13vw,9rem)] leading-none tracking-tight">
          <span className="dark:hidden">Light</span>
          <span className="hidden dark:inline">Dark</span>
        </p>
        <p className="mt-5 font-mono text-xs text-(--demo-subtle)">
          Pull the cord to turn the lights <span className="dark:hidden">off</span>
          <span className="hidden dark:inline">on</span>
        </p>
      </div>
      <PullCordScene stage={5} look="real" />
    </div>
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
        <PullCordScene stage={stage} replayKey={replayKey} guides={stage >= 4} />
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

// ---------------------------------------------------------------------------------------------
// Explainers for the tutorial. They teach one idea each and are not part of the toggle itself.

function ExplainerButton({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-(--demo-border) bg-(--demo-bg) px-3 py-1.5 font-mono text-[11px] text-(--demo-ink) hover:bg-(--demo-bar) disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Readout({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-(--demo-subtle)">{term}</dt>
          <dd className="text-(--demo-ink)">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Arrow({ from, to, color, id }: { from: Vec; to: Vec; color: string; id: string }) {
  if (Math.hypot(to.x - from.x, to.y - from.y) < 0.5) return null;
  return (
    <>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={2} markerEnd={`url(#${id})`} />
    </>
  );
}

const VELOCITY_COLOR = "#3b82f6";
const GRAVITY_COLOR = "#16a34a";
const FIX_COLOR = "#f97316";

// One thrown point, one Verlet step at a time. Gravity is exaggerated so each step is visible.
const VERLET_GRAVITY = 4.5;
const VERLET_START: Point = { x: 24, y: 196, px: -6, py: 232 };

export function VerletExplainer() {
  const [point, setPoint] = useState<Point>(VERLET_START);
  const [trail, setTrail] = useState<Vec[]>([]);
  const [playing, setPlaying] = useState(false);
  const gone = point.x > 370 || point.y > 230;

  const vx = point.x - point.px;
  const vy = point.y - point.py;
  const next = { x: point.x + vx, y: point.y + vy + VERLET_GRAVITY };

  function step() {
    setTrail((t) => [...t, { x: point.px, y: point.py }]);
    setPoint({ x: next.x, y: next.y, px: point.x, py: point.y });
  }

  function reset() {
    setPlaying(false);
    setTrail([]);
    setPoint(VERLET_START);
  }

  useEffect(() => {
    if (!playing || gone) return;
    const timer = setTimeout(step, 350);
    return () => clearTimeout(timer);
  });

  return (
    <CraftFrame label="One point, one step at a time" meta="gravity exaggerated">
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto]">
        <svg viewBox="0 0 360 230" className="surface-grid w-full border border-(--demo-border) text-(--demo-ink)">
          {trail.map((t, i) => (
            <circle key={i} cx={t.x} cy={t.y} r={3} fill="currentColor" opacity={0.18} />
          ))}
          {!gone ? (
            <>
              {/* Where the point will be: current + velocity + gravity. */}
              <Arrow id="v-next" from={point} to={{ x: point.x + vx, y: point.y + vy }} color={VELOCITY_COLOR} />
              <Arrow id="v-gravity" from={{ x: point.x + vx, y: point.y + vy }} to={next} color={GRAVITY_COLOR} />
              <circle cx={next.x} cy={next.y} r={6} fill="none" stroke="currentColor" strokeDasharray="2 2" />
              <text x={next.x + 9} y={next.y + 4} fontSize={10} fill="currentColor" className="font-mono">
                next
              </text>
            </>
          ) : null}
          {/* Previous position, and the step it took to get here: that gap is the velocity. */}
          <circle cx={point.px} cy={point.py} r={6} fill="none" stroke="currentColor" opacity={0.5} />
          <line x1={point.px} y1={point.py} x2={point.x} y2={point.y} stroke={VELOCITY_COLOR} strokeOpacity={0.4} strokeWidth={2} strokeDasharray="3 3" />
          <circle cx={point.x} cy={point.y} r={6} fill={FIX_COLOR} />
          <text x={point.px - 30} y={point.py + 4} fontSize={10} fill="currentColor" opacity={0.6} className="font-mono">
            prev
          </text>
          <text x={point.x + 10} y={point.y + 16} fontSize={10} fill="currentColor" className="font-mono">
            now
          </text>
        </svg>
        <div className="grid content-start gap-4 md:w-52">
          <Readout
            rows={[
              ["now", `${point.x.toFixed(1)}, ${point.y.toFixed(1)}`],
              ["prev", `${point.px.toFixed(1)}, ${point.py.toFixed(1)}`],
              ["velocity", `${vx.toFixed(1)}, ${vy.toFixed(1)}`],
              ["gravity", `0, ${VERLET_GRAVITY.toFixed(1)}`],
              ["next", `${next.x.toFixed(1)}, ${next.y.toFixed(1)}`],
            ]}
          />
          <div className="grid gap-1.5 font-mono text-[10px] text-(--demo-subtle)">
            <span>
              <span style={{ color: VELOCITY_COLOR }}>■</span> velocity = now − prev
            </span>
            <span>
              <span style={{ color: GRAVITY_COLOR }}>■</span> gravity, added every step
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExplainerButton onClick={step} disabled={gone}>
              Step
            </ExplainerButton>
            <ExplainerButton onClick={() => setPlaying((p) => !p)} disabled={gone}>
              {playing ? "Pause" : "Play"}
            </ExplainerButton>
            <ExplainerButton onClick={reset}>Reset</ExplainerButton>
          </div>
        </div>
      </div>
    </CraftFrame>
  );
}

// Two neighbours on the cord, and what one constraint pass does to them.
const CONSTRAINT_W = 360;
const CONSTRAINT_H = 240;
const CONSTRAINT_REST = 80;
const CONSTRAINT_A: Vec = { x: 150, y: 105 };
const CONSTRAINT_B: Vec = { x: 320, y: 210 };

export function ConstraintExplainer() {
  const [a, setA] = useState<Vec>(CONSTRAINT_A);
  const [b, setB] = useState<Vec>(CONSTRAINT_B);
  const [pinned, setPinned] = useState(true);
  const [stiffness, setStiffness] = useState(0.5);
  const [dragging, setDragging] = useState<"a" | "b" | null>(null);

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy) || 1;
  const error = distance - CONSTRAINT_REST;
  const pull = (error / distance) * stiffness;
  const share = pinned ? 0 : 0.5;
  const nextA = { x: a.x + dx * pull * share, y: a.y + dy * pull * share };
  const nextB = { x: b.x - dx * pull * (1 - share), y: b.y - dy * pull * (1 - share) };
  const stretched = Math.abs(error) < 0.5 ? "at rest" : error > 0 ? "too far apart" : "too close";

  function toScene(event: PointerEvent<SVGCircleElement>): Vec {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    return {
      x: Math.min(CONSTRAINT_W - 8, Math.max(8, ((event.clientX - box.left) / box.width) * CONSTRAINT_W)),
      y: Math.min(CONSTRAINT_H - 8, Math.max(8, ((event.clientY - box.top) / box.height) * CONSTRAINT_H)),
    };
  }

  function handlers(which: "a" | "b") {
    return {
      onPointerDown(event: PointerEvent<SVGCircleElement>) {
        if (which === "a" && pinned) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(which);
      },
      onPointerMove(event: PointerEvent<SVGCircleElement>) {
        if (dragging !== which) return;
        (which === "a" ? setA : setB)(toScene(event));
      },
      onPointerUp() {
        setDragging(null);
      },
    };
  }

  function runPass() {
    setA(nextA);
    setB(nextB);
  }

  return (
    <CraftFrame label="One distance constraint" meta="drag the orange point">
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto]">
        <svg
          viewBox={`0 0 ${CONSTRAINT_W} ${CONSTRAINT_H}`}
          className="surface-grid w-full touch-none border border-(--demo-border) text-(--demo-ink)"
        >
          <circle cx={a.x} cy={a.y} r={CONSTRAINT_REST} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 5" />
          <text x={a.x} y={a.y - CONSTRAINT_REST - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6} className="font-mono">
            rest length
          </text>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeWidth={2} strokeOpacity={0.6} />
          {/* Where each point lands after one pass. */}
          <Arrow id="c-fix-b" from={b} to={nextB} color={FIX_COLOR} />
          {!pinned ? <Arrow id="c-fix-a" from={a} to={nextA} color={FIX_COLOR} /> : null}
          <circle cx={nextB.x} cy={nextB.y} r={7} fill="none" stroke={FIX_COLOR} strokeDasharray="2 2" />
          {!pinned ? <circle cx={nextA.x} cy={nextA.y} r={7} fill="none" stroke={FIX_COLOR} strokeDasharray="2 2" /> : null}
          <circle
            cx={a.x}
            cy={a.y}
            r={8}
            fill={pinned ? "currentColor" : FIX_COLOR}
            className={pinned ? undefined : "cursor-grab"}
            {...handlers("a")}
          />
          {pinned ? <rect x={a.x - 12} y={a.y - 20} width={24} height={5} fill="currentColor" opacity={0.4} /> : null}
          <circle cx={b.x} cy={b.y} r={8} fill={FIX_COLOR} className="cursor-grab" {...handlers("b")} />
          <circle cx={b.x} cy={b.y} r={20} fill="transparent" className="cursor-grab" {...handlers("b")} />
          <text x={a.x - 22} y={a.y + 4} fontSize={11} fill="currentColor" className="font-mono" textAnchor="end">
            a
          </text>
          <text x={b.x + 14} y={b.y + 4} fontSize={11} fill="currentColor" className="font-mono">
            b
          </text>
        </svg>
        <div className="grid content-start gap-4 md:w-56">
          <Readout
            rows={[
              ["distance", `${distance.toFixed(1)}px`],
              ["rest", `${CONSTRAINT_REST}px`],
              ["error", `${error.toFixed(1)}px · ${stretched}`],
              ["pull", pull.toFixed(3)],
              ["a moves", `${(share * 100).toFixed(0)}% of the fix`],
              ["b moves", `${((1 - share) * 100).toFixed(0)}% of the fix`],
            ]}
          />
          <RangeControl label="Stiffness" value={stiffness} min={0.1} max={1} step={0.05} decimals={2} onChange={setStiffness} />
          <div className="flex flex-wrap gap-2">
            <ExplainerButton onClick={runPass}>Run one pass</ExplainerButton>
            <ExplainerButton onClick={() => setPinned((p) => !p)}>{pinned ? "Unpin a" : "Pin a"}</ExplainerButton>
            <ExplainerButton
              onClick={() => {
                setA(CONSTRAINT_A);
                setB(CONSTRAINT_B);
              }}
            >
              Reset
            </ExplainerButton>
          </div>
        </div>
      </div>
    </CraftFrame>
  );
}

// The whole frame loop as a diagram.
export function PullCordLoop() {
  const box = "border border-(--demo-border) bg-(--demo-bg) px-3 py-2 font-mono text-[11px] text-(--demo-ink)";
  const note = "font-mono text-[10px] text-(--demo-subtle)";
  const arrow = <span className="self-center text-(--demo-subtle)">↓</span>;
  return (
    <CraftFrame label="What runs every frame" meta="requestAnimationFrame">
      <div className="surface-grid grid justify-items-center gap-2 p-6">
        <div className={box}>browser asks for a frame</div>
        {arrow}
        <div className={box}>owed += time since last frame</div>
        {arrow}
        <div className="grid justify-items-center gap-2 border border-dashed border-(--demo-border) p-3">
          <span className={note}>while owed ≥ 8.3 ms (one 120 Hz step)</span>
          <div className="flex flex-wrap justify-center gap-2">
            <div className={box}>
              integrate
              <span className={`block ${note}`}>move + gravity</span>
            </div>
            <span className="self-center text-(--demo-subtle)">→</span>
            <div className={box}>
              constrain × {PHYSICS.passes}
              <span className={`block ${note}`}>pull neighbours back</span>
            </div>
          </div>
          <span className={note}>owed −= 8.3 ms</span>
        </div>
        {arrow}
        <div className={box}>
          draw
          <span className={`block ${note}`}>write the path’s d attribute</span>
        </div>
        {arrow}
        <div className={box}>
          still for 30 frames?
          <span className={`block ${note}`}>yes: stop until the next grab · no: ask for another frame</span>
        </div>
      </div>
    </CraftFrame>
  );
}

export function PullCordPlayground() {
  const [physics, setPhysics] = useState<Physics>(PHYSICS);
  const set = (key: keyof Physics) => (value: number) => setPhysics((p) => ({ ...p, [key]: value }));

  return (
    <CraftFrame label="Playground" meta="pull it after each change">
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_240px]">
        <div className="surface-grid relative flex h-[340px] justify-center overflow-hidden border border-(--demo-border)">
          <PullCordScene stage={5} physics={physics} guides />
        </div>
        <div className="grid content-start gap-3">
          <RangeControl label="Gravity" value={physics.gravity} min={0.01} max={0.4} step={0.01} decimals={2} onChange={set("gravity")} />
          <RangeControl label="Damping" value={physics.damping} min={0.9} max={0.999} step={0.001} decimals={3} onChange={set("damping")} />
          <RangeControl label="Stiffness" value={physics.stiffness} min={0.05} max={1} step={0.05} decimals={2} onChange={set("stiffness")} />
          <RangeControl label="Passes" value={physics.passes} min={1} max={20} step={1} onChange={set("passes")} />
          <ExplainerButton onClick={() => setPhysics(PHYSICS)}>Reset to defaults</ExplainerButton>
        </div>
      </div>
    </CraftFrame>
  );
}
