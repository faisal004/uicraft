"use client";

import { useEffect, useRef, useState } from "react";

const FROM = "build it";
const TO = "ship it";
const FONT = { family: "var(--font-geist-sans), Arial, sans-serif", size: 146, weight: 800, spacing: -5, baseline: 310 };
// Letters that survive the swap, as [index in FROM, index in TO]. Everything else is lifted out or dropped in.
const KEEP: [number, number][] = [[2, 2], [6, 5], [7, 6]];
// grabY: the height every claw grips at, inside the x-height so both sides of each letter are there.
// knuckle: how far each finger bows out past the letter, kept small because the letters sit tight together.
const CLAW = { far: 420, travel: 900, close: 220, beat: 140, open: 260, lift: 820, spread: 16, reach: 70, knuckle: 7, grabY: 262 };
const REMOVE = { start: 0, stagger: 320 };
// The slide waits until the last lifted letter has cleared the line.
const SHIFT = { start: 2750, duration: 750 };
const ADD = { start: 2950, stagger: 300 };
const ADDED = [...TO].filter((char, index) => char !== " " && !KEEP.some(([, to]) => to === index)).length;
const END = ADD.start + (ADDED - 1) * ADD.stagger + CLAW.travel + CLAW.beat + CLAW.open + CLAW.lift + 300;

type Piece = { char: string; kind: "keep" | "remove" | "add"; fromX: number; toX: number; left: number; right: number; start: number };

// The drawing is laid out on a 1000×500 board. The SVG grows its viewBox to fill
// whatever box it sits in (scaled up to at most MAX_SCALE), so the board stays
// centred and claws can travel in from the real edge of the page.
const BOARD = { width: 1000, height: 500 };
const MAX_SCALE = 1.1;

function useFittedViewBox(ref: React.RefObject<HTMLElement | null>) {
  const [box, setBox] = useState({ x: 0, y: 0, width: BOARD.width, height: BOARD.height });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const scale = Math.min(width / BOARD.width, height / BOARD.height, MAX_SCALE);
      const w = width / scale;
      const h = height / scale;
      setBox({ x: -(w - BOARD.width) / 2, y: -(h - BOARD.height) / 2, width: w, height: h });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return box;
}

// One loop: fade in, play, hold the finished word, fade out, start again.
const HOLD = 1600;
const FADE = 350;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const progress = (time: number, start: number, end: number) => clamp((time - start) / (end - start));
const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);
const easeIn = (value: number) => value * value * value;
const easeInOut = (value: number) => value < 0.5 ? 4 * value * value * value : 1 - Math.pow(2 - 2 * value, 3) / 2;

// Arrive open, close on the letter, then carry it up and out.
function pickPose(time: number, start: number, far: number) {
  const arrived = start + CLAW.travel;
  const closed = arrived + CLAW.close;
  const lifting = closed + CLAW.beat;
  let rise = 0;
  if (time < arrived) rise = far * (1 - easeInOut(progress(time, start, arrived)));
  else if (time >= lifting) rise = far * easeIn(progress(time, lifting, lifting + CLAW.lift));
  return { rise, letterRise: time >= lifting ? rise : 0, angle: CLAW.spread * (1 - easeOut(progress(time, arrived, closed))) };
}

// Arrive holding the letter, let go, then leave empty.
function dropPose(time: number, start: number, far: number) {
  const arrived = start + CLAW.travel;
  const opening = arrived + CLAW.beat;
  const opened = opening + CLAW.open;
  let rise = 0;
  if (time < arrived) rise = far * (1 - easeInOut(progress(time, start, arrived)));
  else if (time >= opened) rise = far * easeIn(progress(time, opened, opened + CLAW.lift));
  const angle = CLAW.spread * easeOut(progress(time, opening, opened)) * (1 - easeInOut(progress(time, opened, opened + CLAW.lift * 0.6)));
  return { rise, letterRise: time < opening ? rise : 0, angle };
}

function measure(fromText: SVGTextElement, toText: SVGTextElement): Piece[] {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return [];
  context.font = `${FONT.weight} ${FONT.size}px ${getComputedStyle(fromText).fontFamily}`;
  const ink = (char: string) => {
    const metrics = context.measureText(char);
    return { left: -metrics.actualBoundingBoxLeft, right: metrics.actualBoundingBoxRight };
  };
  // Glyph origins for a centred line, including kerning and letter spacing.
  const origins = (text: SVGTextElement, value: string) => {
    const offset = 500 - text.getComputedTextLength() / 2;
    return [...value].map((_, index) => offset + text.getStartPositionOfChar(index).x);
  };
  const fromX = origins(fromText, FROM);
  const toX = origins(toText, TO);
  const pieces: Piece[] = KEEP.map(([from, to]) => ({ char: FROM[from], kind: "keep", fromX: fromX[from], toX: toX[to], ...ink(FROM[from]), start: 0 }));
  [...FROM].forEach((char, index) => {
    if (char === " " || KEEP.some(([from]) => from === index)) return;
    const order = pieces.filter((piece) => piece.kind === "remove").length;
    pieces.push({ char, kind: "remove", fromX: fromX[index], toX: fromX[index], ...ink(char), start: REMOVE.start + order * REMOVE.stagger });
  });
  [...TO].forEach((char, index) => {
    if (char === " " || KEEP.some(([, to]) => to === index)) return;
    const order = pieces.filter((piece) => piece.kind === "add").length;
    pieces.push({ char, kind: "add", fromX: toX[index], toX: toX[index], ...ink(char), start: ADD.start + order * ADD.stagger });
  });
  return pieces;
}

export function WordSwapClawDemo() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const fromMeasureRef = useRef<SVGTextElement>(null);
  const toMeasureRef = useRef<SVGTextElement>(null);
  const letterRefs = useRef<(SVGGElement | null)[]>([]);
  const clawRefs = useRef<(SVGGElement | null)[]>([]);
  const leftRefs = useRef<(SVGGElement | null)[]>([]);
  const rightRefs = useRef<(SVGGElement | null)[]>([]);
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useFittedViewBox(sceneRef);
  // Lift letters far enough to leave through the top of the page, not just the drawing.
  const far = Math.max(CLAW.far, FONT.baseline - box.y + 60);

  useEffect(() => {
    document.fonts.ready.then(() => {
      if (fromMeasureRef.current && toMeasureRef.current) setPieces(measure(fromMeasureRef.current, toMeasureRef.current));
    });
  }, []);

  function paint(time: number) {
    pieces?.forEach((piece, index) => {
      if (piece.kind === "keep") {
        const x = piece.fromX + (piece.toX - piece.fromX) * easeInOut(progress(time, SHIFT.start, SHIFT.start + SHIFT.duration));
        letterRefs.current[index]?.setAttribute("transform", `translate(${x} 0)`);
        return;
      }
      const pose = piece.kind === "remove" ? pickPose(time, piece.start, far) : dropPose(time, piece.start, far);
      const centre = piece.fromX + (piece.left + piece.right) / 2;
      letterRefs.current[index]?.setAttribute("transform", `translate(${piece.fromX} ${-pose.letterRise})`);
      clawRefs.current[index]?.setAttribute("transform", `translate(${centre} ${CLAW.grabY - CLAW.reach - pose.rise})`);
      leftRefs.current[index]?.setAttribute("transform", `rotate(${pose.angle})`);
      rightRefs.current[index]?.setAttribute("transform", `rotate(${-pose.angle})`);
    });
  }

  useEffect(() => {
    if (!pieces) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(END);
      return;
    }
    const cycle = FADE + END + HOLD + FADE;
    let t = FADE;
    let last = 0;
    let raf = 0;
    let running = false;

    function frame() {
      paint(Math.min(END, Math.max(0, t - FADE)));
      const fadingOut = t - (FADE + END + HOLD);
      const opacity = t < FADE ? t / FADE : fadingOut > 0 ? 1 - fadingOut / FADE : 1;
      if (svgRef.current) svgRef.current.style.opacity = String(Math.max(0, opacity));
    }

    function loop(now: number) {
      // Cap the step so a long gap (a background tab) doesn't skip the animation.
      t = (t + Math.min(64, now - last)) % cycle;
      last = now;
      frame();
      raf = requestAnimationFrame(loop);
    }

    frame();
    // Only run while the scene is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    }, { threshold: 0.2 });
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
    // paint reads the latest refs and measurements; DEPS restart the loop when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, far]);

  // Single letters skip letter-spacing: negative spacing shrinks their box past the ink, and moving text then leaves unpainted trails.
  const type = { fill: "currentColor", fontFamily: FONT.family, fontSize: FONT.size, fontWeight: FONT.weight };
  const line = { ...type, letterSpacing: FONT.spacing };

  return (
    <div ref={sceneRef} className="craft-fill not-prose relative min-h-[26rem] w-full overflow-hidden text-foreground">
      <svg ref={svgRef} className="absolute inset-0 block h-full w-full" viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} role="img" aria-labelledby="swap-title swap-description">
        <title id="swap-title">Word swap claw</title>
        <desc id="swap-description">Claws lift the letters b, u, l and d out of “build it”, the remaining letters slide together, and new claws drop in s, h and p to spell “ship it”.</desc>
        <g visibility="hidden" aria-hidden="true" {...line}>
          <text ref={fromMeasureRef} x="0" y={FONT.baseline}>{FROM}</text>
          <text ref={toMeasureRef} x="0" y={FONT.baseline}>{TO}</text>
        </g>
        {!pieces && <text x="500" y={FONT.baseline} textAnchor="middle" {...line}>{FROM}</text>}
        {pieces?.map((piece, index) => (
          <g key={`${piece.kind}-${index}`} aria-hidden="true">
            <g ref={(node) => { letterRefs.current[index] = node; }} transform={`translate(${piece.fromX} ${piece.kind === "add" ? -far : 0})`}>
              <text x="0" y={FONT.baseline} {...type}>{piece.char}</text>
            </g>
            {piece.kind !== "keep" && (
              <g ref={(node) => { clawRefs.current[index] = node; }} transform={`translate(0 ${-far * 2})`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 0 -4000 V 0" />
                <g ref={(node) => { leftRefs.current[index] = node; }}>
                  <path d={`M 0 0 L ${piece.left - (piece.left + piece.right) / 2 - CLAW.knuckle} ${CLAW.reach * 0.45} L ${piece.left - (piece.left + piece.right) / 2 - 1.5} ${CLAW.reach}`} />
                </g>
                <g ref={(node) => { rightRefs.current[index] = node; }}>
                  <path d={`M 0 0 L ${piece.right - (piece.left + piece.right) / 2 + CLAW.knuckle} ${CLAW.reach * 0.45} L ${piece.right - (piece.left + piece.right) / 2 + 1.5} ${CLAW.reach}`} />
                </g>
                <circle r="9" fill="var(--craft-surface)" />
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
