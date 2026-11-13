"use client";

import { useEffect, useRef, useState } from "react";

// Each claw runs the same choreography from its own start time.
export const CLAW = { approach: 1400, beat: 160, open: 320, lift: 260, retreat: 820, liftBy: 14, spread: 30 };
export const CLAW_END = CLAW.approach + CLAW.beat + CLAW.open + CLAW.lift + CLAW.retreat;
// Square tittle matching the 20-unit i stem; its centre sits where Geist places the dot.
const DOT = { x: 420, y: 212, size: 20, grip: 52, hold: 5, startY: -110, start: 0 };
// Crossbar and stem edges of the Geist 800 “t” at 146px, measured from the glyph’s left edge.
const TEE = { barLeft: 5, barRight: 64, stemLeft: 18, stemRight: 44, barY: 231, barHeight: 19 };
const BAR = { grip: 46, hold: 4, startX: 1100, start: 2650 };
const END = BAR.start + CLAW_END + 300;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const progress = (time: number, start: number, end: number) => clamp((time - start) / (end - start));
const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);
const easeIn = (value: number) => value * value * value;
const easeInOut = (value: number) => value < 0.5 ? 4 * value * value * value : 1 - Math.pow(2 - 2 * value, 3) / 2;

// offset: distance back along the approach path (0 = placing). angle: finger rotation in degrees.
export function clawPose(time: number, start: number, far: number, hold: number) {
  const placed = start + CLAW.approach;
  const opening = placed + CLAW.beat;
  const opened = opening + CLAW.open;
  const lifted = opened + CLAW.lift;
  const gone = lifted + CLAW.retreat;
  let offset = 0;
  if (time < placed) offset = far * (1 - easeInOut(progress(time, start, placed)));
  else if (time >= opened && time < lifted) offset = CLAW.liftBy * easeInOut(progress(time, opened, lifted));
  else if (time >= lifted) offset = CLAW.liftBy + (far - CLAW.liftBy) * easeIn(progress(time, lifted, gone));
  const open = easeOut(progress(time, opening, opened));
  const close = easeInOut(progress(time, lifted, lifted + CLAW.retreat * 0.6));
  const angle = (hold + (CLAW.spread - hold) * open) * (1 - close);
  const guide = Math.min(easeOut(progress(time, start + CLAW.approach / 2, placed)), 1 - easeOut(progress(time, opening, lifted))) * 0.3;
  return { offset, angle, holding: time < opening, guide };
}

export function SvgClawDemo() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const carriageRef = useRef<SVGGElement>(null);
  const upperRef = useRef<SVGGElement>(null);
  const lowerRef = useRef<SVGGElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const guidesRef = useRef<SVGGElement>(null);
  const secondCarriageRef = useRef<SVGGElement>(null);
  const secondUpperRef = useRef<SVGGElement>(null);
  const secondLowerRef = useRef<SVGGElement>(null);
  const barRef = useRef<SVGRectElement>(null);
  const teeRef = useRef<SVGTextElement>(null);
  const secondGuidesRef = useRef<SVGGElement>(null);
  const textMeasureRef = useRef<SVGTextElement>(null);
  const [teeX, setTeeX] = useState(638);
  const playheadRef = useRef(0);
  const runningRef = useRef(false);
  const frameRef = useRef(0);
  const lastRef = useRef(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      if (textMeasureRef.current) setTeeX(442 + textMeasureRef.current.getComputedTextLength());
    });
  }, []);

  function paint(time: number) {
    const targetJointY = DOT.y - DOT.grip;
    const first = clawPose(time, DOT.start, targetJointY - DOT.startY, DOT.hold);
    const jointY = targetJointY - first.offset;
    carriageRef.current?.setAttribute("transform", `translate(${DOT.x} ${jointY}) rotate(90)`);
    upperRef.current?.setAttribute("transform", `rotate(${-first.angle})`);
    lowerRef.current?.setAttribute("transform", `rotate(${first.angle})`);
    dotRef.current?.setAttribute("transform", `translate(${DOT.x} ${first.holding ? jointY + DOT.grip : DOT.y})`);
    guidesRef.current?.setAttribute("opacity", String(first.guide));

    const targetX = teeX + TEE.barRight + BAR.grip;
    const second = clawPose(time, BAR.start, BAR.startX - targetX, BAR.hold);
    const jointX = targetX + second.offset;
    secondCarriageRef.current?.setAttribute("transform", `translate(${jointX} ${TEE.barY + TEE.barHeight / 2}) scale(-1 1)`);
    secondUpperRef.current?.setAttribute("transform", `rotate(${-second.angle})`);
    secondLowerRef.current?.setAttribute("transform", `rotate(${second.angle})`);
    barRef.current?.setAttribute("transform", `translate(${second.holding ? second.offset : 0} 0)`);
    barRef.current?.setAttribute("opacity", second.holding ? "1" : "0");
    if (second.holding) teeRef.current?.setAttribute("mask", "url(#t-arms-mask)");
    else teeRef.current?.removeAttribute("mask");
    secondGuidesRef.current?.setAttribute("opacity", String(second.guide));
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
  }, [teeX]);

  const buttonClass = "rounded-lg px-3 py-1.5 text-sm text-foreground/65 hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--craft-accent)";

  return (
    <div ref={sceneRef} className="not-prose overflow-hidden border border-foreground/10 bg-(--craft-surface) text-foreground">
      <svg className="block w-full" viewBox="0 0 1000 500" role="img" aria-labelledby="claw-title claw-description">
        <title id="claw-title">SVG claw</title>
        <desc id="claw-description">Two mechanical claws complete “build it”: one places the dot of the first i, and the other places the crossbar of the final t.</desc>
        <defs>
          <mask id="t-arms-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="500">
            <rect width="1000" height="500" fill="white" />
            <rect x={teeX - 10} y={TEE.barY - 1} width={10 + TEE.stemLeft} height={TEE.barHeight + 2} fill="black" />
            <rect x={teeX + TEE.stemRight} y={TEE.barY - 1} width="40" height={TEE.barHeight + 2} fill="black" />
          </mask>
        </defs>
        <g fill="currentColor" fontFamily="var(--font-geist-sans), Arial, sans-serif" fontSize="146" fontWeight="800" letterSpacing="-5">
          <text x="230" y="310">bu</text>
          <rect x="410" y="238" width="20" height="72" rx="1" />
          <text x="442" y="310">ld i</text>
          <text ref={teeRef} x={teeX} y="310" mask="url(#t-arms-mask)">t</text>
        </g>
        <text ref={textMeasureRef} x="442" y="310" visibility="hidden" aria-hidden="true" fill="currentColor" fontFamily="var(--font-geist-sans), Arial, sans-serif" fontSize="146" fontWeight="800" letterSpacing="-5">ld i</text>
        <g ref={guidesRef} opacity="0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d={`M ${DOT.x} 100 V 285`} strokeDasharray="5 7" />
          <path d={`M ${DOT.x - 20} ${DOT.y} H ${DOT.x + 20} M ${DOT.x} ${DOT.y - 20} V ${DOT.y + 20}`} />
        </g>
        <g ref={secondGuidesRef} opacity="0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d={`M ${teeX + (TEE.stemLeft + TEE.stemRight) / 2} 165 V 305`} strokeDasharray="5 7" />
          <path d={`M ${teeX + TEE.barLeft - 15} ${TEE.barY + TEE.barHeight / 2} H ${teeX + TEE.barRight + 15}`} />
        </g>
        <g ref={carriageRef} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M -500 0 H 0" />
          <g ref={upperRef}><path d="M 0 0 L 28 -25 L 56 -7" /></g>
          <g ref={lowerRef}><path d="M 0 0 L 28 25 L 56 7" /></g>
          <circle r="9" fill="var(--craft-surface)" />
        </g>
        <g ref={dotRef} fill="currentColor"><rect x={-DOT.size / 2} y={-DOT.size / 2} width={DOT.size} height={DOT.size} rx="1" /></g>
        <rect ref={barRef} x={teeX + TEE.barLeft} y={TEE.barY} width={TEE.barRight - TEE.barLeft} height={TEE.barHeight} fill="currentColor" />
        <g ref={secondCarriageRef} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M -500 0 H 0" />
          <g ref={secondUpperRef}><path d="M 0 0 L 28 -25 L 56 -7" /></g>
          <g ref={secondLowerRef}><path d="M 0 0 L 28 25 L 56 7" /></g>
          <circle r="9" fill="var(--craft-surface)" />
        </g>
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
