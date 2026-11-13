"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

// A WebGL plane that starts on a small DOM card and bends its way into a full-screen frame as you scroll.
// Two invisible DOM boxes mark where the plane starts and ends; every frame we read their rects and
// hand them to the vertex shader, which interpolates each vertex with its own delay.

const GRID = 32;
const RADIUS = 18; // corner radius in CSS px, constant while the plane changes size
const TINT = [0.1, 0.18, 0.98]; // the blue the card is washed in before it opens up
const TEX_W = 1280;
const TEX_H = 720;

const vertexShader = /* glsl */ `
attribute vec2 a_pos; // 0..1, y-down like the DOM
uniform vec2 u_res;
uniform vec2 u_fromXY;
uniform vec2 u_fromWH;
uniform vec2 u_toXY;
uniform vec2 u_toWH;
uniform float u_progress;
varying vec2 v_uv;
varying vec2 v_local;
varying vec2 v_size;
varying float v_progress;

void main() {
  // 0 at the top-right corner, 1 at the bottom-left. The top-right moves first and pulls the rest,
  // so the plane stretches out of that corner.
  // Summing the two axes (instead of a radial distance) keeps the edges as smooth curves, so the
  // sheet bends like paper being pulled rather than creasing along a diagonal.
  float lag = (pow(1.0 - a_pos.x, 1.5) + pow(a_pos.y, 1.5)) * 0.5;
  float p = smoothstep(lag * 0.3, 0.7 + lag * 0.3, u_progress);

  vec2 xy = mix(u_fromXY, u_toXY, p);
  vec2 wh = mix(u_fromWH, u_toWH, p);

  // A small sideways swing and tilt that only exist mid-flight.
  float flight = sin(p * 3.14159);
  xy.x += flight * wh.x * 0.05;
  float angle = flight * 0.06;

  vec2 local = (a_pos - 0.5) * wh;
  vec2 bent = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * local;
  vec2 screen = xy + wh * 0.5 + bent;

  vec2 clip = screen / u_res * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

  v_uv = a_pos;
  v_local = local;
  v_size = wh;
  v_progress = p;
}
`;

const fragmentShader = /* glsl */ `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform sampler2D u_tex;
uniform float u_texAspect;
uniform float u_radius;
uniform vec3 u_tint;
varying vec2 v_uv;
varying vec2 v_local;
varying vec2 v_size;
varying float v_progress;

float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  // object-fit: cover, recomputed for whatever size the plane is at right now.
  float aspect = v_size.x / v_size.y;
  vec2 scale = vec2(min(aspect / u_texAspect, 1.0), min(u_texAspect / aspect, 1.0));
  vec3 color = texture2D(u_tex, (v_uv - 0.5) * scale + 0.5).rgb;

  // Blue duotone on the card, full colour in the frame.
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 duotone = mix(u_tint, vec3(1.0), smoothstep(0.35, 1.0, luma));
  color = mix(duotone, color, v_progress);

  float d = roundedBox(v_local, v_size * 0.5, u_radius);
  float alpha = 1.0 - smoothstep(-fwidth(d), 0.0, d);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fit = (v: number, a: number, b: number) => (b === a ? (v >= b ? 1 : 0) : clamp01((v - a) / (b - a)));

// Stand-in footage: an animated 2D canvas, so the demo needs no video file.
// Swap this for a <video> element and upload it with texImage2D the same way.
function drawReel(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = "#07070a";
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const blobs: [string, number, number, number][] = [
    ["#ff5b2e", 0.0, 0.32, 520],
    ["#ff2e9a", 2.1, 0.27, 460],
    ["#2ee6ff", 4.2, 0.22, 420],
    ["#ffd02e", 1.3, 0.18, 300],
  ];
  ctx.globalCompositeOperation = "lighter";
  for (const [color, phase, speed, size] of blobs) {
    const x = TEX_W * (0.5 + 0.34 * Math.cos(t * speed + phase));
    const y = TEX_H * (0.5 + 0.3 * Math.sin(t * speed * 1.3 + phase * 1.7));
    const g = ctx.createRadialGradient(x, y, 0, x, y, size);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX_W, TEX_H);
  }
  ctx.globalCompositeOperation = "source-over";

  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= TEX_W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, TEX_H);
    ctx.stroke();
  }
  for (let y = 0; y <= TEX_H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(TEX_W, y + 0.5);
    ctx.stroke();
  }

  // A ring that orbits, to make motion obvious even when the card is tiny.
  const rx = TEX_W / 2 + Math.cos(t * 0.9) * 260;
  const ry = TEX_H / 2 + Math.sin(t * 1.4) * 140;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(rx, ry, 70 + Math.sin(t * 2) * 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#fff";
  // Kept small and in the corner so it never fights the PLAY / REEL words over the frame.
  ctx.font = "700 34px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("SHOWREEL ’26", 48, 64);

  const frames = Math.floor(t * 24);
  const pad = (n: number) => String(n).padStart(2, "0");
  ctx.font = "500 28px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(`● REC  00:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)}:${pad(frames % 24)}`, 48, TEX_H - 52);
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function buildGrid() {
  const positions: number[] = [];
  for (let y = 0; y <= GRID; y++) for (let x = 0; x <= GRID; x++) positions.push(x / GRID, y / GRID);
  const indices: number[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = y * (GRID + 1) + x;
      indices.push(i, i + 1, i + GRID + 1, i + 1, i + GRID + 2, i + GRID + 1);
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint16Array(indices) };
}

export function ScrollReelMorph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLElement>(null);
  const playRef = useRef<HTMLSpanElement>(null);
  const reelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const thumb = thumbRef.current!;
    const frame = frameRef.current!;
    const pin = pinRef.current!;
    const play = playRef.current!;
    const reel = reelRef.current!;

    const source = document.createElement("canvas");
    source.width = TEX_W;
    source.height = TEX_H;
    const ctx2d = source.getContext("2d")!;

    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true });
    if (!gl || !gl.getExtension("OES_standard_derivatives")) {
      // No WebGL: show the DOM boxes with plain fills instead.
      thumb.style.visibility = frame.style.visibility = "visible";
      return;
    }

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

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uni = {
      res: u("u_res"),
      fromXY: u("u_fromXY"),
      fromWH: u("u_fromWH"),
      toXY: u("u_toXY"),
      toWH: u("u_toWH"),
      progress: u("u_progress"),
    };
    gl.uniform1f(u("u_texAspect"), TEX_W / TEX_H);
    gl.uniform1f(u("u_radius"), RADIUS);
    gl.uniform3fv(u("u_tint"), TINT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const start = performance.now();
    let frozenAt = 0;

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
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

      const a = thumb.getBoundingClientRect();
      const b = frame.getBoundingClientRect();
      const scroll = window.scrollY;
      // 0 when the card is centred on screen, 1 when the pinned section locks in place.
      const from = Math.max(0, a.top + scroll + a.height / 2 - vh / 2);
      const to = pin.getBoundingClientRect().top + scroll;
      const progress = fit(scroll, from, to);

      // After the frame lands, the words slide apart over the next 60% of a screen.
      const split = fit(scroll, to, to + vh * 0.6);
      // Keep the words inside the frame: they only open a gap, never leave it.
      const offset = split * Math.min(b.width * 0.12, 220);
      play.style.transform = `translate3d(${-offset}px,0,0)`;
      reel.style.transform = `translate3d(${offset}px,0,0)`;

      // Reduced motion: hold the footage on one frame.
      const t = motion.matches ? frozenAt : (frozenAt = (now - start) / 1000);
      drawReel(ctx2d, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

      gl.uniform2f(uni.res, vw, vh);
      gl.uniform2f(uni.fromXY, a.left, a.top);
      gl.uniform2f(uni.fromWH, a.width, a.height);
      gl.uniform2f(uni.toXY, b.left, b.top);
      gl.uniform2f(uni.toWH, b.width, b.height);
      gl.uniform1f(uni.progress, progress);
      play.style.opacity = reel.style.opacity = String(fit(progress, 0.85, 1));

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    };
    raf = requestAnimationFrame(render);

    // Don't force-lose the context here: the canvas keeps the same context across a remount
    // (React Strict Mode runs effects twice), and a lost one can't be revived.
    return () => {
      cancelAnimationFrame(raf);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <main className="relative bg-[#0b0b0d] text-[#f4f4f4]">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 block h-screen w-screen"
      />

      <section className="relative flex min-h-screen flex-col justify-center px-6 sm:px-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">Scroll reel morph</p>
        <h1 className="mt-6 max-w-5xl text-balance text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
          Small card,
          <br />
          big picture.
        </h1>
        <div className="mt-12 grid items-start gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-16">
          {/* Start marker: the plane is drawn here, the box itself stays invisible. */}
          <div
            ref={thumbRef}
            aria-hidden="true"
            className="invisible aspect-video w-full rounded-[18px] bg-[#1a2efa]"
          />
          <p className="max-w-sm text-pretty text-base leading-7 text-white/60 md:pt-4">
            Keep scrolling. The card bends out of its corner and opens into the full frame.
          </p>
        </div>
      </section>

      <section ref={pinRef} className="relative h-[260vh]">
        {/* z-20: sticky makes its own stacking context, so the wrapper itself must sit above the canvas. */}
        <div className="sticky top-0 z-20 flex h-screen items-center justify-center px-4 sm:px-16">
          {/* End marker: same deal, sticky so it holds still once the plane lands.
              An inset wide frame with page margins, capped so it never fills the whole screen. */}
          <div
            ref={frameRef}
            aria-hidden="true"
            className="invisible aspect-video w-full rounded-[18px] bg-[#222] sm:aspect-[21/9] sm:w-[min(100%,calc(80vh*21/9))]"
          />
          <h2 className="absolute inset-0 flex items-center justify-center gap-[0.3em] text-5xl font-semibold uppercase tracking-tight sm:text-8xl lg:text-9xl">
            <span ref={playRef} className="opacity-0 will-change-transform">
              Play
            </span>
            <span ref={reelRef} className="opacity-0 will-change-transform">
              Reel
            </span>
          </h2>
        </div>
      </section>

      <section className="relative flex min-h-[70vh] flex-col justify-center gap-6 px-6 sm:px-12">
        <p className="max-w-xl text-pretty text-lg leading-8 text-white/70">
          One WebGL plane, two invisible DOM boxes. Each vertex runs its own delayed copy of the scroll
          progress, so the corners arrive at different times and the plane curves on the way.
        </p>
        <Link href="/craft" className="text-sm text-white/60 underline underline-offset-4 hover:text-white">
          Back to crafts
        </Link>
      </section>
    </main>
  );
}
