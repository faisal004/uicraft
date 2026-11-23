"use client";

import { useEffect, useRef } from "react";

type Settings = {
  word: string;
  ink: string;
  paper: string;
};

const THEMES = {
  dark: { ink: "#c8c8c8", paper: "#000000" },
  light: { ink: "#1a1a1a", paper: "#ffffff" },
};

const DEFAULTS: Settings = { word: "UI CRAFT", ...THEMES.dark };

const isDark = () => document.documentElement.classList.contains("dark");

const FONT = "sans-serif";

export function TypeTunnel({ auto = false }: { auto?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const settings = useRef<Settings>({ ...DEFAULTS });
  const refreshPane = useRef(() => {});

  useEffect(() => {
    const apply = () => {
      Object.assign(settings.current, isDark() ? THEMES.dark : THEMES.light);
      refreshPane.current();
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current!;
    const scroller = scrollRef.current;
    const footer = footerRef.current;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let loops = 0;
    let offset = 0;
    let turn = 0;
    let clearTo = 0;
    let targetY = 0;
    let targetSize = 0;
    let y = 0;
    let size = 0;
    let drawn = { word: "", ink: "", paper: "", size: -1, y: -1 };

    const baseSize = (word: string) => {
      ctx.font = `100px ${FONT}`;
      const fit = ctx.measureText("DEVELOPERS").width;
      const own = ctx.measureText(word).width || fit;
      return (Math.min(1728, width) / 6.35) * (fit / own);
    };

    let virtual = 0;
    const getScroll = () => (scroller ? scroller.scrollTop : virtual);
    const setScroll = (value: number) => {
      if (scroller) scroller.scrollTop = value;
      else virtual = value;
    };
    const footerTop = () => (footer ? footer.offsetTop : height);

    const update = () => {
      const s = settings.current;
      const before = offset;
      offset = footerTop() - getScroll() - height;
      turn = -((offset - loops * height) / height);

      let next = baseSize(s.word);
      if (loops > 0) next -= next * Math.sin(turn - 2.2) - 0.1 * next;
      const cap = next - next / 3.6;
      let base = height + cap - turn * height + loops * height;

      clearTo = base - cap;
      targetSize = next;
      targetY = loops > 0 ? base + height : base;

      if (offset + 2 * height < 1) {
        loops += 1;
        setScroll(footerTop());
        base = height + cap - turn * height + loops * height;
        y = base + height;
        targetY = y;
        size = next;
        if (!scroller) update();
      } else if (offset - before > 0 && offset - before < 0.5 * height) {
        loops = 0;
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = root.clientWidth;
      height = root.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawn = { word: "", ink: "", paper: "", size: -1, y: -1 };
      update();
    };
    resize();
    y = targetY;
    size = targetSize;
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    scroller?.addEventListener("scroll", update, { passive: true });

    const stamp = (word: string) => {
      ctx.font = `${size}px ${FONT}`;
      const gap = -size / 20;
      const letters = Array.from(word);
      const total = ctx.measureText(word).width + gap * (letters.length - 1);
      let x = width / 2 - total / 2 + gap / 2;
      for (const letter of letters) {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeText(letter, x, y);
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillText(letter, x, y);
        x += ctx.measureText(letter).width + gap;
      }
      ctx.globalCompositeOperation = "source-over";
    };

    let frame = 0;
    const draw = () => {
      const s = settings.current;
      if (auto) {
        virtual += height * 0.006;
        update();
      }

      if (s.paper !== drawn.paper) {
        root.style.backgroundColor = s.paper;
        if (hintRef.current) hintRef.current.style.color = s.ink;
      }
      if (s.word !== drawn.word || s.ink !== drawn.ink || s.paper !== drawn.paper) {
        ctx.clearRect(0, 0, width, height);
        update();
        drawn = { word: s.word, ink: s.ink, paper: s.paper, size: -1, y: -1 };
      }

      y += (targetY - y) * 0.1;
      size += (targetSize - size) * 0.1;

      if (Math.abs(size - drawn.size) > 0.01 || Math.abs(y - drawn.y) > 0.01) {
        if (clearTo > 0) ctx.clearRect(0, 0, width, clearTo);
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = s.ink;
        ctx.fillStyle = s.paper;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        stamp(s.word);
        drawn.size = size;
        drawn.y = y;
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller?.removeEventListener("scroll", update);
    };
  }, [auto]);

  useEffect(() => {
    if (auto) return;
    let disposed = false;
    let dispose = () => {};
    import("tweakpane").then(({ Pane }) => {
      if (disposed) return;
      const s = settings.current;
      const pane = new Pane({ container: paneRef.current!, title: "Footer", expanded: window.innerWidth >= 640 });
      pane.addBinding(s, "word", { label: "Word" });
      pane.addBinding(s, "ink", { label: "Ink" });
      pane.addBinding(s, "paper", { label: "Paper" });
      pane.addButton({ title: "Reset" }).on("click", () => {
        Object.assign(s, DEFAULTS, isDark() ? THEMES.dark : THEMES.light);
        pane.refresh();
        scrollRef.current?.scrollTo({ top: 0 });
      });
      refreshPane.current = () => pane.refresh();
      dispose = () => {
        refreshPane.current = () => {};
        pane.dispose();
      };
    });
    return () => {
      disposed = true;
      dispose();
    };
  }, [auto]);

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden" style={{ backgroundColor: DEFAULTS.paper }}>
      {!auto && (
        <div
          ref={scrollRef}
          tabIndex={0}
          aria-label="Scroll to the bottom, then keep scrolling."
          className="absolute inset-0 overflow-y-auto overscroll-contain outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-(--craft-accent) focus-visible:ring-inset"
        >
          <div
            ref={hintRef}
            className="flex h-full items-center justify-center font-mono text-xs tracking-[0.2em] uppercase opacity-60"
            style={{ color: DEFAULTS.ink }}
          >
            Scroll to the bottom ↓
          </div>
          <div ref={footerRef} aria-hidden="true" className="h-[200%]" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`The word ${DEFAULTS.word} stamped again and again as you scroll, leaving a wireframe trail of outlines behind it.`}
        className="pointer-events-none absolute inset-0 block size-full"
      />
      {!auto && <div ref={paneRef} data-og-hide className="absolute top-3 right-3 z-10 w-60" />}
    </div>
  );
}

export function TypeTunnelDemo() {
  return (
    <div className="craft-fill relative min-h-[30rem] w-full overflow-hidden sm:min-h-[36rem]">
      <TypeTunnel />
    </div>
  );
}

export function TypeTunnelThumbnail() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <TypeTunnel auto />
    </div>
  );
}
