"use client";

import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";

const BW = 176;
const BH = 44;
const RADIUS = 10;
const HOLD = 1.6;
const HEAL = 2.2;
const RESPAWN = 1;
const RAYS = 10;
const RINGS = [0, 5, 12, 22, 36, 56, 84, 130, 200, 300];
const FLOOR_PAD = 4;
const FLOATS = 9;
const STEP = 1000 / 60;
const TRASH_PATH = "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6";

type Point = [number, number];
type Quat = [number, number, number, number];
type Segment = { a: Point; b: Point; t0: number };
type Shard = {
  hull: Point[];
  local: Float32Array;
  uv: Float32Array;
  edge: Float32Array;
  cx: number;
  cy: number;
  rand: [number, number, number];
};
type Piece = {
  body: Matter.Body;
  shard: Shard;
  axis: [number, number];
  phi: number;
  phiSpeed: number;
  z: number;
  vz: number;
  alpha: number;
  fadeAt: number;
};
type Pile = { texture: WebGLTexture; pieces: Piece[]; scale: number; fading: number; age: number };
type Draw = { shard: Shard; x: number; y: number; z: number; q: Quat; s: number; light: number; alpha: number };

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quat = (x: number, y: number, z: number, angle: number): Quat => {
  const length = Math.hypot(x, y, z) || 1;
  const s = Math.sin(angle / 2) / length;
  return [x * s, y * s, z * s, Math.cos(angle / 2)];
};

const qMul = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];

function qMatrix([x, y, z, w]: Quat) {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

function clipToButton(polygon: Point[]) {
  const sides: [number, number, number][] = [
    [1, 0, BW / 2],
    [-1, 0, BW / 2],
    [0, 1, BH / 2],
    [0, -1, BH / 2],
  ];
  let points = polygon;
  for (const [nx, ny, limit] of sides) {
    const next: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const da = a[0] * nx + a[1] * ny + limit;
      const db = b[0] * nx + b[1] * ny + limit;
      if (da >= 0) next.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    points = next;
    if (points.length < 3) return null;
  }
  return points;
}

function hullOf(points: Point[]) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function centroid(points: Point[]) {
  let area = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const f = a[0] * b[1] - b[0] * a[1];
    area += f;
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
  }
  area /= 2;
  if (Math.abs(area) < 1e-6) return null;
  return { area: Math.abs(area), x: x / (6 * area), y: y / (6 * area) };
}

function buildWeb(press: Point, seed: number) {
  const random = seeded(seed);
  const base = random() * Math.PI * 2;
  const rays: Point[][] = Array.from({ length: RAYS }, (_, k) => {
    const angle = base + ((k + (random() - 0.5) * 0.6) / RAYS) * Math.PI * 2;
    return RINGS.map((radius, j) => {
      if (j === 0) return press;
      const a = angle + (random() - 0.5) * 0.22;
      const r = radius * (0.85 + random() * 0.3);
      return [press[0] + Math.cos(a) * r, press[1] + Math.sin(a) * r] as Point;
    });
  });

  const shards: Shard[] = [];
  const segments: Segment[] = [];
  for (let k = 0; k < RAYS; k++) {
    const next = (k + 1) % RAYS;
    for (let j = 0; j < RINGS.length - 1; j++) {
      segments.push({ a: rays[k][j], b: rays[k][j + 1], t0: Math.min(0.86, 0.02 + j * 0.085 + random() * 0.06) });
      if (j > 0) segments.push({ a: rays[k][j], b: rays[next][j], t0: Math.min(0.88, 0.12 + j * 0.09 + random() * 0.1) });

      const outline = clipToButton([rays[k][j], rays[k][j + 1], rays[next][j + 1], rays[next][j]]);
      if (!outline) continue;
      const hull = hullOf(outline);
      const center = hull.length >= 3 ? centroid(hull) : null;
      if (!center || center.area < 3) continue;
      const { x: cx, y: cy } = center;
      const count = outline.length * 3;
      const local = new Float32Array(count * 2);
      const uv = new Float32Array(count * 2);
      const edge = new Float32Array(count);
      let v = 0;
      const vertex = (p: Point, e: number) => {
        local[v * 2] = p[0] - cx;
        local[v * 2 + 1] = p[1] - cy;
        uv[v * 2] = (p[0] + BW / 2) / BW;
        uv[v * 2 + 1] = (p[1] + BH / 2) / BH;
        edge[v] = e;
        v++;
      };
      for (let i = 0; i < outline.length; i++) {
        vertex([cx, cy], 0);
        vertex(outline[i], 1);
        vertex(outline[(i + 1) % outline.length], 1);
      }
      shards.push({ hull, local, uv, edge, cx, cy, rand: [random(), random(), random()] });
    }
  }
  return { press, shards, segments };
}

type Web = ReturnType<typeof buildWeb>;

function drawFace(canvas: HTMLCanvasElement, scale: number, web: Web, progress: number) {
  const width = Math.round(BW * scale);
  const height = Math.round(BH * scale);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, BW, BH);

  ctx.beginPath();
  ctx.roundRect(0, 0, BW, BH, RADIUS);
  const body = ctx.createLinearGradient(0, 0, 0, BH);
  body.addColorStop(0, "#e5484d");
  body.addColorStop(0.5, "#d2333a");
  body.addColorStop(1, "#b0222a");
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
  ctx.fillRect(0, 0, BW, 1);

  ctx.font = "500 15px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  const label = "Delete forever";
  const icon = 14;
  const gap = 7;
  const start = (BW - icon - gap - ctx.measureText(label).width) / 2;
  ctx.save();
  ctx.translate(start, BH / 2 - icon / 2);
  ctx.scale(icon / 24, icon / 24);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(TRASH_PATH));
  ctx.restore();
  ctx.fillStyle = "rgba(255, 255, 255, 0.97)";
  ctx.fillText(label, start + icon + gap, BH / 2 + 0.5);

  if (progress > 0) {
    const [px, py] = [web.press[0] + BW / 2, web.press[1] + BH / 2];
    const frost = ctx.createRadialGradient(px, py, 0, px, py, 4 + 12 * progress);
    frost.addColorStop(0, `rgba(255, 255, 255, ${0.7 * Math.min(1, progress * 3)})`);
    frost.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = frost;
    ctx.fillRect(0, 0, BW, BH);

    ctx.lineCap = "round";
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass === 0 ? "rgba(70, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = pass === 0 ? 1.2 : 0.55;
      ctx.beginPath();
      for (const segment of web.segments) {
        const f = Math.min(1, (progress - segment.t0) / 0.14);
        if (f <= 0) continue;
        const ax = segment.a[0] + BW / 2;
        const ay = segment.a[1] + BH / 2;
        const bx = ax + (segment.b[0] + BW / 2 - ax) * f;
        const by = ay + (segment.b[1] + BH / 2 - ay) * f;
        ctx.moveTo(ax - pass * 0.35, ay - pass * 0.35);
        ctx.lineTo(bx - pass * 0.35, by - pass * 0.35);
      }
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, BW - 1, BH - 1, RADIUS - 0.5);
  ctx.strokeStyle = "rgba(122, 14, 20, 0.9)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

const VERTEX = `#version 300 es
in vec3 aPos;
in vec2 aUv;
in float aShade;
in float aEdge;
in float aAlpha;
in float aFlags;
uniform vec2 uRes;
out vec2 vUv;
out float vShade;
out float vEdge;
out float vAlpha;
flat out float vFlags;

void main() {
  float persp = 900.0 / (900.0 - aPos.z);
  vec2 screen = uRes * 0.5 + (aPos.xy - uRes * 0.5) * persp;
  vec2 clip = screen / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vUv = aUv;
  vShade = aShade;
  vEdge = aEdge;
  vAlpha = aAlpha;
  vFlags = aFlags;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uTex;
in vec2 vUv;
in float vShade;
in float vEdge;
in float vAlpha;
flat in float vFlags;
out vec4 color;

void main() {
  if (any(lessThan(vUv, vec2(0.0))) || any(greaterThan(vUv, vec2(1.0)))) discard;
  vec4 tex = texture(uTex, vUv);
  if (tex.a < 0.5) discard;
  bool back = mod(vFlags, 2.0) > 0.5;
  float broken = step(1.5, vFlags);
  vec3 rgb = back ? vec3(0.5, 0.08, 0.1) : tex.rgb;
  float glint = smoothstep(0.82, 0.98, vEdge) * broken;
  rgb = mix(rgb * vShade, vec3(1.0, 0.9, 0.9), glint * 0.5);
  color = vec4(rgb * vAlpha, vAlpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

const LIGHT = (() => {
  const v = [-0.3, -0.6, 0.75];
  const length = Math.hypot(...v);
  return v.map((c) => c / length);
})();

export function HoldToShatter({ thumbnail = false }: { thumbnail?: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const stage = stageRef.current!;
    const canvas = glRef.current!;
    const button = buttonRef.current!;
    const shadow = shadowRef.current!;
    const hint = hintRef.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const maxPiles = thumbnail ? 2 : 5;

    const context = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: true });
    const gl = context && !context.isContextLost() ? context : null;
    const vertexShader = gl && compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragmentShader = gl && compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!gl || !vertexShader || !fragmentShader) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    const uRes = gl.getUniformLocation(program, "uRes");
    gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0);

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const attribute = (name: string, size: number, offset: number) => {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, FLOATS * 4, offset * 4);
    };
    attribute("aPos", 3, 0);
    attribute("aUv", 2, 3);
    attribute("aShade", 1, 5);
    attribute("aEdge", 1, 6);
    attribute("aAlpha", 1, 7);
    attribute("aFlags", 1, 8);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const makeTexture = () => {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 2.2 },
      enableSleeping: true,
      positionIterations: 10,
      velocityIterations: 8,
    });
    let walls: Matter.Body[] = [];

    const face = document.createElement("canvas");
    let buttonTexture = makeTexture();
    let seed = 1;
    let web = buildWeb([0, 0], seed);
    let piles: Pile[] = [];
    let group = 0;
    let width = 1;
    let height = 1;
    let scale = 1;
    let dpr = 1;
    let progress = 0;
    let drawn = -1;
    let holding = false;
    let hovering = false;
    let hover = 0;
    let pressed = 0;
    let respawn = 0;
    let announced = false;
    let forceDraw = true;
    let autoTime = 0;
    let accumulator = 0;
    let data = new Float32Array(0);
    let grab: Matter.Constraint | null = null;

    const setWeb = (press: Point) => {
      seed += 1;
      web = buildWeb(press, seed);
      drawn = -1;
    };

    const uploadFace = () => {
      drawFace(face, scale * dpr, web, progress);
      gl.bindTexture(gl.TEXTURE_2D, buttonTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, face);
      drawn = progress;
    };

    const buildWalls = () => {
      Matter.Composite.remove(engine.world, walls);
      const options = { isStatic: true, friction: 0.8, restitution: 0.1 };
      walls = [
        Matter.Bodies.rectangle(width / 2, height - FLOOR_PAD + 100, width + 800, 200, options),
        Matter.Bodies.rectangle(-100, height / 2 - height, 200, height * 4, options),
        Matter.Bodies.rectangle(width + 100, height / 2 - height, 200, height * 4, options),
      ];
      Matter.Composite.add(engine.world, walls);
    };

    const allBodies = () => piles.flatMap((p) => p.pieces.map((piece) => piece.body));

    const buttonPose = (shard: Shard, t: number, reduced: boolean) => {
      const dx = shard.cx - web.press[0];
      const dy = shard.cy - web.press[1];
      const d = Math.hypot(dx, dy) || 1;
      const strain = progress ** 3;
      const push = strain * (0.4 + shard.rand[0]) * 1.2;
      const tremble = reduced ? 0 : strain * 1.1 * scale;
      const shrink = 1 - 0.02 * pressed;
      return {
        x: width / 2 + (shard.cx + (dx / d) * push) * scale * shrink + Math.sin(t * 71) * tremble,
        y: height / 2 + (shard.cy + (dy / d) * push) * scale * shrink + Math.cos(t * 63) * tremble * 0.6 + pressed,
        q: quat(-dy, dx, 0, strain * (shard.rand[1] - 0.5) * 0.12),
        s: scale * shrink,
      };
    };

    const shatter = () => {
      const reduced = motion.matches;
      const texture = buttonTexture;
      buttonTexture = makeTexture();
      group -= 1;
      const t = performance.now() / 1000;
      const pieces: Piece[] = [];
      for (const shard of web.shards) {
        const pose = buttonPose(shard, t, reduced);
        const hull = shard.hull.map(([x, y]) => ({ x: pose.x + (x - shard.cx) * pose.s, y: pose.y + (y - shard.cy) * pose.s }));
        const body = Matter.Bodies.fromVertices(pose.x, pose.y, [hull], {
          friction: 0.55,
          frictionStatic: 0.9,
          restitution: 0.12,
          frictionAir: 0.012,
          density: 0.002,
          collisionFilter: { group },
        });
        Matter.Body.setPosition(body, { x: pose.x, y: pose.y });
        const dx = shard.cx - web.press[0];
        const dy = shard.cy - web.press[1];
        const d = Math.hypot(dx, dy) || 1;
        const near = 1 - Math.min(1, d / 110);
        if (!reduced) {
          const speed = (180 + 480 * shard.rand[2]) * (0.6 + 0.9 * near);
          Matter.Body.setVelocity(body, { x: ((dx / d) * speed) / 60, y: ((dy / d) * speed - 320 - 160 * shard.rand[1]) / 60 });
          Matter.Body.setAngularVelocity(body, ((shard.rand[2] > 0.5 ? 1 : -1) * (3 + 8 * shard.rand[1])) / 60);
        }
        const angle = shard.rand[0] * Math.PI * 2;
        pieces.push({
          body,
          shard,
          axis: [Math.cos(angle), Math.sin(angle)],
          phi: 0,
          phiSpeed: reduced ? 0 : (shard.rand[1] > 0.5 ? 1 : -1) * (6 + 10 * shard.rand[0]),
          z: 0,
          vz: reduced ? 0 : 220 + 380 * shard.rand[0],
          alpha: 1,
          fadeAt: shard.rand[2] * 0.9,
        });
      }
      Matter.Composite.add(engine.world, pieces.map((piece) => piece.body));
      piles.push({ texture, pieces, scale, fading: -1, age: 0 });
      const live = piles.filter((p) => p.fading < 0);
      if (live.length > maxPiles) live[0].fading = 0;
      respawn = RESPAWN;
      progress = 0;
      holding = false;
      autoTime = 0;
      announced = true;
      setWeb([0, 0]);
      setStatus("Deleted");
      navigator.vibrate?.(30);
    };

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      width = rect.width;
      height = rect.height;
      dpr = thumbnail ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      scale = thumbnail ? Math.min(1, (width * 0.5) / BW) : Math.max(1, Math.min(1.35, (width - 48) / BW));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, width, height);
      const box = {
        width: `${BW * scale}px`,
        height: `${BH * scale}px`,
        left: `${width / 2 - (BW * scale) / 2}px`,
        top: `${height / 2 - (BH * scale) / 2}px`,
        borderRadius: `${RADIUS * scale}px`,
      };
      Object.assign(button.style, box);
      Object.assign(shadow.style, box);
      if (hint) hint.style.top = `${height / 2 + (BH * scale) / 2 + 16}px`;
      buildWalls();
      for (const body of allBodies()) {
        if (body.position.x > width - 4 || body.position.y > height) {
          Matter.Body.setPosition(body, { x: Math.min(width - 20, body.position.x), y: Math.min(height - 40, body.position.y) });
        }
        Matter.Sleeping.set(body, false);
      }
      uploadFace();
      forceDraw = true;
      render(0);
    };

    const press = (point: Point) => {
      if (respawn > 0) return;
      if (progress < 0.05) setWeb(point);
      holding = true;
    };
    const release = () => {
      holding = false;
    };
    const local = (event: PointerEvent): Point => {
      const rect = button.getBoundingClientRect();
      return [(event.clientX - rect.left) / scale - BW / 2, (event.clientY - rect.top) / scale - BH / 2];
    };
    const stagePoint = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      button.setPointerCapture(event.pointerId);
      press(local(event));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (event.repeat) return;
      press([(Math.random() - 0.5) * BW * 0.5, (Math.random() - 0.5) * BH * 0.4]);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") release();
    };
    const onContextMenu = (event: Event) => event.preventDefault();
    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
    };

    const onStageDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.target === button) return;
      const point = stagePoint(event);
      const hits = Matter.Query.point(allBodies(), point);
      if (!hits.length) return;
      const body = hits[hits.length - 1];
      stage.setPointerCapture(event.pointerId);
      Matter.Sleeping.set(body, false);
      grab = Matter.Constraint.create({
        pointA: point,
        bodyB: body,
        pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
        stiffness: 0.12,
        damping: 0.08,
        length: 0,
      });
      Matter.Composite.add(engine.world, grab);
      stage.style.cursor = "grabbing";
    };
    const onStageMove = (event: PointerEvent) => {
      const point = stagePoint(event);
      if (grab) {
        grab.pointA = point;
        if (grab.bodyB) Matter.Sleeping.set(grab.bodyB, false);
        return;
      }
      if (event.target === button) return;
      stage.style.cursor = Matter.Query.point(allBodies(), point).length ? "grab" : "";
    };
    const onStageUp = () => {
      if (!grab) return;
      Matter.Composite.remove(engine.world, grab);
      grab = null;
      stage.style.cursor = "";
    };

    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("keydown", onKeyDown);
    button.addEventListener("keyup", onKeyUp);
    button.addEventListener("blur", release);
    button.addEventListener("contextmenu", onContextMenu);
    button.addEventListener("pointerenter", onEnter);
    button.addEventListener("pointerleave", onLeave);
    stage.addEventListener("pointerdown", onStageDown);
    stage.addEventListener("pointermove", onStageMove);
    stage.addEventListener("pointerup", onStageUp);
    stage.addEventListener("pointercancel", onStageUp);

    const write = (offset: number, broken: boolean, items: Draw[]) => {
      let v = offset;
      for (const item of items) {
        const m = qMatrix(item.q);
        const shade = (0.68 + 0.32 * Math.abs(m[2] * LIGHT[0] + m[5] * LIGHT[1] + m[8] * LIGHT[2])) * item.light;
        const flags = (m[8] < 0 ? 1 : 0) + (broken ? 2 : 0);
        const { local, uv, edge } = item.shard;
        for (let i = 0; i < edge.length; i++) {
          const lx = local[i * 2] * item.s;
          const ly = local[i * 2 + 1] * item.s;
          const o = v * FLOATS;
          data[o] = item.x + m[0] * lx + m[1] * ly;
          data[o + 1] = item.y + m[3] * lx + m[4] * ly;
          data[o + 2] = item.z + m[6] * lx + m[7] * ly;
          data[o + 3] = uv[i * 2];
          data[o + 4] = uv[i * 2 + 1];
          data[o + 5] = shade;
          data[o + 6] = edge[i];
          data[o + 7] = item.alpha;
          data[o + 8] = flags;
          v++;
        }
      }
      return v;
    };

    function render(dt: number) {
      const reduced = motion.matches;
      const t = performance.now() / 1000;

      if (thumbnail && respawn <= 0) {
        autoTime += dt;
        if (!holding && progress === 0 && autoTime > 0.8) {
          press([(Math.random() - 0.5) * BW * 0.6, (Math.random() - 0.5) * BH * 0.5]);
        }
      }

      if (respawn > 0) {
        respawn = Math.max(0, respawn - dt);
        if (respawn === 0) forceDraw = true;
      } else progress = holding ? Math.min(1, progress + dt / HOLD) : Math.max(0, progress - dt * HEAL);
      if (Math.abs(progress - drawn) > 0.004) uploadFace();
      hover += ((hovering && respawn <= 0 ? 1 : 0) - hover) * Math.min(1, dt / 0.15);
      pressed += ((holding ? 1 : 0) - pressed) * Math.min(1, dt / 0.1);
      if (respawn <= 0 && progress >= 1) shatter();

      accumulator = Math.min(accumulator + dt * 1000, STEP * 4);
      while (accumulator >= STEP) {
        Matter.Engine.update(engine, STEP);
        accumulator -= STEP;
      }

      let removed = false;
      for (const p of piles) {
        p.age += dt;
        if (p.fading >= 0) {
          p.fading += dt;
          for (const piece of p.pieces) {
            piece.alpha = Math.max(0, Math.min(1, 1 - (p.fading - piece.fadeAt) / 0.35));
          }
          const gone = p.pieces.filter((piece) => piece.alpha <= 0);
          if (gone.length) {
            Matter.Composite.remove(engine.world, gone.map((piece) => piece.body));
            p.pieces = p.pieces.filter((piece) => piece.alpha > 0);
            removed = true;
          }
        }
        if (p.age > 0.3 && p.pieces[0] && p.pieces[0].body.collisionFilter.group !== 0) {
          for (const piece of p.pieces) piece.body.collisionFilter.group = 0;
        }
        for (const piece of p.pieces) {
          piece.vz += (-piece.z * 16 - piece.vz * 3) * dt;
          piece.z += piece.vz * dt;
          piece.phiSpeed *= Math.exp(-1.1 * dt);
          piece.phi += piece.phiSpeed * dt;
          if (Math.abs(piece.phiSpeed) < 3 || piece.body.speed < 0.6) {
            const target = Math.round(piece.phi / Math.PI) * Math.PI;
            piece.phi += (target - piece.phi) * Math.min(1, dt * 7);
            piece.phiSpeed *= 0.85;
          }
        }
      }
      const dead = piles.filter((p) => p.fading >= 0 && p.pieces.length === 0);
      if (dead.length) {
        dead.forEach((p) => gl!.deleteTexture(p.texture));
        piles = piles.filter((p) => !dead.includes(p));
      }
      if (removed) for (const body of allBodies()) Matter.Sleeping.set(body, false);

      const settled =
        !holding && progress === 0 && respawn === 0 && !grab && pressed < 0.002 &&
        Math.abs(hover - (hovering ? 1 : 0)) < 0.002 &&
        piles.every((p) => p.fading < 0 && p.pieces.every((piece) => piece.body.isSleeping && Math.abs(piece.z) < 0.05));
      if (settled && !forceDraw) return;
      forceDraw = false;

      const vertexTotal =
        web.shards.reduce((sum, s) => sum + s.edge.length, 0) +
        piles.reduce((sum, p) => sum + p.pieces.reduce((n, piece) => n + piece.shard.edge.length, 0), 0);
      if (data.length < vertexTotal * FLOATS) data = new Float32Array(vertexTotal * FLOATS * 2);

      const draws: { texture: WebGLTexture; first: number; count: number }[] = [];
      let v = 0;
      for (const p of piles) {
        const next = write(
          v,
          true,
          p.pieces.map((piece) => ({
            shard: piece.shard,
            x: piece.body.position.x,
            y: piece.body.position.y,
            z: piece.z,
            q: qMul(quat(0, 0, 1, piece.body.angle), quat(piece.axis[0], piece.axis[1], 0, piece.phi)),
            s: p.scale,
            light: 1,
            alpha: piece.alpha,
          })),
        );
        draws.push({ texture: p.texture, first: v, count: next - v });
        v = next;
      }
      const appear = respawn > 0 ? Math.max(0, 1 - respawn / 0.3) : 1;
      if (appear > 0) {
        const grow = 0.96 + 0.04 * appear;
        const next = write(
          v,
          false,
          web.shards.map((shard) => {
            const pose = buttonPose(shard, t, reduced);
            return {
              shard,
              x: width / 2 + (pose.x - width / 2) * grow,
              y: height / 2 + (pose.y - height / 2) * grow,
              z: 0,
              q: pose.q,
              s: pose.s * grow,
              light: 1 + 0.05 * hover,
              alpha: appear,
            };
          }),
        );
        draws.push({ texture: buttonTexture, first: v, count: next - v });
        v = next;
      }

      gl!.useProgram(program);
      gl!.bindVertexArray(vao);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
      gl!.bufferData(gl!.ARRAY_BUFFER, data.subarray(0, v * FLOATS), gl!.DYNAMIC_DRAW);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      for (const draw of draws) {
        gl!.bindTexture(gl!.TEXTURE_2D, draw.texture);
        gl!.drawArrays(gl!.TRIANGLES, draw.first, draw.count);
      }

      shadow.style.opacity = String(appear * (1 - progress ** 2));
      shadow.style.transform = `translateY(${pressed}px) scale(${(1 - 0.02 * pressed) * (0.96 + 0.04 * appear)})`;
      button.style.pointerEvents = respawn > 0 ? "none" : "auto";
      if (hint) hint.style.opacity = String(respawn > 0 ? 0 : 0.5);
      if (respawn <= 0 && announced) {
        announced = false;
        setStatus("");
      }
    }

    setWeb([0, 0]);

    let last = 0;
    let frame = 0;
    let running = false;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      render(dt);
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const visibility = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    visibility.observe(stage);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointerup", release);
      button.removeEventListener("pointercancel", release);
      button.removeEventListener("lostpointercapture", release);
      button.removeEventListener("keydown", onKeyDown);
      button.removeEventListener("keyup", onKeyUp);
      button.removeEventListener("blur", release);
      button.removeEventListener("contextmenu", onContextMenu);
      button.removeEventListener("pointerenter", onEnter);
      button.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointerdown", onStageDown);
      stage.removeEventListener("pointermove", onStageMove);
      stage.removeEventListener("pointerup", onStageUp);
      stage.removeEventListener("pointercancel", onStageUp);
      Matter.Engine.clear(engine);
      piles.forEach((p) => gl.deleteTexture(p.texture));
      gl.deleteTexture(buttonTexture);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [thumbnail]);

  return (
    <div
      ref={stageRef}
      className={thumbnail ? "text-foreground" : "craft-fill not-prose text-foreground"}
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...(thumbnail
          ? { maxWidth: "28rem", marginInline: "auto", aspectRatio: "16 / 9", borderRadius: 14, pointerEvents: "none" }
          : { minHeight: "30rem" }),
      }}
    >
      <div
        ref={shadowRef}
        aria-hidden
        style={{
          position: "absolute",
          boxShadow: "0 1px 1px rgb(0 0 0 / 0.08), 0 2px 6px rgb(0 0 0 / 0.16)",
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={glRef}
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />
      <button
        ref={buttonRef}
        type="button"
        aria-label="Delete forever. Press and hold to confirm."
        tabIndex={thumbnail ? -1 : 0}
        className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
        style={{
          position: "absolute",
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: "pointer",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      />
      {!thumbnail && (
        <p
          ref={hintRef}
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            margin: 0,
            textAlign: "center",
            font: "500 12px/1 system-ui, sans-serif",
            opacity: 0.5,
            transition: "opacity 200ms ease",
            pointerEvents: "none",
          }}
        >
          Press and hold
        </p>
      )}
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  );
}
