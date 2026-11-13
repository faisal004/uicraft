"use client";

import { useEffect, useRef, useState } from "react";

import { GenieDock, useNow, type DockSlot } from "@/components/mdx/genie-dock";

// Minimise-to-dock genie on a small fake desktop. Every window (title bar + contents) is painted into
// its own 2D canvas and drawn as one WebGL plane.
// Clicking minimise runs a 0→1 progress over a fixed time; the vertex shader does two overlapping
// phases: the window's sides bend into a funnel aimed at the dock slot, then the picture slides
// down through the funnel, every row squeezing as it reaches the narrow neck.

const COLS = 16;
const ROWS = 64; // all the bending is vertical, so the grid needs far more rows than columns
const RADIUS = 12;
const BAR = 34; // title bar height in CSS px
const LIGHTS = [20, 40, 60]; // traffic-light centres from the left, in CSS px
const LIGHT_R = 6;
const DURATION = 650; // ms
const TEX_W = 1280;

const vertexShader = /* glsl */ `
attribute vec2 a_pos; // 0..1, y-down like the DOM
uniform vec2 u_res;
uniform vec2 u_fromXY;
uniform vec2 u_fromWH;
uniform vec2 u_toXY;
uniform vec2 u_toWH;
uniform float u_progress;
varying vec2 v_uv;

void main() {
  // Phase 1: the funnel opens. Phase 2 starts before it finishes: the picture slides down.
  float bend = smoothstep(0.0, 0.4, u_progress);
  float slide = smoothstep(0.2, 1.0, u_progress);

  // Each row slides on its own clock. Bottom rows (a_pos.y = 1) leave first, top rows last,
  // so the window drains into the slot instead of dropping as a block.
  float rowSlide = smoothstep(0.0, 1.0, clamp(slide * 1.6 - (1.0 - a_pos.y) * 0.6, 0.0, 1.0));

  float fromRowY = u_fromXY.y + a_pos.y * u_fromWH.y;
  float toRowY = u_toXY.y + a_pos.y * u_toWH.y;
  float y = mix(fromRowY, toRowY, rowSlide);

  // The funnel depends on where the row is on screen, not where it is in the picture:
  // full window width at the window's top, slot width at the slot's top, an S-curve between.
  float neck = smoothstep(u_fromXY.y, u_toXY.y, y) * bend;
  float left = mix(u_fromXY.x, u_toXY.x, neck);
  float right = mix(u_fromXY.x + u_fromWH.x, u_toXY.x + u_toWH.x, neck);

  vec2 screen = vec2(mix(left, right, a_pos.x), y);
  vec2 clip = screen / u_res * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_uv = a_pos;
}
`;

const fragmentShader = /* glsl */ `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform sampler2D u_tex;
uniform float u_radius;
uniform float u_dpr;
varying vec2 v_uv;

// Pixels from this fragment to the rounded outline, measured on screen so it holds up while squeezed.
float edgeDistance(vec2 uv, float r) {
  vec2 pxPerUv = 1.0 / vec2(
    length(vec2(dFdx(uv.x), dFdy(uv.x))),
    length(vec2(dFdx(uv.y), dFdy(uv.y)))
  );
  vec2 q = min(uv, 1.0 - uv) * pxPerUv;
  if (q.x < r && q.y < r) return r - length(vec2(r) - q);
  return min(q.x, q.y);
}

void main() {
  vec3 color = texture2D(u_tex, v_uv).rgb;
  float alpha = clamp(edgeDistance(v_uv, u_radius * u_dpr) + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function buildGrid() {
  const positions: number[] = [];
  for (let y = 0; y <= ROWS; y++) for (let x = 0; x <= COLS; x++) positions.push(x / COLS, y / ROWS);
  const indices: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = y * (COLS + 1) + x;
      indices.push(i, i + 1, i + COLS + 1, i + 1, i + COLS + 2, i + COLS + 1);
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint16Array(indices) };
}

// ---------- painting the windows ----------

type Theme = "dark" | "light";

// Title bar shared by every window: gradient, hairlines, traffic lights (glyphs on hover), centred title.
function paintChrome(ctx: CanvasRenderingContext2D, s: number, title: string, hover: boolean, theme: Theme) {
  const W = ctx.canvas.width;
  const bar = BAR * s;
  const grad = ctx.createLinearGradient(0, 0, 0, bar);
  grad.addColorStop(0, theme === "dark" ? "#3a3a40" : "#f4f4f4");
  grad.addColorStop(1, theme === "dark" ? "#2c2c31" : "#e2e2e2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, bar);
  ctx.fillStyle = theme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.9)";
  ctx.fillRect(0, 0, W, s);
  ctx.fillStyle = theme === "dark" ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.13)";
  ctx.fillRect(0, bar - s, W, s);

  const colors = ["#ff5f57", "#febc2e", "#28c840"];
  const cy = bar / 2;
  LIGHTS.forEach((x, i) => {
    const cx = x * s;
    ctx.beginPath();
    ctx.arc(cx, cy, LIGHT_R * s, 0, Math.PI * 2);
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.lineWidth = 0.75 * s;
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.stroke();
    if (!hover) return;
    ctx.strokeStyle = "rgba(60,20,10,0.75)";
    ctx.lineWidth = 1.2 * s;
    ctx.lineCap = "round";
    const g = 2.6 * s;
    ctx.beginPath();
    if (i === 0) {
      ctx.moveTo(cx - g, cy - g);
      ctx.lineTo(cx + g, cy + g);
      ctx.moveTo(cx + g, cy - g);
      ctx.lineTo(cx - g, cy + g);
    } else if (i === 1) {
      ctx.moveTo(cx - g - 0.6 * s, cy);
      ctx.lineTo(cx + g + 0.6 * s, cy);
    } else {
      ctx.moveTo(cx - g, cy);
      ctx.lineTo(cx + g, cy);
      ctx.moveTo(cx, cy - g);
      ctx.lineTo(cx, cy + g);
    }
    ctx.stroke();
  });

  ctx.fillStyle = theme === "dark" ? "#d9d9df" : "#3d3d42";
  ctx.font = `600 ${12.5 * s}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, bar / 2 + 0.5 * s);
}

function paintPlayer(ctx: CanvasRenderingContext2D, s: number, video: HTMLVideoElement) {
  const { width: W, height: H } = ctx.canvas;
  const bar = BAR * s;
  ctx.fillStyle = "#121215";
  ctx.fillRect(0, 0, W, H);
  if (video.readyState < 2) return;
  const scale = Math.max(W / video.videoWidth, (H - bar) / video.videoHeight);
  const dw = video.videoWidth * scale;
  const dh = video.videoHeight * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, bar, W, H - bar);
  ctx.clip();
  ctx.drawImage(video, (W - dw) / 2, bar + (H - bar - dh) / 2, dw, dh);
  ctx.restore();
}

// A short shell session that types itself out, holds, and starts again.
type Line = { kind: "cmd" | "out"; text: string; color?: string; bold?: boolean };
const SESSION: Line[] = [
  { kind: "out", text: "Last login: Fri Nov 13 09:41:02 on ttys001", color: "#9aa0a6" },
  { kind: "cmd", text: "cd ~/projects/uicraft" },
  { kind: "cmd", text: "git status --short" },
  { kind: "out", text: " M src/components/mdx/genie-minimize.tsx", color: "#ff7b72" },
  { kind: "out", text: "?? src/components/mdx/genie-dock.tsx", color: "#ff7b72" },
  { kind: "cmd", text: "npm run dev" },
  { kind: "out", text: "> uicraft@0.1.0 dev", color: "#9aa0a6" },
  { kind: "out", text: "> next dev", color: "#9aa0a6" },
  { kind: "out", text: "" },
  { kind: "out", text: "  ▲ Next.js 16.3.4 (Turbopack)", color: "#ffffff", bold: true },
  { kind: "out", text: "  - Local:   http://localhost:3000" },
  { kind: "out", text: "  ✓ Ready in 133ms", color: "#7ee787" },
];
const TYPE_RATE = 16; // characters per second
const PROMPT = "guest@desktop ~ % ";

function paintTerminal(ctx: CanvasRenderingContext2D, s: number, t: number) {
  const { width: W, height: H } = ctx.canvas;
  const bar = BAR * s;
  ctx.fillStyle = "#1c1c1f";
  ctx.fillRect(0, bar, W, H - bar);

  // Lay the script out on a timeline: commands type, outputs pop in.
  let clock = 0.4;
  const timed = SESSION.map((line) => {
    const start = clock + (line.kind === "cmd" ? 0.5 : 0.08);
    const end = start + (line.kind === "cmd" ? line.text.length / TYPE_RATE : 0);
    clock = end + (line.kind === "cmd" ? 0.35 : 0.06);
    return { ...line, start, end };
  });
  const loop = clock + 4;
  const now = t % loop;

  const size = 12.5 * s;
  const lineH = 18 * s;
  const left = 14 * s;
  let y = bar + 18 * s;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const draw = (text: string, x: number, color: string, bold = false) => {
    ctx.font = `${bold ? 700 : 400} ${size}px ui-monospace, "SF Mono", Menlo, monospace`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    return x + ctx.measureText(text).width;
  };

  let cursorX = left;
  let cursorY = y;
  for (const line of timed) {
    if (now < line.start) break;
    if (line.kind === "cmd") {
      let x = draw("guest@desktop", left, "#7ee787", true);
      x = draw(PROMPT.slice("guest@desktop".length), x, "#e6e6e6");
      const shown = line.text.slice(0, Math.floor((now - line.start) * TYPE_RATE));
      x = draw(shown, x, "#e6e6e6");
      cursorX = x;
      cursorY = y;
    } else {
      draw(line.text, left, line.color ?? "#e6e6e6", line.bold);
      cursorX = left;
      cursorY = y + lineH;
    }
    y += lineH;
  }
  // After the last output, a fresh prompt.
  if (now >= timed[timed.length - 1].start + 0.3) {
    let x = draw("guest@desktop", left, "#7ee787", true);
    x = draw(PROMPT.slice("guest@desktop".length), x, "#e6e6e6");
    cursorX = x;
    cursorY = y;
  }
  if (Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = "#e6e6e6";
    ctx.fillRect(cursorX + 1 * s, cursorY - size * 0.55, size * 0.6, size * 1.1);
  }
}

const EVENTS: { offset: number; text: string; color: string }[] = [
  { offset: 0, text: "Ship genie demo", color: "#8b5cf6" },
  { offset: 2, text: "Design review", color: "#3b82f6" },
  { offset: -3, text: "Gym", color: "#22c55e" },
  { offset: 6, text: "Team lunch", color: "#f97316" },
  { offset: 9, text: "1:1", color: "#ec4899" },
];

function paintCalendar(ctx: CanvasRenderingContext2D, s: number, now: Date) {
  const { width: W, height: H } = ctx.canvas;
  const bar = BAR * s;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, bar, W, H - bar);

  const year = now.getFullYear();
  const month = now.getMonth();
  const sans = "ui-sans-serif, system-ui, -apple-system, sans-serif";

  // Header: month and year, then the Today pill and arrows on the right.
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const headY = bar + 26 * s;
  ctx.font = `700 ${20 * s}px ${sans}`;
  ctx.fillStyle = "#1d1d1f";
  const monthName = now.toLocaleDateString("en", { month: "long" });
  ctx.fillText(monthName, 18 * s, headY);
  const mw = ctx.measureText(monthName).width;
  ctx.font = `400 ${20 * s}px ${sans}`;
  ctx.fillStyle = "#8e8e93";
  ctx.fillText(` ${year}`, 18 * s + mw, headY);

  ctx.font = `500 ${11 * s}px ${sans}`;
  const pillW = 44 * s;
  const pillX = W - 18 * s - pillW - 40 * s;
  ctx.strokeStyle = "#d1d1d6";
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.roundRect(pillX, headY - 10 * s, pillW, 20 * s, 5 * s);
  ctx.stroke();
  ctx.fillStyle = "#1d1d1f";
  ctx.textAlign = "center";
  ctx.fillText("Today", pillX + pillW / 2, headY);
  ctx.fillStyle = "#8e8e93";
  ctx.font = `600 ${14 * s}px ${sans}`;
  ctx.fillText("‹", W - 18 * s - 28 * s, headY);
  ctx.fillText("›", W - 18 * s - 8 * s, headY);

  // Weekday row.
  const gridTop = bar + 52 * s;
  const cols = 7;
  const cellW = W / cols;
  ctx.font = `600 ${10 * s}px ${sans}`;
  ctx.fillStyle = "#8e8e93";
  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach((day, i) => {
    ctx.textAlign = "right";
    ctx.fillText(day, (i + 1) * cellW - 8 * s, gridTop);
  });

  // Six weeks of days, starting on the Sunday on or before the 1st.
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const rowsTop = gridTop + 12 * s;
  const rows = 6;
  const cellH = (H - rowsTop) / rows;
  ctx.strokeStyle = "#ececef";
  ctx.lineWidth = 1 * s;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, rowsTop + r * cellH);
    ctx.lineTo(W, rowsTop + r * cellH);
    ctx.stroke();
  }
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, rowsTop);
    ctx.lineTo(c * cellW, H);
    ctx.stroke();
  }

  const today = new Date(year, month, now.getDate()).getTime();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + r * 7 + c);
      const x = (c + 1) * cellW - 8 * s;
      const y = rowsTop + 13 * s + r * cellH;
      const inMonth = date.getMonth() === month;
      const isToday = date.getTime() === today;
      ctx.font = `${isToday ? 700 : 500} ${11.5 * s}px ${sans}`;
      ctx.textAlign = "right";
      if (isToday) {
        const label = String(date.getDate());
        const w = Math.max(ctx.measureText(label).width + 10 * s, 20 * s);
        ctx.fillStyle = "#ff3b30";
        ctx.beginPath();
        ctx.roundRect(x - w + 5 * s, y - 10 * s, w, 20 * s, 10 * s);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.fillStyle = inMonth ? (c === 0 || c === 6 ? "#8e8e93" : "#1d1d1f") : "#c7c7cc";
      }
      ctx.fillText(String(date.getDate()), x, y);

      const offset = Math.round((date.getTime() - today) / 86400000);
      const event = EVENTS.find((e) => e.offset === offset);
      if (event && cellH > 34 * s) {
        const ex = c * cellW + 4 * s;
        const ey = y + 12 * s;
        ctx.fillStyle = event.color;
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.roundRect(ex, ey, cellW - 8 * s, 15 * s, 3 * s);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillRect(ex, ey, 2.5 * s, 15 * s);
        ctx.font = `500 ${9.5 * s}px ${sans}`;
        ctx.textAlign = "left";
        ctx.fillStyle = event.color;
        ctx.save();
        ctx.beginPath();
        ctx.rect(ex, ey, cellW - 10 * s, 15 * s);
        ctx.clip();
        ctx.fillText(event.text, ex + 6 * s, ey + 7.5 * s);
        ctx.restore();
      }
    }
  }
}

// ---------- the windows ----------

type WinId = "player" | "terminal" | "calendar";
type Mode = "open" | "minimised" | "closed";

const WINDOWS: { id: WinId; app: string; title: string; theme: Theme; ratio: number; place: React.CSSProperties; zoomWidth: string }[] = [
  {
    id: "calendar",
    app: "Calendar",
    title: "Calendar",
    theme: "light",
    ratio: 0.8,
    place: { right: "5vw", top: "calc(1.75rem + 34vh)", width: "min(470px, 40vw)" },
    zoomWidth: "min(900px, 90vw, calc((100svh - 10rem) / 0.8))",
  },
  {
    id: "terminal",
    app: "Terminal",
    title: "guest — zsh — 80×24",
    theme: "dark",
    ratio: 0.6,
    place: { right: "9vw", top: "calc(1.75rem + 4vh)", width: "min(540px, 44vw)" },
    zoomWidth: "min(1000px, 92vw, calc((100svh - 10rem) / 0.6))",
  },
  {
    id: "player",
    app: "Player",
    title: "Colours in motion.mp4",
    theme: "dark",
    ratio: 0.625,
    place: { left: "5vw", top: "calc(1.75rem + 9vh)", width: "min(720px, 56vw)" },
    zoomWidth: "min(1180px, 94vw, calc((100svh - 10rem) / 0.625))",
  },
];

type Engine = {
  goal: number; // 0 = open, 1 = at its target
  progress: number;
  target: "slot" | "icon";
  hover: boolean;
  drag: { x: number; y: number };
};

function Clock() {
  const now = useNow();
  if (!now) return null;
  return (
    <span className="tabular-nums">
      {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
      {"  "}
      {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
    </span>
  );
}

export function GenieMinimizeDemo({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRefs = useRef<Partial<Record<WinId, HTMLDivElement | null>>>({});
  const shadowRefs = useRef<Partial<Record<WinId, HTMLDivElement | null>>>({});
  const iconElements = useRef<Record<string, HTMLElement | null>>({});
  const slotElements = useRef<Record<string, HTMLElement | null>>({});
  const engine = useRef<Record<WinId, Engine>>({
    player: { goal: 0, progress: 0, target: "slot", hover: false, drag: { x: 0, y: 0 } },
    terminal: { goal: 0, progress: 0, target: "slot", hover: false, drag: { x: 0, y: 0 } },
    calendar: { goal: 0, progress: 0, target: "slot", hover: false, drag: { x: 0, y: 0 } },
  });
  const orderRef = useRef<WinId[]>(["calendar", "terminal", "player"]); // back to front

  const [modes, setModes] = useState<Record<WinId, Mode>>({ player: "open", terminal: "open", calendar: "open" });
  const [slotOpen, setSlotOpen] = useState<Record<WinId, boolean>>({ player: false, terminal: false, calendar: false });
  const [zoomed, setZoomed] = useState<Record<WinId, boolean>>({ player: false, terminal: false, calendar: false });
  const [order, setOrder] = useState<WinId[]>(["calendar", "terminal", "player"]);

  useEffect(() => {
    const canvas = canvasRef.current!;

    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.play().catch(() => {});

    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true });
    if (!gl || !gl.getExtension("OES_standard_derivatives")) return () => video.pause();

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(program);
    gl.useProgram(program);

    const { positions, indices } = buildGrid();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // One 2D canvas + one texture per window.
    const layers = Object.fromEntries(
      WINDOWS.map((win) => {
        const paint = document.createElement("canvas");
        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return [win.id, { paint, ctx: paint.getContext("2d")!, texture }];
      }),
    ) as Record<WinId, { paint: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: WebGLTexture }>;

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uni = {
      res: u("u_res"),
      dpr: u("u_dpr"),
      fromXY: u("u_fromXY"),
      fromWH: u("u_fromWH"),
      toXY: u("u_toXY"),
      toWH: u("u_toWH"),
      progress: u("u_progress"),
    };
    gl.uniform1f(u("u_radius"), RADIUS);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    let raf = 0;
    let last = performance.now();

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const dt = now - last;
      last = now;
      const t = (now - startedAt) / 1000;
      const date = new Date();

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(vw * dpr);
      const h = Math.round(vh * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uni.res, vw, vh);
      gl.uniform1f(uni.dpr, w / vw);

      for (const id of orderRef.current) {
        const win = WINDOWS.find((entry) => entry.id === id)!;
        const state = engine.current[id];
        // Progress moves toward the goal at a fixed speed; the shader's phases provide the easing.
        const step = motion.matches ? 1 : dt / DURATION;
        state.progress = state.goal > state.progress ? Math.min(state.goal, state.progress + step) : Math.max(state.goal, state.progress - step);

        const shadow = shadowRefs.current[id];
        if (shadow) shadow.style.opacity = state.progress === 0 ? "1" : "0";
        if (id === "player") {
          if (state.progress >= 1 && !video.paused) video.pause();
          if (state.progress < 1 && video.paused && !motion.matches) video.play().catch(() => {});
        }
        if (state.progress >= 1 && state.target === "icon") continue; // closed: nothing to draw

        const marker = markerRefs.current[id];
        const targetEl = state.target === "slot" ? slotElements.current[id] : iconElements.current[win.app];
        if (!marker || !targetEl) continue;
        const a = marker.getBoundingClientRect();
        const b = targetEl.getBoundingClientRect();
        if (a.width === 0) continue;

        const layer = layers[id];
        const texH = Math.round((TEX_W * a.height) / a.width);
        if (layer.paint.width !== TEX_W || layer.paint.height !== texH) {
          layer.paint.width = TEX_W;
          layer.paint.height = texH;
        }
        const s = TEX_W / a.width;
        if (id === "player") paintPlayer(layer.ctx, s, video);
        else if (id === "terminal") paintTerminal(layer.ctx, s, t);
        else paintCalendar(layer.ctx, s, date);
        paintChrome(layer.ctx, s, win.title, state.hover && state.progress === 0, win.theme);

        gl.bindTexture(gl.TEXTURE_2D, layer.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layer.paint);

        // Land on a box with the window's own shape, centred in the slot or icon.
        const bw = Math.max(b.width, 1);
        const bh = Math.max(Math.min(b.height || bw, bw * win.ratio), 1);
        gl.uniform2f(uni.fromXY, a.left, a.top);
        gl.uniform2f(uni.fromWH, a.width, a.height);
        gl.uniform2f(uni.toXY, b.left, b.top + ((b.height || bw) - bh) / 2);
        gl.uniform2f(uni.toWH, bw, bh);
        gl.uniform1f(uni.progress, clamp01(state.progress));
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      }
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      video.pause();
      video.removeAttribute("src");
      for (const layer of Object.values(layers)) gl.deleteTexture(layer.texture);
      gl.deleteProgram(program);
    };
  }, [src]);

  const focus = (id: WinId) => {
    const next = [...orderRef.current.filter((entry) => entry !== id), id];
    orderRef.current = next;
    setOrder(next);
  };

  const minimise = (id: WinId) => {
    const state = engine.current[id];
    state.hover = false;
    state.target = "slot";
    state.goal = 1;
    setSlotOpen((prev) => ({ ...prev, [id]: true }));
    setModes((prev) => ({ ...prev, [id]: "minimised" }));
  };

  // Closing pours the window into its app icon; opening pours it back out.
  const close = (id: WinId) => {
    const state = engine.current[id];
    state.hover = false;
    state.target = "icon";
    state.goal = 1;
    setModes((prev) => ({ ...prev, [id]: "closed" }));
  };

  const restore = (id: WinId) => {
    engine.current[id].goal = 0;
    focus(id);
    setModes((prev) => ({ ...prev, [id]: "open" }));
    window.setTimeout(() => {
      if (engine.current[id].goal === 0) setSlotOpen((prev) => ({ ...prev, [id]: false }));
    }, DURATION);
  };

  const onApp = (name: string) => {
    const win = WINDOWS.find((entry) => entry.app === name);
    if (!win) return false;
    if (modes[win.id] === "open") focus(win.id);
    else restore(win.id);
    return true;
  };

  // Drag a window by its title bar. The offset is a transform, so the layout never changes.
  const startDrag = (id: WinId, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    focus(id);
    const marker = markerRefs.current[id];
    if (!marker) return;
    const state = engine.current[id];
    const startX = event.clientX - state.drag.x;
    const startY = event.clientY - state.drag.y;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      state.drag = { x: e.clientX - startX, y: Math.max(-marker.offsetTop + 28, e.clientY - startY) };
      marker.style.transform = `translate(${state.drag.x}px, ${state.drag.y}px)`;
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const slots: DockSlot[] = (["player", "terminal", "calendar"] as WinId[]).map((id) => ({
    id,
    title: WINDOWS.find((entry) => entry.id === id)!.title,
    open: slotOpen[id],
    minimised: modes[id] === "minimised",
  }));
  const running = Object.fromEntries(WINDOWS.map((win) => [win.app, modes[win.id] !== "closed"]));

  return (
    <main
      className="relative h-svh w-full overflow-hidden text-white select-none"
      style={{
        background:
          "radial-gradient(80% 70% at 15% 20%, #ff8a5c 0%, transparent 60%), radial-gradient(70% 60% at 85% 25%, #8b5cff 0%, transparent 60%), radial-gradient(90% 80% at 60% 100%, #1e4fd6 0%, transparent 65%), linear-gradient(160deg, #2a1f55 0%, #120f2a 100%)",
      }}
    >
      {/* Menu bar */}
      <header className="absolute inset-x-0 top-0 z-30 flex h-7 items-center justify-between bg-black/25 px-4 text-[13px] font-medium text-white/90 backdrop-blur-xl">
        <nav aria-label="Menu" className="flex items-center gap-5">
          <span className="font-semibold">{WINDOWS.find((win) => win.id === order[order.length - 1])?.app}</span>
          {["File", "Edit", "View", "Window", "Help"].map((item) => (
            <span key={item} className="text-white/85">
              {item}
            </span>
          ))}
        </nav>
        <Clock />
      </header>

      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-10 block h-svh w-screen" />

      {/* Window markers: each plane is drawn over its marker. Only the drop shadow (below the canvas)
          and invisible hit areas over the title bar (above it) are real DOM. */}
      {WINDOWS.map((win) => {
        const mode = modes[win.id];
        const z = order.indexOf(win.id);
        return (
          <div
            key={win.id}
            ref={(el) => {
              markerRefs.current[win.id] = el;
            }}
            role="region"
            aria-label={`${win.title} window`}
            aria-hidden={mode !== "open"}
            className="absolute transition-[width] duration-300 ease-out"
            style={{ ...win.place, width: zoomed[win.id] ? win.zoomWidth : win.place.width, aspectRatio: `${1 / win.ratio}` }}
            onPointerDown={() => focus(win.id)}
          >
            <div
              ref={(el) => {
                shadowRefs.current[win.id] = el;
              }}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[12px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.5),0_22px_60px_rgba(0,0,0,0.5),0_6px_16px_rgba(0,0,0,0.3)] transition-opacity duration-200"
            />
            {win.id === "player" ? <span className="sr-only">A video of colourful paint swirling in water.</span> : null}
            {mode === "open" ? (
              <div className="absolute inset-x-0 top-0 h-[34px] cursor-default" style={{ zIndex: 20 + z * 2 }} onPointerDown={(event) => startDrag(win.id, event)}>
                <div
                  className="absolute top-0 left-[8px] flex h-[34px] items-center gap-[6px]"
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseEnter={() => {
                    engine.current[win.id].hover = true;
                  }}
                  onMouseLeave={() => {
                    engine.current[win.id].hover = false;
                  }}
                >
                  <button type="button" aria-label={`Close ${win.app}`} onClick={() => close(win.id)} className="size-[14px] cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70" />
                  <button type="button" aria-label={`Minimise ${win.app}`} onClick={() => minimise(win.id)} className="size-[14px] cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70" />
                  <button
                    type="button"
                    aria-label={zoomed[win.id] ? `Exit zoom ${win.app}` : `Zoom ${win.app}`}
                    onClick={() => setZoomed((prev) => ({ ...prev, [win.id]: !prev[win.id] }))}
                    className="size-[14px] cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <GenieDock
        slots={slots}
        running={running}
        onApp={onApp}
        onRestore={(id) => restore(id as WinId)}
        iconElements={iconElements}
        slotElements={slotElements}
      />
    </main>
  );
}
