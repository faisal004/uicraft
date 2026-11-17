"use client";

import { useEffect, useRef, useState } from "react";

import { CraftFrame, RangeControl } from "@/components/mdx/craft-controls";

// Liquid glass: a lens you drag over a page. The page is painted once into a 2D canvas and uploaded
// as a texture. A fragment shader then draws every pixel: outside the lens it copies the page (plus
// a soft shadow), inside it samples the page from a shifted spot. The shift grows near the rim, the
// way a curved glass edge bends light, and each colour channel shifts a slightly different amount.
//
// The lens is a rounded rectangle described by a signed distance function, so pill, circle, and
// card are the same shape with different sizes and corner radii.

// The scene is laid out in a fixed 640 × 400 space; the canvas scales it to its real size.
const SCENE_W = 640;
const SCENE_H = 400;

export type LensShape = "pill" | "circle" | "card";

// Half width, half height, and corner radius in scene units.
const SHAPES: Record<LensShape, { w: number; h: number; r: number }> = {
  pill: { w: 120, h: 52, r: 52 },
  circle: { w: 76, h: 76, r: 76 },
  card: { w: 120, h: 80, r: 26 },
};

export type LiquidGlassSettings = {
  shape: LensShape;
  refraction: number; // how far the rim pushes the page, in scene px
  dispersion: number; // how far red and blue drift from green, 0 = no rainbow
};

const vertexShader = /* glsl */ `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D u_page;
uniform vec2 u_res;       // canvas size in device px
uniform vec2 u_lens;      // lens centre in device px, y-down
uniform vec2 u_half;      // lens half size in device px
uniform float u_radius;   // corner radius in device px
uniform float u_refraction;
uniform float u_dispersion;
uniform float u_scale;    // device px per scene px

// Signed distance to a rounded rectangle: negative inside, 0 on the edge, positive outside.
float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float lensDistance(vec2 px) {
  return roundedBox(px - u_lens, u_half, u_radius);
}

vec3 page(vec2 px) {
  return texture2D(u_page, clamp(px / u_res, 0.0, 1.0)).rgb;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y); // y-down, like the DOM
  float d = lensDistance(px);

  // Outside: the page, darkened by a soft shadow that sits a little below the lens.
  vec3 base = page(px);
  float shadowDistance = lensDistance(px - vec2(0.0, 10.0 * u_scale));
  base *= 1.0 - 0.28 * exp(-max(shadowDistance, 0.0) / (16.0 * u_scale)) * step(0.0, d);
  if (d > 1.5) {
    gl_FragColor = vec4(base, 1.0);
    return;
  }

  // The outward normal of the outline, from how the distance changes one pixel each way.
  vec2 e = vec2(1.0, 0.0);
  vec2 normal = normalize(vec2(
    lensDistance(px + e.xy) - lensDistance(px - e.xy),
    lensDistance(px + e.yx) - lensDistance(px - e.yx)
  ) + 1e-6);

  // 0 in the flat middle, rising to 1 at the edge. Cubing it keeps the middle calm.
  float rim = min(u_half.x, u_half.y) * 0.55;
  float t = clamp(1.0 - (-d) / rim, 0.0, 1.0);
  float bend = t * t * t;

  // Magnify a little everywhere, then push the sample inward near the rim.
  vec2 zoomed = u_lens + (px - u_lens) / 1.12;
  vec2 offset = -normal * bend * u_refraction * u_scale;

  // Red bends a bit more than green, blue a bit less: a rainbow fringe at the edge.
  vec3 glass;
  glass.r = page(zoomed + offset * (1.0 + u_dispersion)).r;
  glass.g = page(zoomed + offset).g;
  glass.b = page(zoomed + offset * (1.0 - u_dispersion)).b;
  glass = mix(glass, vec3(1.0), 0.06); // a faint white tint

  // Light from the top left: a highlight on that side of the rim, a weaker one opposite.
  vec2 light = normalize(vec2(-0.6, -0.8));
  glass += pow(max(dot(normal, light), 0.0), 2.0) * bend * 0.45;
  glass += pow(max(dot(normal, -light), 0.0), 3.0) * bend * 0.18;
  glass += smoothstep(2.5 * u_scale, 0.0, -d) * 0.35; // a thin bright outline
  glass *= 1.0 - 0.08 * bend;

  // Blend across about two pixels so the outline is smooth.
  gl_FragColor = vec4(mix(base, glass, smoothstep(1.5, -1.0, d)), 1.0);
}
`;

// The page behind the glass: a magazine cover. Big type and small print give the lens plenty of
// sharp edges to bend; the red circle shows the colour split.
const POSTER_COPY =
  "Every lens is a small lie told about distance. The middle stays honest, the rim exaggerates, and colour slips apart where the curve is steepest. We read through glass all day without noticing it bend the world.".split(
    " ",
  );

function paintPage(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d")!;
  g.scale(width / SCENE_W, height / SCENE_H);

  const serif = "Georgia, 'Times New Roman', serif";
  const sans = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  const ink = "#141414";

  // Paper, with a fixed speckle so it doesn't look like a flat fill.
  g.fillStyle = "#efe9dc";
  g.fillRect(0, 0, SCENE_W, SCENE_H);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgb(0 0 0 / ${random() * 5}%)`;
    g.fillRect(random() * SCENE_W, random() * SCENE_H, 0.75, 0.75);
  }

  g.fillStyle = "#e8412c";
  g.beginPath();
  g.arc(465, 165, 125, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = ink;
  g.font = `600 9px ${sans}`;
  g.fillText("UICRAFT QUARTERLY", 30, 45);
  g.textAlign = "right";
  g.fillText("→", SCENE_W - 30, 45);
  g.textAlign = "left";

  g.font = `italic 400 150px ${serif}`;
  g.fillText("Refract", 15, 235);

  g.fillRect(30, 280, SCENE_W - 60, 1.5);
  g.font = `600 11px ${sans}`;
  g.fillText("ISSUE 07", 30, 305);
  g.fillText("ON LIGHT, GLASS, AND THE SPACE BETWEEN", 150, 305);
  g.textAlign = "right";
  g.fillText("2026", SCENE_W - 30, 305);
  g.textAlign = "left";

  // Four columns of small print, each starting a few words further into the same paragraph.
  g.font = `400 8.5px ${serif}`;
  for (let column = 0; column < 4; column++) {
    let y = 330;
    let line = "";
    for (let k = 0; y <= 390; k++) {
      const word = POSTER_COPY[(k + column * 7) % POSTER_COPY.length];
      if (g.measureText(line + word).width > 125) {
        g.fillText(line, 30 + column * 147.5, y);
        y += 12;
        line = "";
      }
      line += `${word} `;
    }
  }

  return canvas;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Shader failed to compile");
  }
  return shader;
}

function startLiquidGlass(
  canvas: HTMLCanvasElement,
  settings: { current: LiquidGlassSettings },
) {
  const gl = canvas.getContext("webgl", { antialias: false });
  // No WebGL (or a lost context): leave the canvas empty rather than throw.
  if (!gl || gl.isContextLost()) return () => {};

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader));
  gl.linkProgram(program);
  gl.useProgram(program);

  // One rectangle that covers the canvas; the fragment shader does all the work.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    res: uniform("u_res"),
    lens: uniform("u_lens"),
    half: uniform("u_half"),
    radius: uniform("u_radius"),
    refraction: uniform("u_refraction"),
    dispersion: uniform("u_dispersion"),
    scale: uniform("u_scale"),
  };
  gl.uniform1i(uniform("u_page"), 0);

  // Size the canvas to its CSS box times the pixel ratio, and repaint the page at that size.
  let scale = 1;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = canvas.width / SCENE_W;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paintPage(canvas.width, canvas.height));
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The lens chases `target` on a spring. Until someone touches it, `target` drifts on its own.
  const pos = { x: SCENE_W / 2, y: SCENE_H / 2 };
  const vel = { x: 0, y: 0 };
  const target = { x: SCENE_W / 2, y: SCENE_H / 2 };
  const size = { ...SHAPES[settings.current.shape] };
  let touched = false;
  let dragging = false;
  const grab = { x: 0, y: 0 };

  const toScene = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * SCENE_W,
      y: ((event.clientY - rect.top) / rect.height) * SCENE_H,
    };
  };

  const onPointerDown = (event: PointerEvent) => {
    const p = toScene(event);
    touched = true;
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    // Grabbing the lens keeps the same hold point; pressing elsewhere pulls the lens over.
    const onLens = Math.abs(p.x - pos.x) < size.w && Math.abs(p.y - pos.y) < size.h;
    grab.x = onLens ? pos.x - p.x : 0;
    grab.y = onLens ? pos.y - p.y : 0;
    target.x = p.x + grab.x;
    target.y = p.y + grab.y;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const p = toScene(event);
    target.x = p.x + grab.x;
    target.y = p.y + grab.y;
  };
  const onPointerUp = () => {
    dragging = false;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 40 : 12;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    touched = true;
    target.x = Math.min(SCENE_W, Math.max(0, target.x + move[0]));
    target.y = Math.min(SCENE_H, Math.max(0, target.y + move[1]));
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("keydown", onKeyDown);

  // Only animate while the canvas is on screen.
  let visible = true;
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !frame) frame = requestAnimationFrame(render);
  });
  intersectionObserver.observe(canvas);

  let frame = 0;
  let last = performance.now();
  const render = (now: number) => {
    frame = 0;
    if (!visible) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    if (!touched && !reduceMotion) {
      const t = now / 1000;
      target.x = SCENE_W / 2 + 200 * Math.sin(t * 0.45);
      target.y = SCENE_H / 2 + 110 * Math.sin(t * 0.8 + 1);
    }

    if (reduceMotion) {
      pos.x = target.x;
      pos.y = target.y;
      vel.x = vel.y = 0;
    } else {
      // A damped spring: pulled toward the target, slowed by friction.
      const stiffness = 180;
      const damping = 18;
      vel.x += (stiffness * (target.x - pos.x) - damping * vel.x) * dt;
      vel.y += (stiffness * (target.y - pos.y) - damping * vel.y) * dt;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
    }

    // Ease the size toward the chosen shape, so switching shapes morphs.
    const shape = SHAPES[settings.current.shape];
    const ease = reduceMotion ? 1 : Math.min(1, dt * 12);
    size.w += (shape.w - size.w) * ease;
    size.h += (shape.h - size.h) * ease;
    size.r += (shape.r - size.r) * ease;

    // Stretch along the direction of travel and pinch across it: the wobble when you fling it.
    const speed = Math.hypot(vel.x, vel.y);
    const stretch = Math.min(0.35, speed / 2400);
    const angle = Math.atan2(vel.y, vel.x);
    const alongX = Math.abs(Math.cos(angle));
    const alongY = Math.abs(Math.sin(angle));
    const halfW = size.w * (1 + stretch * alongX - stretch * 0.5 * alongY);
    const halfH = size.h * (1 + stretch * alongY - stretch * 0.5 * alongX);

    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform2f(u.lens, pos.x * scale, pos.y * scale);
    gl.uniform2f(u.half, halfW * scale, halfH * scale);
    gl.uniform1f(u.radius, Math.min(size.r, halfW, halfH) * scale);
    gl.uniform1f(u.refraction, settings.current.refraction);
    gl.uniform1f(u.dispersion, settings.current.dispersion);
    gl.uniform1f(u.scale, scale);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("keydown", onKeyDown);
    // Free the GPU objects but keep the context: React may mount this canvas again (Strict Mode),
    // and a context lost on purpose can't be used by the next mount.
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
}

export function LiquidGlass({
  shape = "pill",
  refraction = 40,
  dispersion = 0.25,
  className,
}: Partial<LiquidGlassSettings> & { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Settings live in a ref so changing a slider doesn't restart WebGL.
  const settings = useRef<LiquidGlassSettings>({ shape, refraction, dispersion });

  useEffect(() => {
    settings.current = { shape, refraction, dispersion };
  }, [shape, refraction, dispersion]);

  useEffect(() => startLiquidGlass(canvasRef.current!, settings), []);

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      aria-label="A glass lens over a page. Drag it, or use the arrow keys to move it."
      className={`block aspect-[16/10] w-full cursor-grab touch-none outline-none focus-visible:ring-2 focus-visible:ring-(--craft-accent) active:cursor-grabbing ${className ?? ""}`}
    />
  );
}

export function LiquidGlassDemo() {
  const [shape, setShape] = useState<LensShape>("pill");
  const [refraction, setRefraction] = useState(40);
  const [dispersion, setDispersion] = useState(0.25);

  return (
    <CraftFrame label="Liquid glass" meta="WebGL · drag">
      <LiquidGlass shape={shape} refraction={refraction} dispersion={dispersion} />
      <div className="grid gap-3 border-t border-(--demo-border) p-4 sm:grid-cols-3">
        <fieldset className="grid content-start gap-3 border border-(--demo-border) bg-(--demo-bg) p-3.5">
          <legend className="sr-only">Lens shape</legend>
          <span aria-hidden="true" className="font-heading text-xs text-(--demo-muted)">
            Shape
          </span>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(SHAPES) as LensShape[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={shape === option}
                onClick={() => setShape(option)}
                className="border border-(--demo-border) px-2 py-1.5 text-xs capitalize text-(--demo-muted) outline-none hover:text-(--demo-ink) focus-visible:ring-2 focus-visible:ring-(--craft-accent) aria-pressed:bg-(--demo-ink) aria-pressed:text-(--demo-bg)"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
        <RangeControl label="Refraction" value={refraction} min={0} max={80} step={1} unit="px" onChange={setRefraction} />
        <RangeControl
          label="Rainbow"
          value={dispersion}
          min={0}
          max={0.6}
          step={0.05}
          decimals={2}
          onChange={setDispersion}
        />
      </div>
    </CraftFrame>
  );
}
