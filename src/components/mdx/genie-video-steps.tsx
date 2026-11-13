"use client";

import { useId, useState, type ReactNode } from "react";

import { RangeControl } from "@/components/mdx/craft-controls";

// Small dashed diagrams for the Genie Video tutorial. Each one shows the idea behind one step.
// The interactive ones (grid, scroll, bend) run the same maths as the real component, in plain JS,
// so dragging a slider shows exactly what the shader does.

const ACCENT = "var(--craft-accent)";

function Figure({ caption, children, controls }: { caption: string; children: ReactNode; controls?: ReactNode }) {
  return (
    <figure className="not-prose my-6 border border-dashed border-foreground/25 bg-(--craft-surface) text-foreground">
      <div className="p-4 sm:p-6 [&>svg]:mx-auto [&>svg]:max-w-2xl">{children}</div>
      {controls ? <div className="grid gap-3 border-t border-dashed border-foreground/20 p-4 sm:grid-cols-2">{controls}</div> : null}
      <figcaption className="border-t border-dashed border-foreground/20 px-4 py-2.5 font-mono text-[11px] leading-5 text-(--craft-muted)">
        {caption}
      </figcaption>
    </figure>
  );
}

// A dashed box with a label above it, in SVG units.
function Box({ x, y, w, h, label, accent, dash = "4 4", r = 6 }: { x: number; y: number; w: number; h: number; label?: string; accent?: boolean; dash?: string; r?: number }) {
  const stroke = accent ? ACCENT : "currentColor";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={stroke} strokeOpacity={accent ? 1 : 0.5} strokeDasharray={dash} />
      {label ? (
        <text x={x + 6} y={y + 13} fontSize="9" fill={stroke} fillOpacity={accent ? 1 : 0.7} className="font-mono">
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Lines({ x, y, w, rows, gap = 9 }: { x: number; y: number; w: number; rows: number; gap?: number }) {
  return (
    <g fill="currentColor" opacity="0.14">
      {Array.from({ length: rows }, (_, i) => (
        <rect key={i} x={x} y={y + i * gap} width={i % 3 === 2 ? w * 0.6 : w} height="4" rx="2" />
      ))}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, label, marker }: { x1: number; y1: number; x2: number; y2: number; label?: string; marker: string }) {
  return (
    <g stroke="currentColor" strokeOpacity="0.55" fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={`url(#${marker})`} />
      {label ? (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} fontSize="8.5" textAnchor="middle" fill="currentColor" fillOpacity="0.7" stroke="none" className="font-mono">
          {label}
        </text>
      ) : null}
    </g>
  );
}

function ArrowDefs({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" fillOpacity="0.6" />
      </marker>
    </defs>
  );
}

// ---------- 01: the layout ----------

function LayoutFigure() {
  return (
    <Figure caption="Every dashed box is invisible on the real page. Only the canvas draws anything, and it lets clicks fall through.">
      <svg viewBox="0 0 360 230" className="w-full" role="img" aria-label="The scroll box holds an invisible cover box and the article. A canvas lies on top. An invisible dock button sits in the bottom-right corner.">
        <Box x={8} y={8} w={344} h={214} label="scroller · overflow-y: auto" dash="2 3" />
        <Box x={70} y={30} w={180} h={90} label="cover box · invisible · 16:9" accent />
        <Lines x={70} y={134} w={180} rows={8} />
        <Box x={262} y={160} w={80} h={45} label="dock" accent />
        <text x={266} y={196} fontSize="8" fill={ACCENT} className="font-mono">
          &lt;button&gt;
        </text>
        <rect x={14} y={14} width={332} height={202} rx={4} fill={ACCENT} fillOpacity="0.04" stroke={ACCENT} strokeOpacity="0.5" strokeDasharray="1 4" />
        <text x={346} y={26} fontSize="8.5" textAnchor="end" fill={ACCENT} className="font-mono">
          canvas on top · pointer-events: none
        </text>
      </svg>
    </Figure>
  );
}

// ---------- 02: video to texture ----------

function TextureFigure() {
  const marker = `genie-arrow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Figure caption="The <video> never goes on the page. Every frame, its current picture is copied to the GPU and painted onto triangles.">
      <svg viewBox="0 0 360 150" className="w-full" role="img" aria-label="A video element feeds texImage2D, which fills a texture, which is painted onto triangles on the canvas, once per animation frame.">
        <ArrowDefs id={marker} />
        <Box x={8} y={40} w={76} h={50} label="<video>" />
        <text x={14} y={80} fontSize="8" fill="currentColor" fillOpacity="0.55" className="font-mono">
          muted · loop
        </text>
        <Arrow marker={marker} x1={86} y1={65} x2={140} y2={65} label="texImage2D" />
        <Box x={142} y={40} w={76} h={50} label="texture" accent />
        <g stroke={ACCENT} strokeOpacity="0.4">
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={152 + i * 16} y1={60} x2={152 + i * 16} y2={84} />
          ))}
        </g>
        <Arrow marker={marker} x1={220} y1={65} x2={274} y2={65} label="draw" />
        <Box x={276} y={40} w={76} h={50} label="canvas" />
        <g fill="none" stroke="currentColor" strokeOpacity="0.45">
          <path d="M 284 84 L 306 58 L 328 84 Z M 306 58 L 346 58 L 328 84" />
        </g>
        <path d="M 314 100 C 314 140 46 140 46 100" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="3 3" markerEnd={`url(#${marker})`} />
        <text x={180} y={144} fontSize="8.5" textAnchor="middle" fill="currentColor" fillOpacity="0.7" className="font-mono">
          requestAnimationFrame: again, before the next screen refresh
        </text>
      </svg>
    </Figure>
  );
}

// ---------- 03: the grid ----------

function GridFigure() {
  const [n, setN] = useState(4);
  const W = 240;
  const H = 135;
  const ox = 60;
  const oy = 10;
  const cells: ReactNode[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const x0 = ox + (x / n) * W;
      const x1 = ox + ((x + 1) / n) * W;
      const y0 = oy + (y / n) * H;
      const y1 = oy + ((y + 1) / n) * H;
      const first = x === 0 && y === 0;
      cells.push(
        <g key={`${x}-${y}`}>
          <path d={`M ${x0} ${y0} L ${x1} ${y0} L ${x0} ${y1} Z`} fill={first ? ACCENT : "none"} fillOpacity="0.25" />
          <path d={`M ${x1} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`} fill={first ? ACCENT : "none"} fillOpacity="0.12" />
          <path d={`M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z M ${x1} ${y0} L ${x0} ${y1}`} fill="none" stroke="currentColor" strokeOpacity="0.35" />
        </g>,
      );
    }
  }
  const dots: ReactNode[] = [];
  for (let y = 0; y <= n; y++) {
    for (let x = 0; x <= n; x++) {
      dots.push(<circle key={`${x}-${y}`} cx={ox + (x / n) * W} cy={oy + (y / n) * H} r={n > 8 ? 1.5 : 2.5} fill={ACCENT} />);
    }
  }
  return (
    <Figure
      caption={`${(n + 1) ** 2} points, ${2 * n * n} triangles. The highlighted cell is the first two triangles in the index list. The real component uses 32 × 32.`}
      controls={<RangeControl label="Grid cells per side" value={n} min={1} max={12} step={1} onChange={setN} />}
    >
      <svg viewBox="0 0 360 160" className="w-full" role="img" aria-label={`A ${n} by ${n} grid of cells, each split into two triangles.`}>
        {cells}
        {dots}
        <text x={ox - 6} y={oy + 4} fontSize="8.5" textAnchor="end" fill="currentColor" fillOpacity="0.7" className="font-mono">
          (0, 0)
        </text>
        <text x={ox + W + 6} y={oy + H + 4} fontSize="8.5" fill="currentColor" fillOpacity="0.7" className="font-mono">
          (1, 1)
        </text>
      </svg>
    </Figure>
  );
}

// ---------- 04: scroll and the frozen start box ----------

function ScrollFigure() {
  const [scroll, setScroll] = useState(40);
  const coverY = 24;
  const coverH = 90;
  const progress = Math.min(1, Math.max(0, scroll / (coverH * 0.7)));
  return (
    <Figure
      caption="Scrolling moves the real cover box up (dotted). The start box the video leaves from stays where the cover began (dashed), so the article slides under the video instead of dragging it away."
      controls={
        <>
          <RangeControl label="Scroll position" value={scroll} min={0} max={120} step={1} unit="px" onChange={setScroll} />
          <div className="grid content-center gap-2 border border-(--demo-border) bg-(--demo-bg) p-3.5 text-xs">
            <span className="flex justify-between font-mono">
              <span className="text-(--demo-muted)">progress = fit(scroll, 0, 0.7 × cover height)</span>
              <span className="tabular-nums">{progress.toFixed(2)}</span>
            </span>
            <span className="h-1.5 bg-(--demo-track)">
              <span className="block h-full bg-(--craft-accent)" style={{ width: `${progress * 100}%` }} />
            </span>
          </div>
        </>
      }
    >
      <svg viewBox="0 0 360 200" className="w-full" role="img" aria-label={`Scrolled ${scroll} pixels; progress ${progress.toFixed(2)}.`}>
        <clipPath id="genie-scroll-clip">
          <rect x={60} y={8} width={240} height={184} rx={4} />
        </clipPath>
        <rect x={60} y={8} width={240} height={184} rx={4} fill="none" stroke="currentColor" strokeOpacity="0.4" />
        <text x={56} y={18} fontSize="8.5" textAnchor="end" fill="currentColor" fillOpacity="0.6" className="font-mono">
          viewport
        </text>
        <g clipPath="url(#genie-scroll-clip)">
          <g transform={`translate(0 ${-scroll})`}>
            <rect x={100} y={coverY} width={160} height={coverH} rx={6} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeDasharray="1 3" />
            <text x={106} y={coverY + coverH - 8} fontSize="8" fill="currentColor" fillOpacity="0.55" className="font-mono">
              real cover box
            </text>
            <Lines x={100} y={coverY + coverH + 16} w={160} rows={14} />
          </g>
        </g>
        <Box x={100} y={coverY} w={160} h={coverH} label="start box (frozen)" accent />
        <Box x={236} y={152} w={56} h={32} label="dock" accent />
      </svg>
    </Figure>
  );
}

// ---------- 05: the bend (same maths as the vertex shader) ----------

type Rect = { x: number; y: number; w: number; h: number };

const smoothstep = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function warp(x: number, y: number, progress: number, from: Rect, to: Rect, spread: number) {
  const lag = (Math.pow(1 - x, 1.5) + Math.pow(1 - y, 1.5)) * 0.5;
  const p = smoothstep(lag * spread, 0.7 + lag * spread, progress);
  const X = from.x + (to.x - from.x) * p;
  const Y = from.y + (to.y - from.y) * p;
  const W = from.w + (to.w - from.w) * p;
  const H = from.h + (to.h - from.h) * p;
  const angle = Math.sin(p * Math.PI) * -0.05;
  const lx = (x - 0.5) * W;
  const ly = (y - 0.5) * H;
  return {
    x: X + W / 2 + Math.cos(angle) * lx - Math.sin(angle) * ly,
    y: Y + H / 2 + Math.sin(angle) * lx + Math.cos(angle) * ly,
    lag,
  };
}

function BendFigure({ showDelayToggle = true }: { showDelayToggle?: boolean }) {
  const [progress, setProgress] = useState(0.45);
  const [delay, setDelay] = useState(true);
  const from: Rect = { x: 20, y: 14, w: 200, h: 112 };
  const to: Rect = { x: 262, y: 156, w: 82, h: 46 };
  const N = 10;
  const spread = delay ? 0.3 : 0;
  const pts = Array.from({ length: N + 1 }, (_, j) =>
    Array.from({ length: N + 1 }, (_, i) => warp(i / N, j / N, progress, from, to, spread)),
  );
  const cells: ReactNode[] = [];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = pts[j][i];
      const b = pts[j][i + 1];
      const c = pts[j + 1][i + 1];
      const d = pts[j + 1][i];
      const lag = (a.lag + c.lag) / 2;
      cells.push(
        <path
          key={`${i}-${j}`}
          d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${d.x} ${d.y} Z`}
          fill={ACCENT}
          fillOpacity={0.12 + 0.55 * (1 - lag)}
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.6"
        />,
      );
    }
  }
  const lead = pts[N][N];
  const trail = pts[0][0];
  return (
    <Figure
      caption={
        delay
          ? "Darker cells have less lag. The bottom-right corner (dot) leads and the top-left (ring) trails, so the sheet stretches between them."
          : "Delay off: every point uses the same progress, so the sheet just shrinks into the dock as a flat rectangle."
      }
      controls={
        <>
          <RangeControl label="u_progress" value={progress} min={0} max={1} step={0.01} decimals={2} onChange={setProgress} />
          {showDelayToggle ? (
            <button
              type="button"
              aria-pressed={delay}
              onClick={() => setDelay((v) => !v)}
              className="grid content-center gap-1 border border-(--demo-border) bg-(--demo-bg) p-3.5 text-left text-xs transition-colors hover:bg-(--demo-bar) focus-visible:ring-2 focus-visible:ring-(--craft-accent)/25 focus-visible:outline-none"
            >
              <span className="font-heading text-(--demo-muted)">Per-point delay</span>
              <span className="font-mono text-[11px]">{delay ? "on · lag × 0.3" : "off · lag × 0.0"}</span>
            </button>
          ) : null}
        </>
      }
    >
      <svg viewBox="0 0 360 216" className="w-full" role="img" aria-label={`The video sheet at progress ${progress.toFixed(2)}, ${delay ? "bending" : "not bending"} toward the dock.`}>
        <Box x={from.x} y={from.y} w={from.w} h={from.h} label="from" />
        <Box x={to.x} y={to.y} w={to.w} h={to.h} label="to" />
        {cells}
        <circle cx={lead.x} cy={lead.y} r="3.5" fill={ACCENT} />
        <circle cx={trail.x} cy={trail.y} r="3.5" fill="none" stroke={ACCENT} strokeWidth="1.5" />
      </svg>
    </Figure>
  );
}

// ---------- 06: pixels to clip space ----------

function ClipSpaceFigure() {
  const marker = `genie-arrow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Figure caption="Same point, two coordinate systems. clip = screen / u_res × 2 − 1, then flip y. (240, 60) on a 320 × 200 canvas becomes (0.5, 0.4).">
      <svg viewBox="0 0 360 170" className="w-full" role="img" aria-label="Left: CSS pixels with the origin top-left and y pointing down. Right: clip space from -1 to 1 with the origin in the centre and y pointing up.">
        <ArrowDefs id={marker} />
        <text x={14} y={14} fontSize="9" fill="currentColor" fillOpacity="0.75" className="font-mono">
          CSS pixels (DOM)
        </text>
        <rect x={14} y={24} width={160} height={100} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeDasharray="4 4" />
        <Arrow marker={marker} x1={14} y1={24} x2={60} y2={24} />
        <Arrow marker={marker} x1={14} y1={24} x2={14} y2={62} />
        <text x={62} y={20} fontSize="8" fill="currentColor" fillOpacity="0.6" className="font-mono">x →</text>
        <text x={18} y={70} fontSize="8" fill="currentColor" fillOpacity="0.6" className="font-mono">y ↓</text>
        <text x={14} y={138} fontSize="8" fill="currentColor" fillOpacity="0.6" className="font-mono">(0, 0) top-left · (320, 200)</text>
        <circle cx={14 + 160 * 0.75} cy={24 + 100 * 0.3} r="3.5" fill={ACCENT} />
        <text x={14 + 160 * 0.75 - 6} y={24 + 100 * 0.3 + 3} fontSize="8.5" textAnchor="end" fill={ACCENT} className="font-mono">(240, 60)</text>

        <text x={196} y={14} fontSize="9" fill="currentColor" fillOpacity="0.75" className="font-mono">
          clip space (WebGL)
        </text>
        <rect x={196} y={24} width={150} height={120} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeDasharray="4 4" />
        <line x1={196} y1={84} x2={346} y2={84} stroke="currentColor" strokeOpacity="0.2" />
        <line x1={271} y1={24} x2={271} y2={144} stroke="currentColor" strokeOpacity="0.2" />
        <Arrow marker={marker} x1={271} y1={84} x2={312} y2={84} />
        <Arrow marker={marker} x1={271} y1={84} x2={271} y2={46} />
        <text x={276} y={44} fontSize="8" fill="currentColor" fillOpacity="0.6" className="font-mono">y ↑</text>
        <text x={200} y={158} fontSize="8" fill="currentColor" fillOpacity="0.6" className="font-mono">(−1, −1) … (1, 1), centre (0, 0)</text>
        <circle cx={271 + 75 * 0.5} cy={84 - 60 * 0.4} r="3.5" fill={ACCENT} />
        <text x={271 + 75 * 0.5 - 6} y={84 - 60 * 0.4 - 6} fontSize="8.5" textAnchor="end" fill={ACCENT} className="font-mono">(0.5, 0.4)</text>
      </svg>
    </Figure>
  );
}

// ---------- 07: crop and corners ----------

function CropCornerFigure() {
  const r = 26;
  const cx = 230;
  const cy = 30;
  const q = { x: 14, y: 18 };
  return (
    <Figure caption="Left: the plane is narrower than 16:9, so only the middle of the frame is sampled, like object-fit: cover. Right: a pixel inside the corner square is kept only if it is within r of the corner circle's centre.">
      <svg viewBox="0 0 360 160" className="w-full" role="img" aria-label="A 16:9 video frame with a narrower plane cropped from its centre, and a rounded corner showing the distances to the two edges.">
        <rect x={14} y={30} width={160} height={90} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="4 4" />
        <text x={14} y={24} fontSize="8.5" fill="currentColor" fillOpacity="0.65" className="font-mono">video frame 16:9</text>
        <rect x={54} y={30} width={80} height={90} rx={6} fill={ACCENT} fillOpacity="0.18" stroke={ACCENT} />
        <text x={60} y={44} fontSize="8.5" fill={ACCENT} className="font-mono">plane</text>
        <text x={14} y={138} fontSize="8" fill="currentColor" fillOpacity="0.6" className="font-mono">scale shrinks the sampled area to fit</text>

        <path d={`M ${cx} ${cy + 110} V ${cy + r} A ${r} ${r} 0 0 1 ${cx + r} ${cy} H ${cx + 120}`} fill="none" stroke={ACCENT} strokeWidth="1.5" />
        <rect x={cx} y={cy} width={r} height={r} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="2 3" />
        <circle cx={cx + r} cy={cy + r} r="2" fill="currentColor" fillOpacity="0.6" />
        <circle cx={cx + q.x} cy={cy + q.y} r="3" fill={ACCENT} />
        <line x1={cx} y1={cy + q.y} x2={cx + q.x} y2={cy + q.y} stroke="currentColor" strokeOpacity="0.7" strokeDasharray="2 2" />
        <line x1={cx + q.x} y1={cy} x2={cx + q.x} y2={cy + q.y} stroke="currentColor" strokeOpacity="0.7" strokeDasharray="2 2" />
        <text x={cx - 4} y={cy + q.y + 3} fontSize="8.5" textAnchor="end" fill="currentColor" fillOpacity="0.7" className="font-mono">q.x</text>
        <text x={cx + q.x + 5} y={cy - 4} fontSize="8.5" fill="currentColor" fillOpacity="0.7" className="font-mono">q.y</text>
        <text x={cx + r + 6} y={cy + r + 14} fontSize="8.5" fill="currentColor" fillOpacity="0.7" className="font-mono">r = 16px × dpr</text>
        <text x={cx + 4} y={cy + 130} fontSize="8" fill="currentColor" fillOpacity="0.6" className="font-mono">q = pixels to each edge</text>
      </svg>
    </Figure>
  );
}

// ---------- 08: dock states ----------

function DockFigure() {
  const state = (x: number, title: string, lines: string[], docked: boolean) => (
    <g>
      <text x={x} y={16} fontSize="9" fill="currentColor" fillOpacity="0.8" className="font-mono">{title}</text>
      <rect x={x} y={24} width={150} height={96} rx={4} fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <Lines x={x + 12} y={36} w={100} rows={7} gap={10} />
      {docked ? (
        <rect x={x + 86} y={86} width={56} height={28} rx={5} fill={ACCENT} fillOpacity="0.35" stroke={ACCENT} />
      ) : (
        <rect x={x + 86} y={86} width={56} height={28} rx={5} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="3 3" />
      )}
      {lines.map((line, i) => (
        <text key={line} x={x} y={136 + i * 12} fontSize="8.5" fill={docked ? ACCENT : "currentColor"} fillOpacity={docked ? 1 : 0.6} className="font-mono">
          {line}
        </text>
      ))}
    </g>
  );
  return (
    <Figure caption="The dock is always in the page, but it only accepts clicks and keyboard focus once the video has landed in it.">
      <svg viewBox="0 0 360 170" className="w-full" role="img" aria-label="Before docking the dock button ignores clicks and is skipped by Tab. After docking it accepts clicks and focus.">
        {state(14, "progress < 1", ["pointer-events: none", "tabIndex = -1"], false)}
        {state(196, "progress = 1 · docked", ["pointer-events: auto", "tabIndex = 0 · click → top"], true)}
      </svg>
    </Figure>
  );
}

const FIGURES = {
  layout: LayoutFigure,
  texture: TextureFigure,
  grid: GridFigure,
  scroll: ScrollFigure,
  bend: BendFigure,
  "clip-space": ClipSpaceFigure,
  "crop-corner": CropCornerFigure,
  dock: DockFigure,
};

export function GenieVideoFigure({ step }: { step: keyof typeof FIGURES }) {
  const Component = FIGURES[step];
  return Component ? <Component /> : null;
}
