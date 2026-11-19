"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

import { CraftFrame } from "@/components/mdx/craft-controls";

// Lanyard badge: an ID card hanging from a strap. It is the pull cord's Verlet rope with one more
// point on the end: a heavy point for the card. The strap and the card's top edge are one chain;
// the card itself is a stiff, heavy last link. Its angle comes from that link, and a small twist
// spring turns it around its strap when it swings sideways, so it shows its back now and then.
// The strap is an SVG path; the card is plain HTML moved with a CSS 3D transform.

const PHOTO = "/assets/lanyard-badge/faisal.jpg";

// The scene is a fixed 360 × 460 box, 1 unit per CSS pixel. The anchor sits just above the top.
const WIDTH = 360;
const HEIGHT = 460;
const ANCHOR = { x: WIDTH / 2, y: -10 };

const STRAP_POINTS = 10;
const STRAP_LENGTH = 150;
const SEGMENT = STRAP_LENGTH / (STRAP_POINTS - 1);

const CARD_W = 168;
const CARD_H = 262;
const HOLE = 16; // the strap clips on this far below the card's top edge
const CARD_DROP = CARD_H / 2 - HOLE; // from the end of the strap (in the slot) to the card's centre
const CARD = STRAP_POINTS; // index of the card's point, right after the strap
const CARD_MASS = 6; // the card is six times heavier than one bit of strap

const STEP_MS = 1000 / 120;
const GRAVITY = 0.1; // px per step²
const DAMPING = 0.984;
const STRAP_STIFFNESS = 0.6;
const PASSES = 8;
const MAX_REACH = STRAP_LENGTH + CARD_DROP + 60;

const SPIN = 0.08; // degrees per step of spin added for each px per step of sideways speed
const TWIST = 0.005; // how hard the twisted strap turns the card to the side it should rest on
const SPIN_DAMPING = 0.93;

type Vec = { x: number; y: number };
// `weight` is one over the point's mass: 0 for a point that never moves, 1 for strap, less for the card.
type Point = { x: number; y: number; px: number; py: number; weight: number };
type Spin = { angle: number; speed: number; target: number }; // turn around the strap, in degrees; target is 0 (front) or 180 (back)
// Where the card is held. `along` places the grabbed spot on the line from the clip (0) through the
// card's centre (1); past 1 is the lower half of the card.
type Grab = { x: number; y: number; along: number };

const STRAP_HALF_WIDTH = 7;
const THICKNESS = 3; // the card's edge, in px
const SHADE_STOPS = 6;
const MAX_THROW = 9; // fastest a point may leave your hand, in px per step
const MAX_ALONG = (CARD_DROP + CARD_H / 2 - 8) / CARD_DROP; // the card's bottom edge

function createLanyard(): Point[] {
  const points = Array.from({ length: STRAP_POINTS }, (_, i) => {
    const y = ANCHOR.y + i * SEGMENT;
    return { x: ANCHOR.x, y, px: ANCHOR.x, py: y, weight: i === 0 ? 0 : 1 };
  });
  const clip = points[STRAP_POINTS - 1];
  const y = clip.y + CARD_DROP;
  points.push({ x: ANCHOR.x, y, px: ANCHOR.x, py: y, weight: 1 / CARD_MASS });
  return points;
}

const REST = createLanyard();

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

// Like the pull cord, but each point takes a share of the fix by its weight: the light strap point
// moves six times as far as the heavy card. The card link is fully stiff, so it never stretches.
function constrain(points: Point[], grab: Grab | null) {
  for (let pass = 0; pass < PASSES; pass++) {
    const anchor = points[0];
    anchor.x = anchor.px = ANCHOR.x;
    anchor.y = anchor.py = ANCHOR.y;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const wa = a.weight;
      const wb = b.weight;
      if (wa + wb === 0) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const rest = i === CARD ? CARD_DROP : SEGMENT;
      const stiffness = i === CARD ? 1 : STRAP_STIFFNESS;
      const pull = ((distance - rest) / distance) * stiffness;
      a.x += dx * pull * (wa / (wa + wb));
      a.y += dy * pull * (wa / (wa + wb));
      b.x -= dx * pull * (wb / (wa + wb));
      b.y -= dy * pull * (wb / (wa + wb));
    }
    if (grab) holdAt(points, grab);
  }
}

// Move the clip and the card's centre so the spot you grabbed sits under the pointer. A spot near
// the clip mostly moves the clip; a spot near the bottom levers the card around, so the badge hangs
// from your fingers. Previous positions are left alone, so the card keeps your hand's speed when
// you let go.
function holdAt(points: Point[], grab: Grab) {
  const clip = points[CARD - 1];
  const card = points[CARD];
  const s = grab.along;
  const dx = grab.x - (clip.x + (card.x - clip.x) * s);
  const dy = grab.y - (clip.y + (card.y - clip.y) * s);
  const k = 1 / ((1 - s) ** 2 + s ** 2);
  clip.x += dx * (1 - s) * k;
  clip.y += dy * (1 - s) * k;
  card.x += dx * s * k;
  card.y += dy * s * k;
}

// Sideways speed spins the card around its strap; the twisted strap slowly turns it back.
function turn(spin: Spin, card: Point, held: boolean) {
  // Pinched between your fingers, the card can't spin freely.
  if (held) {
    spin.speed *= 0.85;
    spin.angle += spin.speed;
    return;
  }
  const sideways = card.x - card.px;
  spin.speed = (spin.speed + sideways * SPIN - (spin.angle - spin.target) * TWIST) * SPIN_DAMPING;
  spin.angle += spin.speed;
}

// The card's tilt, in degrees: the direction from the clip down to the card's centre.
function tiltOf(points: Point[]) {
  const clip = points[CARD - 1];
  const card = points[CARD];
  return (Math.atan2(card.y - clip.y, card.x - clip.x) * 180) / Math.PI - 90;
}

function clampGrab(to: Vec): Vec {
  const dx = to.x - ANCHOR.x;
  const dy = to.y - ANCHOR.y;
  const distance = Math.hypot(dx, dy) || 1;
  if (distance <= MAX_REACH) return to;
  return { x: ANCHOR.x + (dx / distance) * MAX_REACH, y: ANCHOR.y + (dy / distance) * MAX_REACH };
}

// The strap's centre line: the same smooth curve as the pull cord, sampled into short pieces.
function strapLine(points: Point[]): Vec[] {
  const last = CARD - 1;
  const line: Vec[] = [{ x: points[0].x, y: points[0].y }];
  let from: Vec = points[0];
  for (let i = 1; i < last; i++) {
    const c = points[i];
    const to = { x: (c.x + points[i + 1].x) / 2, y: (c.y + points[i + 1].y) / 2 };
    for (let k = 1; k <= 4; k++) {
      const t = k / 4;
      const u = 1 - t;
      line.push({ x: u * u * from.x + 2 * u * t * c.x + t * t * to.x, y: u * u * from.y + 2 * u * t * c.y + t * t * to.y });
    }
    from = to;
  }
  line.push({ x: points[last].x, y: points[last].y });
  return line;
}

// How far the strap is twisted at `t` (0 = top, 1 = clip). The card's spin winds up the strap,
// most of it near the card.
function twistAt(spin: number, t: number) {
  return ((spin * t ** 1.4) * Math.PI) / 180;
}

// The strap is a flat ribbon. Where it's twisted you see it edge-on, so it gets narrower. Returns
// its outline and two rows of stitching just inside the edges.
function ribbon(line: Vec[], spin: number) {
  const left: string[] = [];
  const right: string[] = [];
  const stitchLeft: string[] = [];
  const stitchRight: string[] = [];
  line.forEach((c, i) => {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(line.length - 1, i + 1)];
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / length;
    const ny = (b.x - a.x) / length;
    const half = STRAP_HALF_WIDTH * Math.max(0.16, Math.abs(Math.cos(twistAt(spin, i / (line.length - 1)))));
    left.push(`${(c.x + nx * half).toFixed(1)} ${(c.y + ny * half).toFixed(1)}`);
    right.push(`${(c.x - nx * half).toFixed(1)} ${(c.y - ny * half).toFixed(1)}`);
    const inset = Math.max(0, half - 2.2);
    stitchLeft.push(`${(c.x + nx * inset).toFixed(1)} ${(c.y + ny * inset).toFixed(1)}`);
    stitchRight.push(`${(c.x - nx * inset).toFixed(1)} ${(c.y - ny * inset).toFixed(1)}`);
  });
  return {
    outline: `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`,
    stitches: `M ${stitchLeft.join(" L ")} M ${stitchRight.join(" L ")}`,
  };
}

function linePathEnds(line: Vec[]) {
  const top = line[0];
  const end = line[line.length - 1];
  return { x1: top.x.toFixed(1), y1: top.y.toFixed(1), x2: end.x.toFixed(1), y2: end.y.toFixed(1) };
}

const REST_LINE = strapLine(REST);
const REST_RIBBON = ribbon(REST_LINE, 0);

// Move, tilt, tip forward or back with vertical speed, then spin around the strap.
// The strap ends in the card's slot, and the card turns around that slot (see CARD_ORIGIN), so
// tilting, tipping, and spinning never pull the slot off the strap.
function cardTransform(points: Point[], spin: number) {
  const card = points[CARD];
  const slot = points[CARD - 1];
  const pitch = Math.max(-18, Math.min(18, -(card.y - card.py) * 4));
  return `translate(${(slot.x - CARD_W / 2).toFixed(1)}px, ${(slot.y - HOLE).toFixed(1)}px) rotate(${tiltOf(points).toFixed(2)}deg) rotateX(${pitch.toFixed(2)}deg) rotateY(${spin.toFixed(2)}deg)`;
}

const CARD_ORIGIN = `${CARD_W / 2}px ${HOLE}px`;

// The shadow falls on the wall behind: it follows the card but never turns with it, and gets
// thinner as the card turns side-on.
function shadowTransform(points: Point[], spin: number) {
  const card = points[CARD];
  const width = Math.max(0.05, Math.abs(Math.cos((spin * Math.PI) / 180)));
  return `translate(${(card.x - CARD_W / 2 + 12).toFixed(1)}px, ${(card.y - CARD_H / 2 + 18).toFixed(1)}px) rotate(${tiltOf(points).toFixed(2)}deg) scaleX(${width.toFixed(3)})`;
}

function capSpeed(points: Point[]) {
  for (const p of points) {
    const speed = Math.hypot(p.x - p.px, p.y - p.py);
    if (speed > MAX_THROW) {
      p.px = p.x - ((p.x - p.px) / speed) * MAX_THROW;
      p.py = p.y - ((p.y - p.py) / speed) * MAX_THROW;
    }
  }
}

function isSettled(points: Point[], spin: Spin) {
  const still = points.every((p) => Math.abs(p.x - p.px) + Math.abs(p.y - p.py) < 0.01);
  return still && Math.abs(spin.speed) < 0.01 && Math.abs(spin.angle - spin.target) < 0.05;
}

// The slot is a real hole: both faces are masked with a card-sized shape that has a pill cut out
// of it, so the strap and the page behind show through.
const SLOT_W = STRAP_HALF_WIDTH * 2 + 8;
const SLOT_H = 7;
const SLOT_MASK = (() => {
  const r = SLOT_H / 2;
  const x = (CARD_W - SLOT_W) / 2 + r;
  const y = HOLE - r;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${CARD_W}' height='${CARD_H}'><path fill-rule='evenodd' d='M0 0H${CARD_W}V${CARD_H}H0Z M${x} ${y}h${SLOT_W - SLOT_H}a${r} ${r} 0 0 1 0 ${SLOT_H}h${-(SLOT_W - SLOT_H)}a${r} ${r} 0 0 1 0 ${-SLOT_H}Z'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();
const FACE_MASK: CSSProperties = { maskImage: SLOT_MASK, maskSize: "100% 100%", WebkitMaskImage: SLOT_MASK, WebkitMaskSize: "100% 100%" };

// A thin rim around the hole, so it reads as cut into the card.
function Slot() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-1/2 -translate-x-1/2 rounded-full shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.35),0_0_0_0.5px_rgba(0,0,0,0.25)]"
      style={{ top: HOLE - SLOT_H / 2, width: SLOT_W, height: SLOT_H }}
    />
  );
}

// The strap's metal end, a swivel ring, and the wire hook that goes down into the card's slot.
// It hangs from the strap, so it tilts with the card but never spins with it.
// The last bit of strap, from the card's top edge down into the slot. The main strap is drawn
// behind the card, so this piece is drawn again on top while the card's front faces you.
function StrapEnd() {
  return (
    <g data-strap-end="">
      <rect x={-STRAP_HALF_WIDTH} y={-HOLE - 2} width={STRAP_HALF_WIDTH * 2} height={HOLE + 2} fill="#1d1d1f" stroke="#4a4a4f" strokeWidth={0.8} />
      <path
        d={`M ${-STRAP_HALF_WIDTH + 2.2} ${-HOLE - 2} V -1 M ${STRAP_HALF_WIDTH - 2.2} ${-HOLE - 2} V -1`}
        stroke="white"
        strokeOpacity={0.28}
        strokeWidth={0.7}
        strokeDasharray="2.5 2"
      />
      {/* Darker where it folds over into the slot. */}
      <rect x={-STRAP_HALF_WIDTH} y={-4} width={STRAP_HALF_WIDTH * 2} height={4} fill="black" opacity={0.45} />
    </g>
  );
}

function CardFront() {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[14px] border border-black/10 bg-[#fbfaf7] text-[#151515] [backface-visibility:hidden]"
      style={{ ...FACE_MASK, transform: `translateZ(${THICKNESS / 2}px)` }}
    >
      <div className="flex h-full flex-col px-4 pb-4 pt-[30px]">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-black/50">
          <span>UICraft</span>
          <span>Crew</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PHOTO}
          alt=""
          draggable={false}
          className="mt-3 h-[124px] w-full rounded-[8px] object-cover object-[50%_30%]"
        />
        <p className="mt-3 text-[17px] font-semibold leading-tight tracking-tight">Faisal Husain</p>
        <p className="mt-0.5 text-[11px] text-black/55">Full-Stack Engineer</p>
        <div className="mt-auto flex items-end justify-between">
          <span className="font-mono text-[9px] tracking-[0.14em] text-black/45">ID 0017</span>
          <span
            aria-hidden="true"
            className="h-4 w-16 bg-[repeating-linear-gradient(90deg,#151515_0_1px,transparent_1px_3px,#151515_3px_5px,transparent_5px_6px)] opacity-70"
          />
        </div>
      </div>
      {/* A soft band of light that slides across as the card turns. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.7)_47%,transparent_64%)] bg-[length:250%_100%] mix-blend-overlay [background-position:var(--sheen,50%)_0]"
      />
      {/* Darker as it turns away from the light. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black opacity-(--front-shade)" />
      <Slot />
    </div>
  );
}

function CardBack() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden rounded-[14px] border border-white/10 bg-[#151515] text-white [backface-visibility:hidden]"
      style={{ ...FACE_MASK, transform: `rotateY(180deg) translateZ(${THICKNESS / 2}px)` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:12px_12px]" />
      <div className="relative flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/50">UICraft</span>
        <span className="text-[22px] font-semibold tracking-tight">Craft crew</span>
        <span className="font-mono text-[9px] text-white/45">Hung on a Verlet rope</span>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.18)_47%,transparent_64%)] bg-[length:250%_100%] [background-position:var(--sheen,50%)_0]"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black opacity-(--back-shade)" />
      <Slot />
    </div>
  );
}

// The card's edges, so it has some thickness when it turns side-on.
function CardEdges() {
  const edge = "absolute left-1/2 top-1/2 bg-[#cfcac0]";
  return (
    <>
      {[90, -90].map((turnY) => (
        <span
          key={turnY}
          aria-hidden="true"
          className={edge}
          style={{
            width: THICKNESS,
            height: CARD_H - 24,
            margin: `${-(CARD_H - 24) / 2}px 0 0 ${-THICKNESS / 2}px`,
            transform: `rotateY(${turnY}deg) translateZ(${CARD_W / 2 - 0.5}px)`,
          }}
        />
      ))}
      {[90, -90].map((turnX) => (
        <span
          key={turnX}
          aria-hidden="true"
          className={edge}
          style={{
            width: CARD_W - 24,
            height: THICKNESS,
            margin: `${-THICKNESS / 2}px 0 0 ${-(CARD_W - 24) / 2}px`,
            transform: `rotateX(${turnX}deg) translateZ(${CARD_H / 2 - 0.5}px)`,
          }}
        />
      ))}
    </>
  );
}

function LanyardScene({ showPhysics = false }: { showPhysics?: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const strapRef = useRef<SVGPathElement>(null);
  const stitchRef = useRef<SVGPathElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<SVGPathElement>(null);
  const hookRef = useRef<SVGGElement>(null);
  const stopRefs = useRef<(SVGStopElement | null)[]>([]);
  const shadeId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const linkRef = useRef<SVGLineElement>(null);

  const points = useRef<Point[]>(createLanyard());
  const spin = useRef<Spin>({ angle: 0, speed: 0, target: 0 });
  const grab = useRef<Grab | null>(null);
  const grabOffset = useRef<Vec>({ x: 0, y: 0 }); // from the grabbed spot to the pointer, across the card
  const pressStart = useRef<Vec | null>(null);
  const wake = useRef(() => {});
  const reducedMotion = useRef(false);


  useEffect(() => {
    const lanyard = points.current;
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function draw() {
      const angle = spin.current.angle;
      const line = strapLine(lanyard);
      const strap = ribbon(line, angle);
      strapRef.current?.setAttribute("d", strap.outline);
      shadeRef.current?.setAttribute("d", strap.outline);
      stitchRef.current?.setAttribute("d", strap.stitches);
      // Shade the strap where it's twisted away from the light.
      stopRefs.current.forEach((stop, i) => {
        const facing = Math.cos(twistAt(angle, i / (SHADE_STOPS - 1)));
        stop?.setAttribute("stop-opacity", ((1 - Math.abs(facing)) * 0.5 + (facing < 0 ? 0.15 : 0)).toFixed(3));
      });
      const shade = linePathEnds(line);
      const gradient = stopRefs.current[0]?.parentElement;
      gradient?.setAttribute("x1", shade.x1);
      gradient?.setAttribute("y1", shade.y1);
      gradient?.setAttribute("x2", shade.x2);
      gradient?.setAttribute("y2", shade.y2);
      if (cardRef.current) {
        const card = cardRef.current;
        card.style.transform = cardTransform(lanyard, angle);
        const facing = Math.cos((angle * Math.PI) / 180);
        const sheen = 50 + Math.sin((angle * Math.PI) / 180) * 70 + tiltOf(lanyard) * 2.5;
        card.style.setProperty("--sheen", `${sheen.toFixed(1)}%`);
        card.style.setProperty("--front-shade", Math.min(0.55, (1 - Math.max(0, facing)) * 0.55).toFixed(3));
        card.style.setProperty("--back-shade", Math.min(0.55, (1 - Math.max(0, -facing)) * 0.55).toFixed(3));
      }
      if (shadowRef.current) shadowRef.current.style.transform = shadowTransform(lanyard, angle);
      const end = lanyard[CARD - 1];
      const hook = hookRef.current;
      if (hook) {
        // Turned with the card, narrowed like the strap's twisted end, hidden when the back faces you.
        const facing = Math.cos((angle * Math.PI) / 180);
        const width = Math.max(0.16, Math.abs(facing));
        hook.setAttribute(
          "transform",
          `translate(${end.x.toFixed(1)} ${end.y.toFixed(1)}) rotate(${tiltOf(lanyard).toFixed(2)}) scale(${width.toFixed(3)} 1)`,
        );
        hook.setAttribute("opacity", facing > 0 ? "1" : "0");
      }
      lanyard.forEach((p, i) => {
        dotRefs.current[i]?.setAttribute("cx", p.x.toFixed(1));
        dotRefs.current[i]?.setAttribute("cy", p.y.toFixed(1));
      });
      const clip = lanyard[CARD - 1];
      const card = lanyard[CARD];
      linkRef.current?.setAttribute("x1", clip.x.toFixed(1));
      linkRef.current?.setAttribute("y1", clip.y.toFixed(1));
      linkRef.current?.setAttribute("x2", card.x.toFixed(1));
      linkRef.current?.setAttribute("y2", card.y.toFixed(1));
    }

    let frame = 0;
    let last = 0;
    let owed = 0;
    let still = 0;

    function tick(now: number) {
      owed = Math.min(owed + now - last, STEP_MS * 8);
      last = now;
      while (owed >= STEP_MS) {
        integrate(lanyard);
        constrain(lanyard, grab.current);
        turn(spin.current, lanyard[CARD], grab.current !== null);
        owed -= STEP_MS;
      }
      draw();
      still = grab.current || !isSettled(lanyard, spin.current) ? 0 : still + 1;
      if (still > 30) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    wake.current = () => {
      if (frame || reducedMotion.current) {
        draw();
        return;
      }
      last = performance.now();
      owed = 0;
      still = 0;
      frame = requestAnimationFrame(tick);
    };

    draw();
    // Start with a small sideways nudge so the badge is already swinging when you arrive.
    if (!reducedMotion.current) lanyard[CARD].px -= 3;
    wake.current();
    return () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
  }, []);

  function toScene(event: PointerEvent): Vec {
    const box = sceneRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * WIDTH,
      y: ((event.clientY - box.top) / box.height) * HEIGHT,
    };
  }

  // A tap or a key press turns the card over so you can read the other side. The strap's twist
  // spring now pulls towards the other face, so the card swings round and settles there.
  function flip() {
    const s = spin.current;
    s.target = s.target === 0 ? 180 : 0;
    if (reducedMotion.current) s.angle = s.target;
    wake.current();
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (reducedMotion.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const at = toScene(event);
    const clip = points.current[CARD - 1];
    const card = points.current[CARD];
    // Find the grabbed spot on the clip → centre line, and how far across the card the pointer is.
    const ax = card.x - clip.x;
    const ay = card.y - clip.y;
    const along = Math.max(0.15, Math.min(MAX_ALONG, ((at.x - clip.x) * ax + (at.y - clip.y) * ay) / (ax * ax + ay * ay)));
    const spot = { x: clip.x + ax * along, y: clip.y + ay * along };
    grabOffset.current = { x: at.x - spot.x, y: at.y - spot.y };
    pressStart.current = at;
    grab.current = { ...spot, along };
    wake.current();
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!grab.current) return;
    const at = toScene(event);
    const to = clampGrab({ x: at.x - grabOffset.current.x, y: at.y - grabOffset.current.y });
    grab.current = { ...to, along: grab.current.along };
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    if (!grab.current) return;
    const start = pressStart.current!;
    const end = toScene(event);
    grab.current = null;
    pressStart.current = null;
    // A flick of the wrist can move the pointer 100px in one frame. Cap the speed it hands over,
    // so a hard throw swings the badge up and around rather than launching it off the page.
    capSpeed(points.current);
    if (Math.hypot(end.x - start.x, end.y - start.y) < 4) flip();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    flip();
  }

  const restCard = REST[CARD];

  return (
    <div
      ref={sceneRef}
      className="relative shrink-0 text-(--demo-ink) [perspective:900px]"
      style={{ width: WIDTH, height: HEIGHT }}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} className="absolute inset-0 overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={shadeId} gradientUnits="userSpaceOnUse" x1={ANCHOR.x} y1={ANCHOR.y} x2={ANCHOR.x} y2={REST[CARD - 1].y}>
            {Array.from({ length: SHADE_STOPS }, (_, i) => (
              <stop
                key={i}
                ref={(node) => {
                  stopRefs.current[i] = node;
                }}
                offset={i / (SHADE_STOPS - 1)}
                stopColor="black"
                stopOpacity={0}
              />
            ))}
          </linearGradient>
        </defs>
        {/* Woven strap: near-black in both themes, with a lighter edge so it reads on a dark page. */}
        <path ref={strapRef} d={REST_RIBBON.outline} fill="#1d1d1f" stroke="#4a4a4f" strokeWidth={0.8} strokeLinejoin="round" />
        <path d={REST_RIBBON.outline} fill={`url(#${shadeId})`} ref={shadeRef} />
        <path
          ref={stitchRef}
          d={REST_RIBBON.stitches}
          fill="none"
          stroke="white"
          strokeOpacity={0.28}
          strokeWidth={0.7}
          strokeDasharray="2.5 2"
        />
      </svg>

      <div
        ref={shadowRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 rounded-[14px] bg-black/20 blur-[10px] dark:bg-black/50"
        style={{ width: CARD_W, height: CARD_H, transform: shadowTransform(REST, 0) }}
      />

      <div
          ref={cardRef}
          role="button"
          tabIndex={0}
          aria-label="Faisal Husain, Full-Stack Engineer. ID badge, press to turn it over."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="absolute left-0 top-0 cursor-grab touch-none select-none outline-none [transform-style:preserve-3d] focus-visible:[&>div:first-child]:ring-2 focus-visible:[&>div:first-child]:ring-(--craft-accent) active:cursor-grabbing"
          style={
            {
              width: CARD_W,
              height: CARD_H,
              transform: `translate(${restCard.x - CARD_W / 2}px, ${REST[CARD - 1].y - HOLE}px)`,
              transformOrigin: CARD_ORIGIN,
            } as CSSProperties
          }
        >
          <CardEdges />
          <CardFront />
          <CardBack />
        </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
        <g ref={hookRef} transform={`translate(${REST[CARD - 1].x} ${REST[CARD - 1].y})`}>
          <StrapEnd />
        </g>
      </svg>

      {showPhysics ? (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
          <line ref={linkRef} x1={REST[CARD - 1].x} y1={REST[CARD - 1].y} x2={restCard.x} y2={restCard.y} stroke="#f97316" strokeWidth={2} strokeDasharray="4 3" />
          {REST.map((p, i) => (
            <circle
              key={i}
              ref={(node) => {
                dotRefs.current[i] = node;
              }}
              cx={p.x}
              cy={p.y}
              r={i === CARD ? 9 : i === 0 ? 3.5 : 3}
              fill={i === 0 ? "currentColor" : "#f97316"}
              stroke={i === CARD ? "white" : undefined}
              strokeWidth={2}
            />
          ))}
        </svg>
      ) : null}
    </div>
  );
}

export function LanyardBadgeDemo() {
  const [showPhysics, setShowPhysics] = useState(false);
  return (
    <CraftFrame label="Lanyard badge" meta="Verlet rope · CSS 3D">
      <div className="surface-grid relative flex h-[480px] justify-center overflow-hidden">
        <LanyardScene showPhysics={showPhysics} />
        <button
          type="button"
          aria-pressed={showPhysics}
          onClick={() => setShowPhysics((s) => !s)}
          className="absolute bottom-3 right-3 border border-(--demo-border) bg-(--demo-bg) px-3 py-1.5 font-mono text-[11px] text-(--demo-ink) hover:bg-(--demo-bar)"
        >
          {showPhysics ? "Hide physics" : "Show physics"}
        </button>
        <p className="pointer-events-none absolute bottom-4 left-4 font-mono text-[11px] text-(--demo-subtle)">
          Drag, throw, or tap the badge
        </p>
      </div>
    </CraftFrame>
  );
}
