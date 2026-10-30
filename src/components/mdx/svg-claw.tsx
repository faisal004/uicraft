"use client";

import { useEffect, useRef, useState } from "react";

const SCENE = { dotX: 420, dotY: 200, radius: 10, grip: 62, jointY: 200, startX: -90 };
const TIME = { approach: 1450, align: 1750, release: 2150, clear: 2500, retreat: 3450, end: 4500 };
const targetX = SCENE.dotX - SCENE.grip;
const ease = (value: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);
const between = (time: number, start: number, end: number) => ease((time - start) / (end - start));

export function SvgClawDemo() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const carriageRef = useRef<SVGGElement>(null);
  const upperRef = useRef<SVGGElement>(null);
  const lowerRef = useRef<SVGGElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const guidesRef = useRef<SVGGElement>(null);
  const playheadRef = useRef(0);
  const runningRef = useRef(false);
  const frameRef = useRef(0);
  const lastRef = useRef(0);
  const [playing, setPlaying] = useState(false);

  function paint(time: number) {
    const arrive = between(time, 0, TIME.approach);
    const leave = between(time, TIME.release, TIME.retreat);
    const x = SCENE.startX + (targetX - SCENE.startX) * arrive + (SCENE.startX - targetX) * leave;
    const opening = between(time, TIME.align, TIME.release) * 30;
    const closing = between(time, TIME.clear, TIME.retreat) * 30;
    const angle = opening - closing;
    const dotX = time < TIME.align ? x + SCENE.grip : SCENE.dotX;
    const guideOpacity = Math.min(between(time, 750, TIME.approach), 1 - between(time, TIME.release, TIME.retreat)) * 0.3;
    carriageRef.current?.setAttribute("transform", `translate(${x} ${SCENE.jointY})`);
    upperRef.current?.setAttribute("transform", `rotate(${-angle})`);
    lowerRef.current?.setAttribute("transform", `rotate(${angle})`);
    dotRef.current?.setAttribute("transform", `translate(${dotX} ${SCENE.dotY})`);
    guidesRef.current?.setAttribute("opacity", String(guideOpacity));
  }

  function stop() {
    runningRef.current = false;
    cancelAnimationFrame(frameRef.current);
    setPlaying(false);
  }

  function tick(now: number) {
    if (!runningRef.current) return;
    playheadRef.current = Math.min(TIME.end, playheadRef.current + now - lastRef.current);
    lastRef.current = now;
    paint(playheadRef.current);
    if (playheadRef.current >= TIME.end) stop();
    else frameRef.current = requestAnimationFrame(tick);
  }

  function play() {
    if (playheadRef.current >= TIME.end) playheadRef.current = 0;
    if (runningRef.current) return;
    runningRef.current = true;
    lastRef.current = performance.now();
    setPlaying(true);
    frameRef.current = requestAnimationFrame(tick);
  }

  function replay() {
    stop();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    playheadRef.current = reduced ? TIME.end : 0;
    paint(playheadRef.current);
    if (!reduced) play();
  }

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) {
      playheadRef.current = TIME.end;
      paint(TIME.end);
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
  }, []);

  const buttonClass = "rounded-lg px-3 py-1.5 text-sm text-foreground/65 hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--craft-accent)";

  return (
    <div ref={sceneRef} className="not-prose overflow-hidden border border-foreground/10 bg-(--craft-surface) text-foreground">
      <svg className="block w-full" viewBox="0 0 1000 500" role="img" aria-labelledby="claw-title claw-description">
        <title id="claw-title">Build it — SVG claw</title>
        <desc id="claw-description">A mechanical claw carries the missing dot to the first i in “build it,” releases it, and retreats.</desc>
        <g fill="currentColor" fontFamily="var(--font-geist-sans), Arial, sans-serif" fontSize="146" fontWeight="800" letterSpacing="-5">
          <text x="230" y="310">bu</text>
          <rect x="410" y="238" width="20" height="72" rx="1" />
          <text x="442" y="310">ld it</text>
        </g>
        <g ref={guidesRef} opacity="0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d={`M ${SCENE.dotX} 100 V 285`} strokeDasharray="5 7" />
          <path d={`M ${SCENE.dotX - 20} ${SCENE.dotY} H ${SCENE.dotX + 20} M ${SCENE.dotX} ${SCENE.dotY - 20} V ${SCENE.dotY + 20}`} />
        </g>
        <g ref={carriageRef} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <g aria-hidden="true">
            <path d="M -500 0 H 0" />
            <g ref={upperRef}><path d="M 0 0 L 28 -25 L 56 -7" /></g>
            <g ref={lowerRef}><path d="M 0 0 L 28 25 L 56 7" /></g>
            <circle r="9" fill="var(--craft-surface)" />
          </g>
        </g>
        <g ref={dotRef} fill="currentColor"><circle r={SCENE.radius} /></g>
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
