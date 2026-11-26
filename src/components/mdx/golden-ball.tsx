"use client";

import { useEffect, useRef, useState } from "react";

type Vec = { x: number; y: number };
type Point3 = [number, number, number];
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; hue: number };
type Mode = "hover" | "cruise" | "dart";

const SENSE = 240;
const NOTICE_TIME = 0.22;
const STAMINA = 1.6;
const REST = 1.3;
const STILL_TIME = 0.45;
const MAX_SPEED = 950;
const RESPAWN = 1.4;
const DEG = Math.PI / 180;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const onSphere = (lat: number, lon: number): Point3 => [
  Math.cos(lat * DEG) * Math.sin(lon * DEG),
  -Math.sin(lat * DEG),
  Math.cos(lat * DEG) * Math.cos(lon * DEG),
];

function engravings() {
  const curves: Point3[][] = [];
  for (const back of [0, 180]) {
    for (const side of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const curve: Point3[] = [];
        for (let i = 0; i <= 28; i++) {
          const u = i / 28;
          const lat = -60 + k * 8.5 + u * (40 + k * 3) - Math.sin(u * Math.PI) * 7;
          const lon = back + side * (2 + u * (64 - k * 3));
          curve.push(onSphere(lat, lon));
        }
        curves.push(curve);
      }
    }
    for (let j = -3; j <= 3; j++) {
      const curve: Point3[] = [];
      for (let i = 0; i <= 22; i++) {
        const u = i / 22;
        const lat = 16 + u * (50 - Math.abs(j) * 6);
        const lon = back + j * 15 + j * u * 9 + Math.sin(u * Math.PI * 2.2 + j) * 5 * (1 - u * 0.6);
        curve.push(onSphere(lat, lon));
      }
      curves.push(curve);
    }
    for (const side of [-1, 1]) {
      const curve: Point3[] = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        curve.push(onSphere(-8 + Math.sin(u * Math.PI) * 6, back + side * (8 + u * 74)));
      }
      curves.push(curve);
    }
  }
  return curves;
}

const ENGRAVINGS = engravings();

const WING_W = 112;
const WING_H = 78;
const HINGE_X = 4;
const HINGE_Y = 66;

function leading(t: number): Vec {
  const m = 1 - t;
  return {
    x: 3 * m * m * t * 12 + 3 * m * t * t * 48 + t * t * t * 96,
    y: 3 * m * m * t * -30 + 3 * m * t * t * -60 + t * t * t * -58,
  };
}

function wingPath(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(12, -30, 48, -60, 96, -58);
  g.bezierCurveTo(110, -57, 106, -34, 88, -24);
  const a = { x: 88, y: -24 };
  const b = { x: 6, y: 6 };
  const n = 11;
  const nx = 0.34;
  const ny = 0.94;
  for (let i = 1; i <= n; i++) {
    const t0 = (i - 1) / n;
    const t1 = i / n;
    const depth = 8 * (1 - t1 * 0.5);
    const mx = a.x + (b.x - a.x) * (t0 + t1) / 2 + nx * depth;
    const my = a.y + (b.y - a.y) * (t0 + t1) / 2 + ny * depth;
    g.quadraticCurveTo(mx, my, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
  }
  g.quadraticCurveTo(2, 6, 0, 0);
  g.closePath();
}

function buildWing(px: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(WING_W * px);
  canvas.height = Math.ceil(WING_H * px);
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  g.scale(px, px);
  g.translate(HINGE_X, HINGE_Y);

  wingPath(g);
  const base = g.createLinearGradient(10, -58, 60, 10);
  base.addColorStop(0, "#fff1bd");
  base.addColorStop(0.3, "#ecc35a");
  base.addColorStop(0.7, "#bf8a2a");
  base.addColorStop(1, "#7a4c0d");
  g.fillStyle = base;
  g.fill();

  g.save();
  wingPath(g);
  g.clip();
  const ribs = 19;
  for (let i = 0; i < ribs; i++) {
    const t = (i + 0.6) / ribs;
    const start = leading(t);
    const dx = -0.42 - t * 0.1;
    const dy = 1;
    const length = 80;
    const ex = start.x + dx * length;
    const ey = start.y + dy * length;
    const cx = (start.x + ex) / 2 + 7;
    const cy = (start.y + ey) / 2 - 4;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(start.x + 1.7, start.y + 0.6);
    g.quadraticCurveTo(cx + 1.7, cy + 0.6, ex + 1.7, ey + 0.6);
    g.strokeStyle = "rgba(70, 38, 2, 0.75)";
    g.lineWidth = 2.6;
    g.stroke();
    g.beginPath();
    g.moveTo(start.x, start.y);
    g.quadraticCurveTo(cx, cy, ex, ey);
    g.strokeStyle = "rgba(255, 234, 168, 0.95)";
    g.lineWidth = 2;
    g.stroke();
    g.beginPath();
    g.moveTo(start.x - 0.6, start.y - 0.3);
    g.quadraticCurveTo(cx - 0.6, cy - 0.3, ex - 0.6, ey - 0.3);
    g.strokeStyle = "rgba(255, 252, 235, 0.6)";
    g.lineWidth = 0.6;
    g.stroke();
  }
  const shade = g.createLinearGradient(40, -50, 30, 10);
  shade.addColorStop(0, "rgba(255, 245, 210, 0.18)");
  shade.addColorStop(0.55, "rgba(0, 0, 0, 0)");
  shade.addColorStop(1, "rgba(60, 30, 0, 0.42)");
  g.fillStyle = shade;
  g.fillRect(-10, -70, 130, 90);
  const root = g.createRadialGradient(0, 0, 0, 0, 0, 26);
  root.addColorStop(0, "rgba(70, 40, 0, 0.35)");
  root.addColorStop(1, "rgba(70, 40, 0, 0)");
  g.fillStyle = root;
  g.fillRect(-10, -30, 40, 40);
  g.restore();

  wingPath(g);
  g.strokeStyle = "rgba(96, 58, 6, 0.95)";
  g.lineWidth = 1.1;
  g.lineJoin = "round";
  g.stroke();

  g.beginPath();
  g.moveTo(1, -1.2);
  g.bezierCurveTo(13, -31.2, 49, -61.2, 96, -59.2);
  g.strokeStyle = "rgba(255, 248, 215, 0.85)";
  g.lineWidth = 1.4;
  g.lineCap = "round";
  g.stroke();
  return canvas;
}

export function GoldenBall({ thumbnail = false }: { thumbnail?: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [caught, setCaught] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let radius = 14;
    let wingLength = 50;
    let wall = 80;
    let wing: HTMLCanvasElement | null = null;

    const ball = { pos: { x: 0, y: 0 } as Vec, vel: { x: 0, y: 0 } as Vec, alive: true, scale: 1, respawn: 0 };
    let mode: Mode = "hover";
    let modeTime = 1.2;
    let heading = rand(0, Math.PI * 2);
    let dartTarget: Vec = { x: 0, y: 0 };
    let dodge = 1;
    let awareness = 0;
    let fleeing = false;
    let stamina = STAMINA;
    let tired = 0;
    let lastMove = -10;
    let flapPhase = 0;
    let flapRate = 7;
    const pointer = { x: -9999, y: -9999, inside: false };
    const sparks: Spark[] = [];
    const rings: { x: number; y: number; t: number }[] = [];
    let time = 0;
    let last = performance.now();
    let frame = 0;
    let running = false;
    let visible = true;

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      radius = clamp(Math.min(width, height) * 0.03, 12, 20);
      wingLength = radius * 3.3;
      wall = Math.min(radius * 6, Math.min(width, height) * 0.3);
      wing = buildWing((wingLength / 100) * dpr * 1.5);
      if (ball.pos.x === 0 && ball.pos.y === 0) ball.pos = { x: width * 0.5, y: height * 0.45 };
      ball.pos.x = clamp(ball.pos.x, radius, width - radius);
      ball.pos.y = clamp(ball.pos.y, radius, height - radius);
    };

    const pickMode = () => {
      const roll = Math.random();
      if (roll < 0.4 || thumbnail) {
        mode = "hover";
        modeTime = rand(0.7, 1.8);
      } else if (roll < 0.82) {
        mode = "cruise";
        modeTime = rand(1.2, 2.6);
        heading = rand(0, Math.PI * 2);
      } else {
        mode = "dart";
        modeTime = rand(0.35, 0.6);
        dartTarget = { x: rand(wall, width - wall), y: rand(wall, height - wall) };
      }
    };

    const spawnAtEdge = () => {
      const side = Math.floor(rand(0, 4));
      const x = side === 0 ? -wingLength : side === 1 ? width + wingLength : rand(wall, width - wall);
      const y = side === 2 ? -wingLength : side === 3 ? height + wingLength : rand(wall, height - wall);
      ball.pos = { x, y };
      const toCenter = { x: width / 2 - x, y: height / 2 - y };
      const length = Math.hypot(toCenter.x, toCenter.y) || 1;
      ball.vel = { x: (toCenter.x / length) * 520, y: (toCenter.y / length) * 520 };
      ball.alive = true;
      ball.scale = 0;
      mode = "cruise";
      modeTime = 0.9;
      heading = Math.atan2(toCenter.y, toCenter.x);
    };

    const burst = (x: number, y: number) => {
      for (let i = 0; i < 56; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(80, 460);
        const max = rand(0.6, 1.4);
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: max, max, size: rand(1, 3), hue: rand(36, 52) });
      }
      rings.push({ x, y, t: 0 });
    };

    const startle = (x: number, y: number) => {
      const dx = ball.pos.x - x;
      const dy = ball.pos.y - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > SENSE * 1.4) return;
      dodge = Math.random() < 0.5 ? -1 : 1;
      ball.vel.x += (dx / d) * 520 + (-dy / d) * 260 * dodge;
      ball.vel.y += (dy / d) * 520 + (dx / d) * 260 * dodge;
      awareness = NOTICE_TIME;
    };

    const update = (dt: number) => {
      time += dt;

      if (!ball.alive) {
        ball.respawn -= dt;
        if (ball.respawn <= 0) spawnAtEdge();
      } else {
        ball.scale = Math.min(1, ball.scale + dt * 3);
        modeTime -= dt;
        if (modeTime <= 0) pickMode();

        const dx = ball.pos.x - pointer.x;
        const dy = ball.pos.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        const moving = time - lastMove < STILL_TIME;
        const near = pointer.inside && distance < SENSE && moving && tired <= 0;
        awareness = near ? awareness + dt : Math.max(0, awareness - dt * 2);
        fleeing = near && awareness >= NOTICE_TIME;
        if (tired > 0) {
          tired -= dt;
        } else if (fleeing) {
          stamina -= dt;
          if (stamina <= 0) {
            tired = REST;
            stamina = STAMINA;
            awareness = 0;
            fleeing = false;
          }
        } else {
          stamina = Math.min(STAMINA, stamina + dt * 0.8);
        }

        let desired: Vec;
        let steer: number;
        if (fleeing) {
          const urgency = 1 - distance / SENSE;
          const speed = 320 + urgency * 620;
          const away = { x: dx / distance, y: dy / distance };
          const side = { x: -away.y * dodge, y: away.x * dodge };
          desired = { x: (away.x * 0.75 + side.x * 0.55) * speed, y: (away.y * 0.75 + side.y * 0.55) * speed };
          steer = 7;
          if (Math.random() < dt * 1.5) dodge = -dodge;
        } else if (tired > 0) {
          desired = { x: Math.sin(time * 1.6) * 10, y: Math.cos(time * 2.4) * 8 + 12 };
          steer = 5;
        } else if (pointer.inside && !moving && distance < 340 && distance > radius * 4) {
          desired = { x: (-dx / distance) * 90 + Math.sin(time * 2.1) * 20, y: (-dy / distance) * 90 + Math.cos(time * 3.3) * 16 };
          steer = 2;
        } else if (mode === "hover") {
          desired = { x: Math.sin(time * 2.1) * 26, y: Math.cos(time * 3.3) * 20 };
          steer = 3;
        } else if (mode === "cruise") {
          heading += Math.sin(time * 1.7) * dt * 2.2;
          desired = { x: Math.cos(heading) * 170, y: Math.sin(heading) * 170 };
          steer = 2.5;
        } else {
          const tx = dartTarget.x - ball.pos.x;
          const ty = dartTarget.y - ball.pos.y;
          const td = Math.hypot(tx, ty) || 1;
          desired = { x: (tx / td) * 780, y: (ty / td) * 780 };
          steer = 9;
        }

        if (ball.pos.x < wall) desired.x += (wall - ball.pos.x) * 14;
        if (ball.pos.x > width - wall) desired.x -= (ball.pos.x - (width - wall)) * 14;
        if (ball.pos.y < wall) desired.y += (wall - ball.pos.y) * 14;
        if (ball.pos.y > height - wall) desired.y -= (ball.pos.y - (height - wall)) * 14;

        if (reduce) {
          desired.x *= 0.5;
          desired.y *= 0.5;
        }

        const k = Math.min(1, dt * steer);
        ball.vel.x += (desired.x - ball.vel.x) * k;
        ball.vel.y += (desired.y - ball.vel.y) * k;
        const speed = Math.hypot(ball.vel.x, ball.vel.y);
        if (speed > MAX_SPEED) {
          ball.vel.x *= MAX_SPEED / speed;
          ball.vel.y *= MAX_SPEED / speed;
        }
        ball.pos.x += ball.vel.x * dt;
        ball.pos.y += ball.vel.y * dt;

        const targetRate = reduce ? 2.5 : tired > 0 ? 4 : fleeing || mode === "dart" ? 15 : mode === "cruise" ? 10 : 6.5;
        flapRate += (targetRate - flapRate) * Math.min(1, dt * 4);
        flapPhase += dt * flapRate * Math.PI * 2;

        if (!reduce && speed > 220 && Math.random() < dt * (speed / 18)) {
          sparks.push({
            x: ball.pos.x + rand(-3, 3),
            y: ball.pos.y + rand(-3, 3),
            vx: -ball.vel.x * 0.08 + rand(-20, 20),
            vy: -ball.vel.y * 0.08 + rand(-20, 20),
            life: 0.55,
            max: 0.55,
            size: rand(0.8, 1.8),
            hue: rand(40, 50),
          });
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        spark.life -= dt;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        spark.vx *= 1 - dt * 2.4;
        spark.vy = spark.vy * (1 - dt * 2.4) + 60 * dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].t += dt;
        if (rings[i].t > 0.7) rings.splice(i, 1);
      }
    };

    const drawWing = (side: number, phase: number, alpha: number) => {
      if (!wing) return;
      const beat = Math.sin(phase);
      const scale = wingLength / 100;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(side * radius * 0.92, -radius * 0.08);
      ctx.scale(side, 1);
      ctx.rotate(0.05 - beat * 0.6);
      ctx.scale(1, 0.78 + 0.22 * Math.cos(phase));
      ctx.drawImage(wing, -HINGE_X * scale, -HINGE_Y * scale, WING_W * scale, WING_H * scale);
      ctx.restore();
    };

    const drawEngravings = (yaw: number, pitch: number) => {
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const buckets: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      const highlights: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      const offset = radius * 0.04;
      for (const curve of ENGRAVINGS) {
        let px = 0;
        let py = 0;
        let pz = -1;
        for (let i = 0; i < curve.length; i++) {
          const [x, y, z] = curve[i];
          const rx = x * cy + z * sy;
          const rz = -x * sy + z * cy;
          const ry = y * cp - rz * sp;
          const fz = y * sp + rz * cp;
          const sx = rx * radius;
          const syy = ry * radius;
          if (i > 0 && pz > 0.08 && fz > 0.08) {
            const level = Math.min(3, Math.floor(Math.min(pz, fz) * 4));
            buckets[level].moveTo(px, py);
            buckets[level].lineTo(sx, syy);
            highlights[level].moveTo(px - offset, py - offset);
            highlights[level].lineTo(sx - offset, syy - offset);
          }
          px = sx;
          py = syy;
          pz = fz;
        }
      }
      ctx.lineCap = "round";
      for (let level = 0; level < 4; level++) {
        const strength = (level + 1) / 4;
        ctx.strokeStyle = `rgba(88, 48, 2, ${0.85 * strength})`;
        ctx.lineWidth = radius * 0.075;
        ctx.stroke(buckets[level]);
        ctx.strokeStyle = `rgba(255, 240, 190, ${0.55 * strength})`;
        ctx.lineWidth = radius * 0.04;
        ctx.stroke(highlights[level]);
      }
    };

    const drawKnob = (side: number) => {
      const r = radius * 0.17;
      const x = side * radius * 0.95;
      const y = -radius * 0.08;
      const knob = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      knob.addColorStop(0, "#fff3c4");
      knob.addColorStop(0.5, "#d9a43c");
      knob.addColorStop(1, "#6f450a");
      ctx.fillStyle = knob;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawBall = () => {
      if (!ball.alive || ball.scale <= 0) return;
      const r = radius;
      const bob = Math.sin(time * 5.2) * r * 0.08;
      const bank = clamp(ball.vel.x * 0.0007, -0.45, 0.45);
      const yaw = Math.sin(time * 0.8) * 0.45 + clamp(ball.vel.x * 0.0008, -0.7, 0.7);
      const pitch = 0.2 + Math.sin(time * 1.3) * 0.08 + clamp(ball.vel.y * 0.0005, -0.4, 0.4);

      ctx.save();
      ctx.translate(ball.pos.x, ball.pos.y + bob);
      ctx.rotate(bank);
      ctx.scale(ball.scale, ball.scale);

      const glow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 4.5);
      glow.addColorStop(0, "rgba(255, 205, 90, 0.32)");
      glow.addColorStop(1, "rgba(255, 205, 90, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 4.5, 0, Math.PI * 2);
      ctx.fill();

      const blur = !reduce && flapRate > 9;
      const ghosts = blur ? [0, -0.55, -1.1] : [0];
      for (const side of [-1, 1]) {
        for (let i = ghosts.length - 1; i >= 0; i--) {
          drawWing(side, flapPhase + ghosts[i], i === 0 ? 1 : 0.32 / i);
        }
      }

      ctx.save();
      ctx.shadowColor = "rgba(40, 20, 0, 0.45)";
      ctx.shadowBlur = r * 0.6;
      ctx.shadowOffsetY = r * 0.2;
      const body = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.05, 0, 0, r * 1.05);
      body.addColorStop(0, "#fff5cf");
      body.addColorStop(0.22, "#f3d16f");
      body.addColorStop(0.55, "#d29d36");
      body.addColorStop(0.85, "#9f6714");
      body.addColorStop(1, "#5e3a07");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();

      const bounce = ctx.createRadialGradient(r * 0.2, r * 0.95, 0, r * 0.2, r * 0.95, r * 0.95);
      bounce.addColorStop(0, "rgba(255, 130, 50, 0.32)");
      bounce.addColorStop(1, "rgba(255, 130, 50, 0)");
      ctx.fillStyle = bounce;
      ctx.fillRect(-r, -r, r * 2, r * 2);

      drawEngravings(yaw, pitch);

      const limb = ctx.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.45, 0, 0, r);
      limb.addColorStop(0, "rgba(60, 30, 0, 0)");
      limb.addColorStop(1, "rgba(60, 30, 0, 0.5)");
      ctx.fillStyle = limb;
      ctx.fillRect(-r, -r, r * 2, r * 2);

      const sheen = ctx.createRadialGradient(-r * 0.38, -r * 0.48, 0, -r * 0.38, -r * 0.48, r * 0.55);
      sheen.addColorStop(0, "rgba(255, 255, 245, 0.75)");
      sheen.addColorStop(0.35, "rgba(255, 250, 220, 0.25)");
      sheen.addColorStop(1, "rgba(255, 250, 220, 0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.beginPath();
      ctx.ellipse(-r * 0.4, -r * 0.5, r * 0.13, r * 0.08, -0.7, 0, Math.PI * 2);
      ctx.fill();

      drawKnob(-1);
      drawKnob(1);
      ctx.restore();
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (const ring of rings) {
        const p = ring.t / 0.7;
        ctx.strokeStyle = `rgba(245, 196, 70, ${(1 - p) * 0.7})`;
        ctx.lineWidth = 2 * (1 - p) + 0.5;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, radius + p * 80, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const spark of sparks) {
        const a = spark.life / spark.max;
        ctx.fillStyle = `hsla(${spark.hue}, 95%, ${55 + a * 25}%, ${a})`;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * (0.4 + a * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }

      drawBall();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      update(dt);
      draw();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const local = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onMove = (event: PointerEvent) => {
      const point = local(event);
      if (Math.hypot(point.x - pointer.x, point.y - pointer.y) > 2) lastMove = time;
      pointer.x = point.x;
      pointer.y = point.y;
      pointer.inside = event.pointerType === "mouse" || event.buttons > 0;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    const onDown = (event: PointerEvent) => {
      const point = local(event);
      pointer.x = point.x;
      pointer.y = point.y;
      if (ball.alive && ball.scale > 0.6 && Math.hypot(ball.pos.x - point.x, ball.pos.y - point.y) < radius * 2.6) {
        ball.alive = false;
        ball.respawn = RESPAWN;
        burst(ball.pos.x, ball.pos.y);
        setCaught((count) => count + 1);
        return;
      }
      startle(point.x, point.y);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") pointer.inside = false;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    visibility.observe(stage);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    if (!thumbnail) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onLeave);
    }
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onLeave);
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
          ? { maxWidth: "28rem", marginInline: "auto", aspectRatio: "16 / 9", pointerEvents: "none" }
          : { minHeight: "30rem" }),
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="A small golden ball with wings flutters around. Click or tap it to catch it."
        role="img"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair" }}
      />
      {!thumbnail && (
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            top: "1.5rem",
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
            fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
            fontWeight: 800,
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ fontSize: "1.05rem", opacity: caught ? 1 : 0.55 }}>
            {caught === 0 ? "Hold still. It gets curious." : `Caught ${caught} ${caught === 1 ? "time" : "times"}`}
          </span>
        </div>
      )}
    </div>
  );
}
