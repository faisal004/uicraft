"use client";

import { useEffect, useRef, useState } from "react";

// Card design size. Everything on the card is drawn in these units, then scaled.
const CARD_W = 340;
const CARD_H = 214;

// Timeline of one card, in seconds.
const SLIDE_IN = 1.1;
const HOLD = 0.8;
const CROSS = 1.8;
const AFTER = 2.4;

// One particle every STEP CSS pixels of card. About one in TARGET_SHARE flies to a character cell.
const STEP = 2.5;
const TARGET_SHARE = 0.09;

const CELL_W = 9;
const CELL_H = 16;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";

// Fictional banks and network, so no card imitates a real brand.
const CARDS = [
  { holder: "ADA OKAFOR", bank: "Northwind", tier: "PLATINUM", number: "4921 6630 1842 7730", expiry: "08/29", from: "#16205a", to: "#5a3fd0", glow: "#9fb4ff", ink: "#eef1ff" },
  { holder: "MINA PARK", bank: "Harbor", tier: "METAL", number: "5413 0291 7755 6402", expiry: "11/28", from: "#0c0c0f", to: "#44444d", glow: "#d9d9e6", ink: "#e9e9ef" },
  { holder: "LEO VARGA", bank: "Fernhill", tier: "REWARDS", number: "4716 2208 9134 0561", expiry: "03/30", from: "#0b3d2f", to: "#3c9e78", glow: "#b8f5d8", ink: "#effcf6" },
  { holder: "SOL REYES", bank: "Coralline", tier: "SIGNATURE", number: "5280 7741 0036 9218", expiry: "06/27", from: "#a8384f", to: "#f2a27a", glow: "#ffe0cf", ink: "#fff6f0" },
];

type Card = (typeof CARDS)[number];

type Layout = ReturnType<typeof layoutFor>;

function layoutFor(width: number, height: number) {
  const seam = width / 2;
  const cardW = Math.max(120, Math.min(420, width * 0.3, seam - 32));
  const cardH = cardW * (CARD_H / CARD_W);
  const restX = Math.max(16, seam / 2 - cardW / 2);
  const distance = Math.max(0, seam - cardW - restX);
  // While crossing, the card moves one card width in CROSS seconds. The approach eases in
  // (x = distance · s²) and ends at exactly that speed, so there's no jolt at the seam.
  const speed = cardW / CROSS;
  const approach = (2 * distance) / speed;
  const cross = SLIDE_IN + HOLD + approach;
  return {
    width, height, seam, cardW, cardH, cardY: (height - cardH) / 2,
    restX, distance, speed, approach, cross, total: cross + CROSS + AFTER,
  };
}

function cardXAt(layout: Layout, t: number) {
  const { cardW, restX, distance, approach, seam, speed } = layout;
  if (t < SLIDE_IN) {
    const eased = 1 - (1 - t / SLIDE_IN) ** 3;
    return -cardW - 40 + (restX + cardW + 40) * eased;
  }
  const moving = t - SLIDE_IN - HOLD;
  if (moving < 0) return restX;
  if (moving < approach) return restX + distance * (moving / approach) ** 2;
  return seam - cardW + speed * (moving - approach);
}

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fakeHash() {
  return Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
}

function drawCard(canvas: HTMLCanvasElement, width: number, height: number, card: Card, index: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d")!;
  const scale = (width / CARD_W) * dpr;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  const random = seeded(index * 977 + 13);

  // Body: a diagonal gradient, the finish of the card.
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD_W, CARD_H, 14);
  const body = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  body.addColorStop(0, card.from);
  body.addColorStop(1, card.to);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Fine guilloche waves, printed security pattern.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.lineWidth = 0.8;
  for (let line = 0; line < 22; line++) {
    ctx.beginPath();
    for (let x = -10; x <= CARD_W + 10; x += 6) {
      const y = 70 + line * 7 + Math.sin(x / 40 + line * 0.32) * 16 + Math.sin(x / 13 + line) * 2;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Soft light from the top right and a glossy diagonal sheen.
  const light = ctx.createRadialGradient(290, -30, 10, 290, -30, 260);
  light.addColorStop(0, `${card.glow}55`);
  light.addColorStop(1, `${card.glow}00`);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const sheen = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  sheen.addColorStop(0.3, "rgba(255, 255, 255, 0)");
  sheen.addColorStop(0.47, "rgba(255, 255, 255, 0.13)");
  sheen.addColorStop(0.6, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // Grain, so the surface doesn't read as flat vector.
  for (let dot = 0; dot < 900; dot++) {
    ctx.fillStyle = random() > 0.5 ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.07)";
    ctx.fillRect(random() * CARD_W, random() * CARD_H, 0.8, 0.8);
  }
  ctx.restore();

  // Bevelled edge.
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, CARD_W - 1, CARD_H - 1, 13.5);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bank and tier.
  ctx.fillStyle = card.ink;
  ctx.font = "700 16px system-ui, sans-serif";
  ctx.fillText(card.bank, 26, 36);
  ctx.globalAlpha = 0.7;
  ctx.font = "600 8px system-ui, sans-serif";
  ctx.letterSpacing = "1.5px";
  ctx.fillText(card.tier, 26, 50);
  ctx.letterSpacing = "0px";
  ctx.globalAlpha = 1;

  // Contactless symbol.
  ctx.strokeStyle = card.ink;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let arc = 0; arc < 4; arc++) {
    ctx.beginPath();
    ctx.arc(300, 30, 4 + arc * 4, -Math.PI / 4, Math.PI / 4);
    ctx.globalAlpha = 0.85;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // EMV chip.
  const gold = ctx.createLinearGradient(28, 72, 74, 108);
  gold.addColorStop(0, "#f7e7a8");
  gold.addColorStop(0.45, "#c99f48");
  gold.addColorStop(0.7, "#f1d98d");
  gold.addColorStop(1, "#b48a37");
  ctx.beginPath();
  ctx.roundRect(28, 72, 46, 36, 6);
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.strokeStyle = "rgba(92, 62, 12, 0.5)";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(28, 84); ctx.lineTo(42, 84);
  ctx.moveTo(60, 84); ctx.lineTo(74, 84);
  ctx.moveTo(28, 96); ctx.lineTo(42, 96);
  ctx.moveTo(60, 96); ctx.lineTo(74, 96);
  ctx.moveTo(51, 72); ctx.lineTo(51, 80);
  ctx.moveTo(51, 100); ctx.lineTo(51, 108);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(42, 80, 18, 20, 4);
  ctx.stroke();

  // Embossed text: a dark edge below right, a light edge above left.
  const emboss = (text: string, x: number, y: number) => {
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillText(text, x + 0.8, y + 1);
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillText(text, x - 0.5, y - 0.6);
    ctx.fillStyle = card.ink;
    ctx.fillText(text, x, y);
  };

  ctx.font = "600 21px 'OCR A Std', 'OCR A Extended', 'Courier New', ui-monospace, monospace";
  ctx.letterSpacing = "1.5px";
  card.number.split(" ").forEach((group, i) => emboss(group, 28 + i * 72, 146));

  ctx.font = "600 6px system-ui, sans-serif";
  ctx.letterSpacing = "0.5px";
  ctx.fillStyle = card.ink;
  ctx.globalAlpha = 0.75;
  ctx.fillText("VALID", 132, 165);
  ctx.fillText("THRU", 132, 172);
  ctx.globalAlpha = 1;
  ctx.font = "600 13px 'OCR A Std', 'Courier New', ui-monospace, monospace";
  emboss(card.expiry, 156, 172);

  ctx.font = "600 13px 'OCR A Std', 'Courier New', ui-monospace, monospace";
  ctx.letterSpacing = "1.5px";
  emboss(card.holder, 28, 196);
  ctx.letterSpacing = "0px";

  // A made-up card network mark.
  ctx.fillStyle = card.ink;
  ctx.font = "italic 800 20px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("nova", 314, 198);
  ctx.textAlign = "left";
  ctx.beginPath();
  ctx.ellipse(296, 178, 20, 5, -0.18, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = card.ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

const VERTEX = `#version 300 es
in vec2 aUv;
in vec4 aRand;
in vec3 aTarget;
uniform float uTime;
uniform float uCross;
uniform float uSeam;
uniform float uDpr;
uniform vec3 uCard;
uniform vec2 uRes;
out vec2 vUv;
out float vAlpha;
out float vAge;

void main() {
  // The card's right edge reaches the seam first, so column u is born (1 - u) of the way through.
  float birth = (1.0 - aUv.x) * uCross;
  float age = uTime - birth;
  vec2 start = vec2(uSeam, uCard.x + aUv.y * uCard.z);
  vec2 pos;
  float life;
  float k;

  if (aTarget.z > 0.5) {
    // Flies along a curve and lands in a character cell.
    life = 0.7 + 0.6 * aRand.x;
    k = clamp(age / life, 0.0, 1.0);
    float e = k * k * (3.0 - 2.0 * k);
    vec2 bend = start + vec2(40.0 + 140.0 * aRand.y, (aRand.z - 0.5) * 160.0);
    pos = mix(mix(start, bend, e), mix(bend, aTarget.xy, e), e);
    vAlpha = 1.0 - smoothstep(0.85, 1.0, k);
  } else {
    // Blows away to the right and fades out.
    life = 0.6 + 1.0 * aRand.y;
    k = clamp(age / life, 0.0, 1.0);
    pos = start + vec2(
      (30.0 + 220.0 * aRand.x) * age + 90.0 * age * age,
      (aRand.z - 0.5) * 90.0 * age + sin(age * 7.0 + aRand.w * 6.283) * 8.0 * k
    );
    vAlpha = 1.0 - k;
  }

  if (age < 0.0 || age > life) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }

  vec2 clip = pos / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = mix(2.8, 1.4, k) * uDpr;
  vUv = aUv;
  vAge = k;
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
uniform sampler2D uTex;
in vec2 vUv;
in float vAlpha;
in float vAge;
out vec4 color;

void main() {
  vec4 card = texture(uTex, vUv);
  vec3 cipher = vec3(0.7, 0.62, 1.0);
  vec3 rgb = mix(card.rgb, cipher, smoothstep(0.05, 0.55, vAge));
  rgb += vec3(0.35, 0.3, 0.55) * (1.0 - smoothstep(0.0, 0.25, vAge));
  float alpha = vAlpha * card.a;
  color = vec4(rgb * alpha, alpha);
}`;

type Particles = { data: Float32Array; count: number; arrivals: { at: number; cell: number }[] };

function buildParticles(layout: Layout, cols: number, rows: number): Particles {
  const across = Math.max(1, Math.round(layout.cardW / STEP));
  const down = Math.max(1, Math.round(layout.cardH / STEP));
  const count = across * down;
  const data = new Float32Array(count * 9);
  const arrivals: Particles["arrivals"] = [];
  let i = 0;
  for (let y = 0; y < down; y++) {
    for (let x = 0; x < across; x++) {
      const u = (x + 0.5) / across;
      const v = (y + 0.5) / down;
      const r = [Math.random(), Math.random(), Math.random(), Math.random()];
      let target = [0, 0, 0];
      if (Math.random() < TARGET_SHARE) {
        // Bias landings toward the seam, where the cipher text is densest.
        const col = Math.min(cols - 1, Math.floor(Math.random() ** 1.7 * cols));
        const row = Math.floor(Math.random() * rows);
        target = [layout.seam + (col + 0.5) * CELL_W, (row + 0.5) * CELL_H, 1];
        arrivals.push({ at: (1 - u) * CROSS + 0.7 + 0.6 * r[0], cell: row * cols + col });
      }
      data.set([u, v, ...r, ...target], i * 9);
      i++;
    }
  }
  arrivals.sort((a, b) => a.at - b.at);
  return { data, count, arrivals };
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export function VaultCard({ thumbnail = false }: { thumbnail?: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLCanvasElement>(null);
  const cardWrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState({ person: 0, phase: "sending" as "sending" | "encrypting" | "stored", hash: "" });

  useEffect(() => {
    const stage = stageRef.current!;
    const cardCanvas = cardRef.current!;
    const cardWrap = cardWrapRef.current!;
    const gridCanvas = gridRef.current!;
    const glCanvas = glRef.current!;
    const seamLine = seamRef.current!;
    const grid = gridCanvas.getContext("2d")!;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // ---- WebGL particles ----
    // Without WebGL 2 the card still slides and clips; only the particles are skipped.
    const context = glCanvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false });
    // A page full of thumbnails can run out of contexts, so a lost one counts as no WebGL.
    let gl = context && !context.isContextLost() ? context : null;
    const vertexShader = gl && compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragmentShader = gl && compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertexShader || !fragmentShader) gl = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let vao: WebGLVertexArrayObject | null = null;
    let texture: WebGLTexture | null = null;
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    if (gl) {
      program = gl.createProgram()!;
      gl.attachShader(program, vertexShader!);
      gl.attachShader(program, fragmentShader!);
      gl.linkProgram(program);
      gl.useProgram(program);
      for (const name of ["uTime", "uCross", "uSeam", "uDpr", "uCard", "uRes", "uTex"]) {
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const attribute = (name: string, size: number, offset: number) => {
        const location = gl.getAttribLocation(program!, name);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 36, offset * 4);
      };
      attribute("aUv", 2, 0);
      attribute("aRand", 4, 2);
      attribute("aTarget", 3, 6);
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(uniforms.uTex, 0);
      gl.uniform1f(uniforms.uCross, CROSS);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    // ---- State ----
    let layout = layoutFor(1, 1);
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let chars = new Uint8Array(0);
    let heat = new Float32Array(0);
    let particles: Particles = { data: new Float32Array(0), count: 0, arrivals: [] };
    let nextArrival = 0;
    let person = 0;
    let time = 0;
    let phase = "";

    const uploadCard = () => {
      drawCard(cardCanvas, layout.cardW, layout.cardH, CARDS[person], person);
      if (gl) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cardCanvas);
      }
    };

    const rebuildParticles = () => {
      particles = buildParticles(layout, cols, rows);
      const elapsed = time - layout.cross;
      nextArrival = particles.arrivals.findIndex((arrival) => arrival.at > elapsed);
      if (nextArrival < 0) nextArrival = particles.arrivals.length;
      if (gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, particles.data, gl.STATIC_DRAW);
      }
    };

    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      layout = layoutFor(width, height);
      glCanvas.width = Math.round(width * dpr);
      glCanvas.height = Math.round(height * dpr);
      const panelW = width - layout.seam;
      gridCanvas.width = Math.round(panelW * dpr);
      gridCanvas.height = Math.round(height * dpr);
      cols = Math.ceil(panelW / CELL_W);
      rows = Math.ceil(height / CELL_H);
      chars = Uint8Array.from({ length: cols * rows }, () => Math.floor(Math.random() * GLYPHS.length));
      heat = new Float32Array(cols * rows);
      cardWrap.style.top = `${layout.cardY}px`;
      seamLine.style.left = `${layout.seam - 1}px`;
      uploadCard();
      rebuildParticles();
      if (gl) {
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.uniform2f(uniforms.uRes, width, height);
        gl.uniform1f(uniforms.uSeam, layout.seam);
        gl.uniform1f(uniforms.uDpr, dpr);
        gl.uniform3f(uniforms.uCard, layout.cardY, layout.cardW, layout.cardH);
      }
      render();
    };

    const drawGrid = (reduced: boolean) => {
      grid.setTransform(dpr, 0, 0, dpr, 0, 0);
      grid.clearRect(0, 0, cols * CELL_W, rows * CELL_H);
      grid.font = "500 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      grid.textBaseline = "middle";
      grid.textAlign = "center";
      for (let col = 0; col < cols; col++) {
        // Brighter near the seam, like freshly written cipher text.
        const base = 0.14 + 0.4 * Math.exp(-col / 5);
        for (let row = 0; row < rows; row++) {
          const index = row * cols + col;
          const h = heat[index];
          if (!reduced && (Math.random() < h * 0.5 || Math.random() < 0.0015)) {
            chars[index] = Math.floor(Math.random() * GLYPHS.length);
          }
          const r = Math.round(143 + 112 * h);
          const g = Math.round(124 + 131 * h);
          grid.fillStyle = `rgba(${r},${g},255,${Math.min(1, base + h * 0.85)})`;
          grid.fillText(GLYPHS[chars[index]], (col + 0.5) * CELL_W, (row + 0.5) * CELL_H);
        }
      }
    };

    const setPhase = (next: "sending" | "encrypting" | "stored") => {
      if (next === phase) return;
      phase = next;
      setStatus((current) => ({
        person,
        phase: next,
        hash: next === "stored" ? fakeHash() : current.hash,
      }));
    };

    let last = 0;
    let frame = 0;
    let running = false;

    function render(dt = 0) {
      const reduced = motion.matches;
      const elapsed = time - layout.cross;

      // Card: slide, then clip away everything past the seam.
      const x = reduced ? layout.restX : cardXAt(layout, time);
      const visible = layout.seam - x;
      cardWrap.style.transform = `translate3d(${x}px, 0, 0)`;
      if (reduced) {
        cardWrap.style.opacity = String(elapsed < 0 ? Math.min(1, time / 0.3) : Math.max(0, 1 - elapsed / 0.4));
        cardCanvas.style.clipPath = "none";
      } else if (visible >= layout.cardW) {
        cardWrap.style.opacity = "1";
        cardCanvas.style.clipPath = "none";
      } else {
        // A ragged right edge, gnawed a few pixels into the card, looks like it is coming apart.
        const points = ["0 0"];
        const steps = 14;
        for (let i = 0; i <= steps; i++) {
          const bite = 2.5 + 2.5 * Math.sin(i * 2.7 + time * 31) * Math.sin(i * 1.3 + time * 17);
          points.push(`${Math.max(0, visible - bite).toFixed(1)}px ${((i / steps) * 100).toFixed(1)}%`);
        }
        points.push("0 100%");
        cardCanvas.style.clipPath = `polygon(${points.join(",")})`;
        cardWrap.style.opacity = visible <= 0 ? "0" : "1";
      }

      // Characters light up as their particles land.
      const fade = Math.exp(-dt * 1.4);
      for (let i = 0; i < heat.length; i++) heat[i] *= fade;
      const landed = reduced ? (elapsed >= 0 ? Infinity : -1) : elapsed;
      while (nextArrival < particles.arrivals.length && particles.arrivals[nextArrival].at <= landed) {
        const cell = particles.arrivals[nextArrival].cell;
        if (cell < heat.length) {
          heat[cell] = 1;
          if (reduced) chars[cell] = Math.floor(Math.random() * GLYPHS.length);
        }
        nextArrival++;
      }
      drawGrid(reduced);

      const crossing = elapsed > -0.2 && elapsed < CROSS + 0.3;
      seamLine.style.opacity = crossing ? "1" : "0.45";

      if (gl) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!reduced && elapsed > 0 && elapsed < CROSS + 2) {
          gl.useProgram(program);
          gl.bindVertexArray(vao);
          gl.uniform1f(uniforms.uTime, elapsed);
          gl.drawArrays(gl.POINTS, 0, particles.count);
        }
      }

      setPhase(elapsed < 0 ? "sending" : elapsed < CROSS + 0.6 ? "encrypting" : "stored");
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      time += dt;
      if (time >= layout.total) {
        time = 0;
        person = (person + 1) % CARDS.length;
        uploadCard();
        rebuildParticles();
      }
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
      if (gl) {
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
        gl.deleteTexture(texture);
        gl.deleteProgram(program);
      }
    };
  }, []);

  const last4 = CARDS[status.person].number.slice(-4);
  const shortHash = status.hash ? `${status.hash.slice(0, 6)}…${status.hash.slice(-4)}` : "";
  const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

  return (
    <div
      ref={stageRef}
      role="img"
      aria-label="A credit card slides toward a glowing line. As it crosses, it dissolves into particles that land as encrypted text on the other side."
      className={thumbnail ? "text-foreground" : "craft-fill not-prose text-foreground"}
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        ...(thumbnail
          ? { maxWidth: "28rem", marginInline: "auto", aspectRatio: "16 / 9", borderRadius: 14 }
          : { minHeight: "30rem" }),
      }}
    >
      {/* The left half stays clear, so the card sits on the page itself. */}
      <div
        style={{
          position: "absolute",
          inset: "0 0 0 50%",
          background: "radial-gradient(120% 90% at 0% 50%, #2a1868 0%, #140b33 45%, #0b0620 100%)",
        }}
      >
        <canvas ref={gridRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </div>
      <div
        ref={seamRef}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 2,
          background: "linear-gradient(transparent, #c9bbff 20%, #ffffff 50%, #c9bbff 80%, transparent)",
          boxShadow: "0 0 18px 3px #8f7cff",
          transition: "opacity 300ms ease",
        }}
      />
      <div
        ref={cardWrapRef}
        style={{ position: "absolute", left: 0, filter: "drop-shadow(0 18px 26px rgba(10, 6, 30, 0.4))", willChange: "transform" }}
      >
        <canvas ref={cardRef} style={{ display: "block" }} />
      </div>
      <canvas
        ref={glRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />
      {!thumbnail && (
        <>
          <span style={{ position: "absolute", top: 20, left: 24, font: `600 10px/1 ${mono}`, letterSpacing: "0.12em", opacity: 0.5 }}>
            PLAINTEXT
          </span>
          <span style={{ position: "absolute", top: 20, right: 24, font: `600 10px/1 ${mono}`, letterSpacing: "0.12em", color: "#a99cf0" }}>
            CIPHERTEXT
          </span>
          <p aria-live="polite" style={{ position: "absolute", left: 24, bottom: 20, margin: 0, font: `500 12px/1.4 ${mono}`, opacity: 0.65 }}>
            {status.phase === "sending" && `Sending card ending ${last4}`}
            {status.phase === "encrypting" && `Encrypting card ending ${last4}…`}
            {status.phase === "stored" && `Card ending ${last4} is encrypted and stored`}
          </p>
          <span
            style={{
              position: "absolute",
              right: 24,
              bottom: 18,
              padding: "5px 8px",
              borderRadius: 6,
              background: "rgba(11, 6, 32, 0.85)",
              font: `500 11px/1 ${mono}`,
              color: "#e4ddff",
              opacity: status.phase === "stored" ? 1 : 0,
              transition: "opacity 400ms ease",
            }}
          >
            stored · sha-256 {shortHash}
          </span>
        </>
      )}
    </div>
  );
}
