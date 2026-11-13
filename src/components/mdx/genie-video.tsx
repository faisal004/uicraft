"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect, useRef } from "react";

import { CraftFrame } from "@/components/mdx/craft-controls";

// Genie video: a blog cover video that folds into a docked mini player as you scroll, and back out
// when you return. The video is drawn on a WebGL plane. Two invisible DOM boxes mark where it starts
// (the cover) and ends (the dock); every frame we read their rects and hand them to the vertex shader,
// which moves each vertex with its own delay so the plane bends on the way.
//
// The same engine runs against the window (the full-page demo) or a scrollable box (the craft demo).

const GRID = 32;
const RADIUS = 16; // corner radius in CSS px, constant while the plane changes size

const vertexShader = /* glsl */ `
attribute vec2 a_pos; // 0..1, y-down like the DOM
uniform vec2 u_res;
uniform vec2 u_fromXY;
uniform vec2 u_fromWH;
uniform vec2 u_toXY;
uniform vec2 u_toWH;
uniform float u_progress;
varying vec2 v_uv;
varying vec2 v_size;

void main() {
  // 0 at the bottom-right corner, 1 at the top-left. The corner nearest the dock leaves first and
  // pulls the rest of the sheet after it. Summing the two axes keeps the edges smooth curves.
  float lag = (pow(1.0 - a_pos.x, 1.5) + pow(1.0 - a_pos.y, 1.5)) * 0.5;
  float p = smoothstep(lag * 0.3, 0.7 + lag * 0.3, u_progress);

  vec2 xy = mix(u_fromXY, u_toXY, p);
  vec2 wh = mix(u_fromWH, u_toWH, p);

  // A slight tilt that only exists mid-flight.
  float angle = sin(p * 3.14159) * -0.05;
  vec2 local = (a_pos - 0.5) * wh;
  vec2 bent = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * local;
  vec2 screen = xy + wh * 0.5 + bent;

  vec2 clip = screen / u_res * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

  v_uv = a_pos;
  v_size = wh;
}
`;

const fragmentShader = /* glsl */ `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform sampler2D u_tex;
uniform float u_texAspect;
uniform float u_radius;
uniform float u_dpr;
varying vec2 v_uv;
varying vec2 v_size;

// Distance (in real screen pixels) from this fragment to the plane's rounded outline, positive inside.
// It's measured from the UV edges with screen-space derivatives, so it stays correct however the
// sheet is stretched or bent; every corner keeps the same radius mid-morph.
float edgeDistance(vec2 uv, float r) {
  vec2 pxPerUv = 1.0 / vec2(
    length(vec2(dFdx(uv.x), dFdy(uv.x))),
    length(vec2(dFdx(uv.y), dFdy(uv.y)))
  );
  vec2 q = min(uv, 1.0 - uv) * pxPerUv; // pixels to the nearest vertical / horizontal edge
  if (q.x < r && q.y < r) return r - length(vec2(r) - q);
  return min(q.x, q.y);
}

void main() {
  // object-fit: cover, recomputed for whatever size the plane is at right now.
  float aspect = v_size.x / v_size.y;
  vec2 scale = vec2(min(aspect / u_texAspect, 1.0), min(u_texAspect / aspect, 1.0));
  vec3 color = texture2D(u_tex, (v_uv - 0.5) * scale + 0.5).rgb;

  float alpha = clamp(edgeDistance(v_uv, u_radius * u_dpr) + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fit = (v: number, a: number, b: number) => (b === a ? (v >= b ? 1 : 0) : clamp01((v - a) / (b - a)));

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

type GenieOptions = {
  src: string;
  canvas: HTMLCanvasElement; // covers the visible scroll area: fixed to the viewport, or absolute over the box
  cover: HTMLElement;
  dock: HTMLElement;
  scroller: HTMLElement | null; // null scrolls the window
};

function startGenie({ src, canvas, cover, dock, scroller }: GenieOptions) {
  const video = document.createElement("video");
  video.src = src;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.play().catch(() => {});

  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true });
  if (!gl || !gl.getExtension("OES_standard_derivatives")) {
    // No WebGL: fall back to a plain video in the cover box.
    video.className = "size-full rounded-[16px] object-cover";
    cover.style.visibility = "visible";
    cover.appendChild(video);
    return () => video.remove();
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
    dpr: u("u_dpr"),
    texAspect: u("u_texAspect"),
    fromXY: u("u_fromXY"),
    fromWH: u("u_fromWH"),
    toXY: u("u_toXY"),
    toWH: u("u_toWH"),
    progress: u("u_progress"),
  };
  gl.uniform1f(u("u_radius"), RADIUS);
  gl.uniform1f(uni.texAspect, 16 / 9);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let raf = 0;
  let docked: boolean | null = null;

  const render = () => {
    raf = requestAnimationFrame(render);
    if (video.readyState < 2) return;

    // Everything is measured relative to the canvas, so the same maths works for the window and a box.
    const area = canvas.getBoundingClientRect();
    if (area.bottom < 0 || area.top > window.innerHeight || area.width === 0) return; // off screen
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(area.width * dpr);
    const h = Math.round(area.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);

    const scroll = scroller ? scroller.scrollTop : window.scrollY;
    const a = cover.getBoundingClientRect();
    const b = dock.getBoundingClientRect();
    // The plane leaves from where the cover sits at the top and doesn't scroll with it, so the article
    // slides up underneath while the video folds into the dock.
    const coverTop = a.top - area.top + scroll;
    const progress = fit(scroll, 0, a.height * 0.7);

    // Once docked, the mini player is a button that takes you back up to the cover.
    const nowDocked = progress >= 1;
    if (nowDocked !== docked) {
      docked = nowDocked;
      dock.style.pointerEvents = docked ? "auto" : "none";
      dock.tabIndex = docked ? 0 : -1;
    }

    // Reduced motion: hold the footage on one frame. The fold still follows your own scrolling.
    if (motion.matches && !video.paused) video.pause();
    gl.uniform1f(uni.texAspect, video.videoWidth / video.videoHeight);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    gl.uniform2f(uni.res, area.width, area.height);
    gl.uniform1f(uni.dpr, w / area.width);
    gl.uniform2f(uni.fromXY, a.left - area.left, coverTop);
    gl.uniform2f(uni.fromWH, a.width, a.height);
    gl.uniform2f(uni.toXY, b.left - area.left, b.top - area.top);
    gl.uniform2f(uni.toWH, b.width, b.height);
    gl.uniform1f(uni.progress, progress);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  };
  raf = requestAnimationFrame(render);

  // Don't force-lose the context here: the canvas keeps the same context across a remount
  // (React Strict Mode runs effects twice), and a lost one can't be revived.
  return () => {
    cancelAnimationFrame(raf);
    video.pause();
    video.removeAttribute("src");
    gl.deleteTexture(texture);
    gl.deleteProgram(program);
  };
}

// Full-page version: the window scrolls, the canvas is fixed over the viewport, the dock is pinned
// to the screen corner. `src` is a same-origin video file, e.g. "/reel.mp4" in public/.
export function ScrollReelMorph({ src, children }: { src: string; children?: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      startGenie({
        src,
        canvas: canvasRef.current!,
        cover: coverRef.current!,
        dock: dockRef.current!,
        scroller: null,
      }),
    [src],
  );

  // Smooth, eased page scrolling (Lenis). Skipped for reduced motion, where native scrolling is kinder.
  const lenisRef = useRef<Lenis | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09 });
    lenisRef.current = lenis;
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const backToTop = () => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 block h-screen w-screen"
      />

      {/* Start marker: the cover at the top of the post. Invisible; the plane is drawn over it. */}
      <div className="px-6 pt-10 sm:pt-16">
        <div
          ref={coverRef}
          aria-hidden="true"
          className="invisible mx-auto aspect-video w-full max-w-[720px] rounded-[16px]"
        />
      </div>

      {children}

      {/* End marker: the docked mini player. Clickable once the video has landed in it. */}
      <button
        ref={dockRef}
        type="button"
        tabIndex={-1}
        aria-label="Back to the cover video"
        onClick={backToTop}
        className="pointer-events-none fixed right-4 bottom-4 z-20 aspect-video w-[min(44vw,320px)] cursor-pointer rounded-[16px] outline-none focus-visible:ring-2 focus-visible:ring-(--craft-accent) focus-visible:ring-offset-2 sm:right-6 sm:bottom-6"
      />
    </>
  );
}

// Craft version: the same effect inside a small scrollable post, so it fits in the demo frame.
export function GenieVideoDemo() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      startGenie({
        src: "/reel.mp4",
        canvas: canvasRef.current!,
        cover: coverRef.current!,
        dock: dockRef.current!,
        scroller: scrollerRef.current!,
      }),
    [],
  );

  return (
    <CraftFrame label="Genie video" meta="WebGL · scroll">
      <div className="relative h-[28rem] w-full overflow-hidden bg-(--demo-bg) sm:h-[32rem]">
        <div ref={scrollerRef} className="absolute inset-0 overflow-y-auto overscroll-contain">
          <div className="px-5 pt-6 sm:px-8 sm:pt-8">
            {/* Start marker: the cover. */}
            <div
              ref={coverRef}
              aria-hidden="true"
              className="invisible mx-auto aspect-video w-full max-w-[460px] rounded-[16px]"
            />
          </div>
          <article className="mx-auto max-w-[460px] px-5 pt-6 pb-48 text-(--demo-ink) sm:px-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--demo-subtle)">Scroll this post</p>
            <h3 className="font-heading mt-3 text-2xl leading-tight text-balance sm:text-3xl">Weather in a paint tray</h3>
            <div className="mt-4 space-y-4 text-sm leading-7 text-(--demo-muted)">
              {DEMO_COPY.map((text) => (
                <p key={text.slice(0, 24)}>{text}</p>
              ))}
            </div>
          </article>
        </div>

        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block size-full" />

        {/* End marker: the docked mini player, pinned to the corner of the frame. */}
        <button
          ref={dockRef}
          type="button"
          tabIndex={-1}
          aria-label="Back to the cover video"
          onClick={() => scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="pointer-events-none absolute right-3 bottom-3 aspect-video w-[min(40%,200px)] cursor-pointer rounded-[16px] outline-none focus-visible:ring-2 focus-visible:ring-(--craft-accent) focus-visible:ring-offset-2"
        />
      </div>
    </CraftFrame>
  );
}

const DEMO_COPY = [
  "Paint poured onto a still surface never settles where you expect. Heavier pigments sink and push the lighter ones outward, and for a few seconds the tray looks like weather seen from orbit.",
  "Scroll a little and the video lets go of the cover. The corner nearest the dock leaves first and the rest of the sheet follows, stretching on the way, until it lands in the small player.",
  "Scroll back up and it unfolds into the cover again. Once it is docked, the mini player is a button that brings you back to the top.",
  "Nothing about the layout changes. The cover and the dock are empty boxes; one WebGL plane is drawn between them, and every point on it runs a slightly delayed copy of the scroll position.",
];
