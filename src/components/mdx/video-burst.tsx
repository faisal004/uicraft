"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { CraftFrame } from "@/components/mdx/craft-controls";
import {
  DEFAULT_SETTINGS,
  EFFECTS,
  settingsForEffect,
  startVideoBurst,
  type BurstSettings,
  type EffectName,
} from "@/components/mdx/video-burst-engine";

// A hero video that breaks apart as you scroll: into dots, jigsaw pieces, droplets, glass shards,
// melting columns, paper flakes, or a vortex. A Tweakpane panel switches the effect, turns physics
// on or off, and tunes the motion. The drawing and motion live in video-burst-engine.ts.

const effectOptions = Object.fromEntries(
  (Object.keys(EFFECTS) as EffectName[]).map((name) => [EFFECTS[name].label, name]),
);

// Knobs that only mean something for one effect, shown only while that effect is picked.
const EFFECT_KNOBS: { key: keyof BurstSettings; effect: EffectName; label: string; min: number; max: number }[] = [
  { key: "tab", effect: "jigsaw", label: "Tab size", min: 0.08, max: 0.24 },
  { key: "stretch", effect: "droplets", label: "Stretch", min: 0, max: 3 },
  { key: "cracks", effect: "shatter", label: "Cracks", min: 0, max: 1 },
  { key: "drip", effect: "melt", label: "Drip", min: 0, max: 2 },
  { key: "flutter", effect: "flakes", label: "Flutter", min: 0, max: 3 },
  { key: "twist", effect: "vortex", label: "Twist", min: -3, max: 3 },
];

export function VideoBurst({
  src,
  poster,
  scroll = "container",
  controls = "simple",
  initialEffect = "burst",
  children,
}: {
  src: string;
  poster?: string;
  // "container": the hero is its own scroll box (for embedding in a page).
  // "page": the hero is a tall section and the page scroll drives it.
  scroll?: "container" | "page";
  // "simple": effect and physics only. "full": every knob.
  controls?: "simple" | "full";
  initialEffect?: EffectName;
  children?: ReactNode; // hero copy, faded out as the video breaks
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReturnType<typeof startVideoBurst> | null>(null);
  // One mutable settings object: Tweakpane edits it in place and the engine reads it every frame.
  const settings = useRef<BurstSettings>(settingsForEffect(DEFAULT_SETTINGS, initialEffect));

  useEffect(() => {
    const track = trackRef.current!;
    const getProgress = () => {
      if (scroll === "container") {
        const range = track.scrollHeight - track.clientHeight;
        return range > 0 ? Math.min(1, Math.max(0, track.scrollTop / range)) : 0;
      }
      // Page mode: how far the section has scrolled past the top of the window, out of the
      // distance it can scroll while the stage is stuck.
      const rect = track.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      return range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
    };

    const engine = startVideoBurst(canvasRef.current!, videoRef.current!, settings, {
      getProgress,
      onProgress: (progress) => {
        // Style writes through refs, so React doesn't re-render every frame.
        if (copyRef.current) {
          copyRef.current.style.opacity = String(1 - Math.min(1, progress * 3));
          copyRef.current.style.transform = `translateY(${-progress * 60}px)`;
        }
        hintRef.current!.style.opacity = String(1 - Math.min(1, progress * 6));
      },
      onReady: () => {
        if (posterRef.current) posterRef.current.style.opacity = "0";
      },
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [scroll]);

  // The Tweakpane panel. Imported on the client only, since it builds DOM as soon as it loads.
  useEffect(() => {
    let disposed = false;
    let dispose = () => {};
    import("tweakpane").then(({ Pane }) => {
      if (disposed) return;
      const s = settings.current;
      const pane = new Pane({ container: paneRef.current!, title: "Effect", expanded: window.innerWidth >= 640 });
      const knobs: { effect: EffectName; binding: { hidden: boolean } }[] = [];
      const showKnobs = () => {
        for (const knob of knobs) knob.binding.hidden = knob.effect !== s.effect;
      };

      pane.addBinding(s, "effect", { label: "Effect", options: effectOptions }).on("change", (event) => {
        Object.assign(s, settingsForEffect(s, event.value as EffectName));
        showKnobs();
        pane.refresh();
      });
      pane.addBinding(s, "physics", { label: "Physics" });

      if (controls === "full") {
        pane.addBinding(s, "origin", {
          label: "Break from",
          options: { Centre: "center", Top: "top", Bottom: "bottom", Left: "left", Right: "right", Click: "click" },
        });
        const motion = pane.addFolder({ title: "Motion" });
        motion.addBinding(s, "pieceSize", { label: "Piece size", min: 4, max: 96, step: 1 });
        motion.addBinding(s, "gravity", { label: "Gravity", min: 0, max: 3 });
        motion.addBinding(s, "bounce", { label: "Bounce", min: 0, max: 0.95 });
        motion.addBinding(s, "wind", { label: "Wind", min: -2, max: 2 });
        motion.addBinding(s, "spread", { label: "Spread", min: 0, max: 2 });
        motion.addBinding(s, "spin", { label: "Spin", min: 0, max: 3 });
        motion.addBinding(s, "glow", { label: "Glow", min: 0, max: 1.5 });
        for (const knob of EFFECT_KNOBS) {
          knobs.push({
            effect: knob.effect,
            binding: motion.addBinding(s, knob.key, { label: knob.label, min: knob.min, max: knob.max }),
          });
        }
        pane.addButton({ title: "Reset to effect defaults" }).on("click", () => {
          Object.assign(s, settingsForEffect({ ...DEFAULT_SETTINGS, physics: s.physics }, s.effect));
          pane.refresh();
        });
        showKnobs();
      }
      dispose = () => pane.dispose();
    });
    return () => {
      disposed = true;
      dispose();
    };
  }, [controls]);

  // Clicking the hero sets where "Break from: Click" starts.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (paneRef.current?.contains(event.target as Node)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    engineRef.current?.setClickPoint((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  };

  const page = scroll === "page";

  return (
    <div
      ref={trackRef}
      tabIndex={page ? undefined : 0}
      aria-label={page ? undefined : "Hero video. Scroll inside it to break the video apart."}
      className={
        page
          ? "relative bg-[#07080b] text-white"
          : "relative h-[30rem] overflow-y-auto overscroll-contain bg-[#07080b] text-white outline-none focus-visible:ring-2 focus-visible:ring-(--craft-accent) focus-visible:ring-inset"
      }
    >
      {/* The stage stays stuck in view while the spacer below gives the scroll its length. */}
      <div onPointerDown={onPointerDown} className={`sticky top-0 overflow-hidden ${page ? "h-svh" : "h-full"}`}>
        {/* The video is only a texture source: it's never shown, WebGL draws it as pieces. */}
        <video ref={videoRef} src={src} muted loop playsInline preload="auto" className="hidden" />
        {poster ? (
          // Shown until the first video frame is drawn, then faded out.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={posterRef}
            src={poster}
            alt=""
            className="absolute inset-0 size-full object-cover transition-opacity duration-300"
          />
        ) : null}
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
        {/* A soft shade behind the copy so it reads over a bright frame. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/30" />
        {children ? (
          <div
            ref={copyRef}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          >
            {children}
          </div>
        ) : null}
        <p
          ref={hintRef}
          className="pointer-events-none absolute inset-x-0 bottom-6 text-center font-mono text-[10px] tracking-[0.3em] text-white/70 uppercase"
        >
          Scroll ↓
        </p>
        <div ref={paneRef} className={`absolute top-3 right-3 z-10 ${page ? "w-72" : "w-56"}`} />
      </div>
      <div aria-hidden="true" className={page ? "h-[200svh]" : "h-[200%]"} />
    </div>
  );
}

export function VideoBurstDemo() {
  return (
    <CraftFrame label="Video burst" meta="WebGL · scroll">
      <VideoBurst src="/burst-video-720.mp4" poster="/burst-video-poster.jpg">
        <p className="font-mono text-[10px] tracking-[0.3em] text-white/70 uppercase">Above the treeline</p>
        <h3 className="mt-3 font-heading text-3xl text-white sm:text-5xl">Still water</h3>
      </VideoBurst>
    </CraftFrame>
  );
}
