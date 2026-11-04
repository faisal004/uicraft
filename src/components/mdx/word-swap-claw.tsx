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

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const progress = (time: number, start: number, end: number) => clamp((time - start) / (end - start));
const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);
const easeIn = (value: number) => value * value * value;
const easeInOut = (value: number) => value < 0.5 ? 4 * value * value * value : 1 - Math.pow(2 - 2 * value, 3) / 2;

// Arrive open, close on the letter, then carry it up and out.
function pickPose(time: number, start: number) {
  const arrived = start + CLAW.travel;
  const closed = arrived + CLAW.close;
  const lifting = closed + CLAW.beat;
  let rise = 0;
  if (time < arrived) rise = CLAW.far * (1 - easeInOut(progress(time, start, arrived)));
  else if (time >= lifting) rise = CLAW.far * easeIn(progress(time, lifting, lifting + CLAW.lift));
  return { rise, letterRise: time >= lifting ? rise : 0, angle: CLAW.spread * (1 - easeOut(progress(time, arrived, closed))) };
}

// Arrive holding the letter, let go, then leave empty.
function dropPose(time: number, start: number) {
  const arrived = start + CLAW.travel;
  const opening = arrived + CLAW.beat;
  const opened = opening + CLAW.open;
  let rise = 0;
  if (time < arrived) rise = CLAW.far * (1 - easeInOut(progress(time, start, arrived)));
  else if (time >= opened) rise = CLAW.far * easeIn(progress(time, opened, opened + CLAW.lift));
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
  const playheadRef = useRef(0);
  const runningRef = useRef(false);
  const frameRef = useRef(0);
  const lastRef = useRef(0);
  const [playing, setPlaying] = useState(false);

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
      const pose = piece.kind === "remove" ? pickPose(time, piece.start) : dropPose(time, piece.start);
      const centre = piece.fromX + (piece.left + piece.right) / 2;
      letterRefs.current[index]?.setAttribute("transform", `translate(${piece.fromX} ${-pose.letterRise})`);
      clawRefs.current[index]?.setAttribute("transform", `translate(${centre} ${CLAW.grabY - CLAW.reach - pose.rise})`);
      leftRefs.current[index]?.setAttribute("transform", `rotate(${pose.angle})`);
      rightRefs.current[index]?.setAttribute("transform", `rotate(${-pose.angle})`);
    });
  }

  function stop() {
    runningRef.current = false;
    cancelAnimationFrame(frameRef.current);
    setPlaying(false);
  }

  function tick(now: number) {
    if (!runningRef.current) return;
    playheadRef.current = Math.min(END, playheadRef.current + now - lastRef.current);
    lastRef.current = now;
    paint(playheadRef.current);
    if (playheadRef.current >= END) stop();
    else frameRef.current = requestAnimationFrame(tick);
  }

  function play() {
    if (playheadRef.current >= END) playheadRef.current = 0;
    if (runningRef.current) return;
    runningRef.current = true;
    lastRef.current = performance.now();
    setPlaying(true);
    frameRef.current = requestAnimationFrame(tick);
  }

  function replay() {
    stop();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    playheadRef.current = reduced ? END : 0;
    paint(playheadRef.current);
    if (!reduced) play();
  }

  useEffect(() => {
    if (!pieces) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) {
      playheadRef.current = END;
      paint(END);
      return;
    }
    paint(0);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        play();
      }
    }, { threshold: 0.35 });
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => {
      observer.disconnect();
      runningRef.current = false;
      cancelAnimationFrame(frameRef.current);
    };
    // The observer owns this measured scene; playback uses its current closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces]);

  const buttonClass = "rounded-lg px-3 py-1.5 text-sm text-foreground/65 hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--craft-accent)";
  // Single letters skip letter-spacing: negative spacing shrinks their box past the ink, and moving text then leaves unpainted trails.
  const type = { fill: "currentColor", fontFamily: FONT.family, fontSize: FONT.size, fontWeight: FONT.weight };
  const line = { ...type, letterSpacing: FONT.spacing };

  return (
    <div ref={sceneRef} className="not-prose overflow-hidden border border-foreground/10 bg-(--craft-surface) text-foreground">
      <svg className="block w-full" viewBox="0 0 1000 500" role="img" aria-labelledby="swap-title swap-description">
        <title id="swap-title">Word swap claw</title>
        <desc id="swap-description">Claws lift the letters b, u, l and d out of “build it”, the remaining letters slide together, and new claws drop in s, h and p to spell “ship it”.</desc>
        <g visibility="hidden" aria-hidden="true" {...line}>
          <text ref={fromMeasureRef} x="0" y={FONT.baseline}>{FROM}</text>
          <text ref={toMeasureRef} x="0" y={FONT.baseline}>{TO}</text>
        </g>
        {!pieces && <text x="500" y={FONT.baseline} textAnchor="middle" {...line}>{FROM}</text>}
        {pieces?.map((piece, index) => (
          <g key={`${piece.kind}-${index}`} aria-hidden="true">
            <g ref={(node) => { letterRefs.current[index] = node; }} transform={`translate(${piece.fromX} ${piece.kind === "add" ? -CLAW.far : 0})`}>
              <text x="0" y={FONT.baseline} {...type}>{piece.char}</text>
            </g>
            {piece.kind !== "keep" && (
              <g ref={(node) => { clawRefs.current[index] = node; }} transform={`translate(0 ${-CLAW.far * 2})`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 0 -600 V 0" />
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
      <div className="flex items-center justify-center gap-2 border-t border-foreground/10 px-4 py-3">
        <button type="button" className={buttonClass} onClick={replay}>Replay</button>
        <button type="button" className={buttonClass} onClick={() => runningRef.current ? stop() : play()}>
          {playing ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}
