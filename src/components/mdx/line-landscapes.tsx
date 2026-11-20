"use client";

import { Caveat } from "next/font/google";
import { useId, useLayoutEffect, useRef, useState } from "react";

// The handwriting on the back of each card.
const hand = Caveat({ subsets: ["latin"], weight: "500" });

type Point = readonly [x: number, y: number];
type Stroke = { from: Point; to: Point; color: string };
type Ink = readonly [angle: number, spacing: number, color: string];
// A shape is an outline plus the strokes drawn inside it. Shapes nearer the viewer
// cut holes in the ones behind them, unless they are a see-through glaze.
type Shape = { outline: Point[]; glaze?: boolean; draw: (holes: Point[][]) => Stroke[] };

const W = 720;
const H = 420;

// Seeded randomness, so every visit draws the same picture.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Where a horizontal row at height v crosses an outline, read in pairs: in, out.
function spans(points: readonly Point[], v: number): [number, number][] {
  const hits = points.flatMap(([u1, v1], index) => {
    const [u2, v2] = points[(index + 1) % points.length];
    if ((v1 > v) === (v2 > v)) return [];
    return [u1 + (u2 - u1) * (v - v1) / (v2 - v1)];
  }).sort((a, b) => a - b);
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < hits.length; i += 2) pairs.push([hits[i], hits[i + 1]]);
  return pairs;
}

function subtract(pairs: [number, number][], cuts: [number, number][]) {
  return cuts.reduce((kept, [cutStart, cutEnd]) => kept.flatMap(([start, end]): [number, number][] => {
    if (cutEnd <= start || cutStart >= end) return [[start, end]];
    return ([[start, cutStart], [cutEnd, end]] as [number, number][]).filter(([a, b]) => b > a);
  }), pairs);
}

function hatch(polygon: readonly Point[], angle: number, spacing: number, color: string, holes: readonly (readonly Point[])[] = []): Stroke[] {
  const radians = angle * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const turn = (ring: readonly Point[]) => ring.map(([x, y]): Point => [x * cos + y * sin, -x * sin + y * cos]);
  const toPoint = (u: number, v: number): Point => [u * cos - v * sin, u * sin + v * cos];
  const points = turn(polygon);
  const cutouts = holes.map(turn);
  const heights = points.map(([, v]) => v);
  const strokes: Stroke[] = [];

  for (let v = Math.min(...heights) + spacing / 2; v < Math.max(...heights); v += spacing) {
    for (const [start, end] of subtract(spans(points, v), cutouts.flatMap((hole) => spans(hole, v)))) {
      if (end - start > 0.6) strokes.push({ from: toPoint(start, v), to: toPoint(end, v), color });
    }
  }

  return strokes;
}

// Water: broken horizontal dashes that crowd together toward the horizon.
function ripples(polygon: readonly Point[], holes: readonly (readonly Point[])[], color: string, seed: number, glint?: number): Stroke[] {
  const next = random(seed);
  const top = Math.min(...polygon.map(([, y]) => y));
  const strokes: Stroke[] = [];

  for (let v = top + 2, gap = 2.4; v < H; v += gap, gap *= 1.055) {
    for (const [start, end] of subtract(spans(polygon, v), holes.flatMap((hole) => spans(hole, v)))) {
      for (let x = start + next() * 16; x < end;) {
        const shine = glint === undefined ? 0 : Math.exp(-(((x - glint) / (26 + (v - top) * 0.7)) ** 2));
        const length = 4 + next() * (18 + 46 * shine);
        strokes.push({ from: [x, v], to: [Math.min(x + length, end), v], color });
        x += length + (5 + next() * 34) * (1 - 0.8 * shine);
      }
    }
  }

  return strokes;
}

const inside = ([x, y]: Point, ring: readonly Point[]) => spans(ring, y).some(([start, end]) => x > start && x < end);

// An ink line along a ridge, skipping the pieces that something in front covers.
function contour(ridge: Point[], color: string, holes: readonly (readonly Point[])[]): Stroke[] {
  return ridge.slice(1).flatMap((to, index): Stroke[] => {
    const from = ridge[index];
    const middle: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    return middle[1] > H || holes.some((hole) => inside(middle, hole)) ? [] : [{ from, to, color }];
  });
}

function trace(paths: Point[][], color: string): Stroke[] {
  return paths.flatMap((points) => points.slice(1).map((to, index) => ({ from: points[index], to, color })));
}

// Nudge each end a little so the edges read as pen work, not a vector fill.
function wobble(strokes: Stroke[], seed: number): Stroke[] {
  const next = random(seed);
  return strokes.map(({ from, to, color }) => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy) || 1;
    const a = (next() - 0.5) * 2.2 / length;
    const b = (next() - 0.5) * 2.2 / length;
    return { from: [from[0] - dx * a, from[1] - dy * a], to: [to[0] + dx * b, to[1] + dy * b], color };
  });
}

// A ridge line: a base curve plus four octaves of smoothed noise.
function terrain(seed: number, base: (x: number) => number, roughness: number, scale: number, sharp = false): Point[] {
  const next = random(seed);
  const lattice = Array.from({ length: 256 }, next);
  const noise = (x: number) => {
    const i = Math.floor(x);
    const t = x - i;
    const a = lattice[i & 255];
    const b = lattice[(i + 1) & 255];
    return a + (b - a) * t * t * (3 - 2 * t);
  };

  return Array.from({ length: W / 4 + 1 }, (_, index): Point => {
    const x = index * 4;
    let total = 0;
    for (let octave = 0; octave < 4; octave++) {
      const value = noise(x / scale * 2 ** octave + octave * 37);
      total += (sharp ? 1 - Math.abs(2 * value - 1) : value) / 2 ** octave;
    }
    return [x, Math.min(H + 4, base(x) - roughness * total / 1.875)];
  });
}

// A shadow on every slope that faces away from the light: light = 1 when the sun is on the
// left, -1 when it is on the right. Each one hangs below its slope like a sail.
function shadows(ridge: Point[], light: 1 | -1, depth: number): Point[][] {
  const runs: Point[][] = [];
  let run: Point[] = [];
  ridge.forEach((point, index) => {
    const after = ridge[index + 2];
    if (after && (after[1] - point[1]) * light > 0.8) run.push(point);
    else {
      if (run.length > 6) runs.push([...run, point]);
      run = [];
    }
  });

  return runs.map((slope) => {
    const drop = Math.abs(slope[0][1] - slope[slope.length - 1][1]);
    const reach = Math.min(depth, drop * 1.6 + 8);
    const under = slope.map(([x, y], i): Point => {
      const t = i / (slope.length - 1);
      return [x, y + reach * Math.sqrt(t) * (1 - t ** 4)];
    });
    return [...slope, ...under.reverse()];
  });
}

const ground = (ridge: Point[]): Point[] => [...ridge, [W, H + 4], [0, H + 4]];
const box = (x0: number, y0: number, x1: number, y1: number): Point[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const circle = (cx: number, cy: number, r: number): Point[] => Array.from({ length: 64 }, (_, i): Point => [
  cx + r * Math.cos(i * Math.PI / 32), cy + r * Math.sin(i * Math.PI / 32),
]);
// A sand ridge: sharp crests, rounded troughs, leaning a little downwind.
const crest = (x: number, width: number, phase: number, height: number) =>
  height * (1 - Math.abs(Math.sin((x + width * 0.35 * Math.sin(x / width)) / width + phase))) ** 1.5;
const peak = (x: number, cx: number, height: number, width: number) => height * Math.exp(-Math.abs(x - cx) / width);
const cloud = (x0: number, x1: number, y: number, puffs: [cx: number, r: number][]): Point[] => [
  ...Array.from({ length: Math.ceil((x1 - x0) / 3) + 1 }, (_, i): Point => {
    const x = Math.min(x0 + i * 3, x1);
    return [x, y - Math.max(1, ...puffs.map(([cx, r]) => Math.sqrt(Math.max(0, r * r - (x - cx) ** 2))))];
  }),
  [x1, y], [x0, y],
];

const fill = (outline: Point[], ...inks: Ink[]): Shape => ({
  outline,
  draw: (holes) => inks.flatMap(([angle, spacing, color]) => hatch(outline, angle, spacing, color, holes)),
});
const glaze = (outline: Point[], ...inks: Ink[]): Shape => ({ ...fill(outline, ...inks), glaze: true });
const clearing = (outline: Point[]): Shape => ({ outline, draw: () => [] });
// A ground layer: hatched body, plus an inked ridge line on top.
const land = (ridge: Point[], line: string, ...inks: Ink[]): Shape => ({
  outline: ground(ridge),
  draw: (holes) => [...fill(ground(ridge), ...inks).draw(holes), ...contour(ridge, line, holes)],
});

// Paint far to near. Each shape loses whatever the solid shapes in front of it cover.
function compose(shapes: Shape[]): Stroke[] {
  return shapes.flatMap((shape, index) => {
    const holes = shapes.slice(index + 1).filter((front) => !front.glaze).map((front) => front.outline);
    return wobble(shape.draw(holes), index + 1);
  });
}

function lighthouse(x: number, y: number): Shape[] {
  const at = (dy: number) => 11 - 3.5 * Math.min(1, -dy / 60);
  const band = (dy0: number, dy1: number): Point[] => [[x - at(dy0), y + dy0], [x - at(dy1), y + dy1], [x + at(dy1), y + dy1], [x + at(dy0), y + dy0]];
  const outline: Point[] = [
    [x - 11, y + 3], [x - 7.5, y - 60], [x - 11, y - 60], [x - 11, y - 65], [x - 6, y - 65], [x - 6, y - 77],
    [x - 9, y - 77], [x, y - 88], [x + 9, y - 77], [x + 6, y - 77], [x + 6, y - 65], [x + 11, y - 65],
    [x + 11, y - 60], [x + 7.5, y - 60], [x + 11, y + 3],
  ];
  const beam: Point[] = [[x - 7, y - 74], [x - 250, y - 104], [x - 250, y - 52], [x - 7, y - 68]];
  return [
    fill(beam, [-1, 3.4, "#e0ad55"]),
    {
      outline,
      draw: (holes) => [
        ...[[0, -12], [-24, -36], [-48, -60]].flatMap(([a, b]) => hatch(band(a, b), 0, 2.1, "#b9473a", holes)),
        ...hatch(box(x - 6, y - 77, x + 6, y - 65), 90, 2.4, "#e0ad55", holes),
        ...hatch([[x - 9, y - 77], [x, y - 88], [x + 9, y - 77]], 0, 1.8, "#7c3329", holes),
        ...trace([[...outline, outline[0]], [[x - 11, y - 60], [x + 11, y - 60]]], "#7c3329"),
      ],
    },
    {
      outline: [[x + 22, y + 3], [x + 22, y - 16], [x + 33, y - 28], [x + 54, y - 28], [x + 60, y - 16], [x + 60, y + 3]],
      draw: (holes) => [
        ...hatch([[x + 20, y - 15], [x + 33, y - 28], [x + 54, y - 28], [x + 62, y - 15]], 62, 2.2, "#9c4434", holes),
        ...trace([
          [[x + 22, y + 3], [x + 22, y - 15], [x + 60, y - 15], [x + 60, y + 3]],
          [[x + 33, y - 28], [x + 22, y - 15]], [[x + 34, y + 3], [x + 34, y - 8], [x + 40, y - 8], [x + 40, y + 3]],
          [[x + 47, y - 9], [x + 54, y - 9], [x + 54, y - 3], [x + 47, y - 3], [x + 47, y - 9]],
        ], "#7c3329"),
      ],
    },
  ];
}

function pine(x: number, y: number, h: number): Point[] {
  const side: Point[] = [];
  for (let tier = 1; tier <= 4; tier++) {
    const ty = y - h + h * 0.86 * tier / 4;
    const tw = h * 0.3 * tier / 4;
    side.push([x + tw * 0.4, ty - h * 0.13], [x + tw, ty]);
  }
  side.push([x + h * 0.035, y - h * 0.12], [x + h * 0.035, y + 2]);
  return [[x, y - h], ...side, ...side.map(([px, py]): Point => [2 * x - px, py]).reverse()];
}

function coast(): Stroke[] {
  const horizon = 238;
  const sea = box(0, horizon, W, H + 4);
  const island = terrain(9, (x) => horizon + 6 - peak(x, 268, 26, 34), 6, 24)
    .map(([x, y]): Point => [x, Math.min(horizon + 1, y)]);
  // The headland: a grassy top, and a cliff face along its seaward edge that widens toward us.
  const top = terrain(4, (x) => 204 + (W - x) * 0.09, 12, 80).filter(([x]) => x >= 340);
  const [tipX, tipY] = top[0];
  const along = (x: number) => (x - tipX) / (W - tipX);
  const lip = top.map(([x]): Point => [x, tipY + 3 + along(x) * 150 + 5 * Math.sin(x / 19)]);
  const waterline = lip.map(([x, y]): Point => [x, y + 8 + along(x) * 90 + 3 * Math.sin(x / 7)]);
  const groundAt = (x: number) => top.find(([px]) => px >= x)![1];
  const light = lighthouse(400, groundAt(400) + 2);

  return compose([
    fill(box(0, 0, W, horizon + 1), [0, 7, "#c4d1c8"]),
    light[0],
    clearing(circle(150, 222, 50)),
    fill(circle(150, 222, 40), [0, 3, "#d9825a"]),
    fill(cloud(40, 290, 150, [[80, 14], [118, 24], [160, 18], [204, 26], [252, 14]]), [0, 3.4, "#a7bdb3"]),
    fill(cloud(440, 690, 84, [[470, 12], [510, 22], [562, 16], [610, 20], [650, 10]]), [0, 3.4, "#b7c9c0"]),
    fill(ground(island), [-38, 3.6, "#8b9cb4"]),
    { outline: sea, draw: (holes) => ripples(sea, holes, "#5b8ca0", 7, 150) },
    fill([...top, [W, H + 4], ...lip.slice().reverse()], [-3, 4.2, "#6e874a"]),
    fill([...lip, [W, H + 4], ...waterline.slice().reverse()], [78, 2.8, "#9a644c"], [18, 6, "#6f4436"]),
    ...light.slice(1),
  ]);
}

function dunes(): Stroke[] {
  const ridges = [
    terrain(21, (x) => 250 - crest(x, 70, 0.4, 30), 10, 200),
    terrain(22, (x) => 302 - crest(x, 95, 1.9, 44), 12, 220),
    terrain(23, (x) => 360 - crest(x, 120, 3.1, 56), 14, 240),
    terrain(27, (x) => 428 - crest(x, 150, 5.2, 60), 12, 260),
  ];
  const inks: Ink[] = [[-3, 6.2, "#dcae86"], [4, 5.2, "#cd8d57"], [-5, 4.6, "#b36c44"], [3, 4, "#8a4b3a"]];
  const shade = ["#b9825e", "#a3613d", "#87472f", "#62302a"];

  return compose([
    fill(box(0, 0, W, H), [0, 7.5, "#e5c7a6"]),
    clearing(circle(520, 116, 64)),
    fill(circle(520, 116, 52), [0, 3.2, "#d8733d"]),
    ...ridges.flatMap((ridge, index) => [
      land(ridge, shade[index], inks[index]),
      ...shadows(ridge, -1, 70).map((slope) => glaze(slope, [48, inks[index][1] * 0.7, shade[index]])),
    ]),
  ]);
}

function alpine(): Stroke[] {
  const far = terrain(30, (x) => 214 - peak(x, 540, 64, 140) - peak(x, 90, 50, 110), 22, 60, true);
  const range = terrain(31, (x) => 268 - peak(x, 352, 190, 110) - peak(x, 150, 92, 80) - peak(x, 600, 116, 90), 36, 46, true);
  const snow = terrain(35, () => 172, 18, 28);
  const forest = terrain(32, (x) => 316 - 16 * Math.sin(x / 120), 20, 9, true);
  const lake = box(0, 320, W, H + 4);
  const left = terrain(33, (x) => 336 + (x / 230) ** 2 * 90, 16, 60);
  const right = terrain(34, (x) => 352 + ((W - x) / 220) ** 2 * 90, 16, 60);
  const trees = [[46, 344, 56], [78, 352, 74], [112, 368, 50], [140, 384, 34], [610, 366, 48], [640, 356, 70], [676, 350, 58], [700, 356, 40]];

  return compose([
    fill(box(0, 0, W, H), [0, 8, "#d3d3df"]),
    fill(cloud(420, 700, 70, [[450, 10], [496, 20], [552, 14], [610, 22], [664, 12]]), [0, 3.4, "#b4b6ca"]),
    land(far, "#8f93b0", [-35, 5.6, "#a7abc3"]),
    ...shadows(far, 1, 60).map((slope) => glaze(slope, [48, 3.6, "#8f93b0"])),
    {
      outline: ground(range),
      draw: (holes) => [
        ...hatch(ground(range), -32, 4.4, "#8b8fae", [...holes, [[0, -4], [W, -4], ...snow.slice().reverse()]]),
        ...contour(range, "#4e5276", holes),
      ],
    },
    ...shadows(range, 1, 150).map((slope) => glaze(slope, [56, 2.8, "#5d6186"])),
    fill(ground(forest), [-20, 3.6, "#4d6c5d"], [70, 6, "#3e5a4d"]),
    { outline: lake, draw: (holes) => ripples(lake, holes, "#6a95a4", 11, 352) },
    fill(ground(left), [14, 4, "#557558"]),
    fill(ground(right), [-14, 4, "#557558"]),
    ...trees.map(([x, y, h]) => fill(pine(x, y, h), [10, 2.2, "#2c4a3d"])),
  ]);
}

const scenes = [coast, dunes, alpine];
const drawn: Stroke[][] = [];
const strokesOf = (index: number) => (drawn[index] ??= scenes[index]());

// For a card that is not animating, one <path> per ink is far lighter than thousands of <line>s.
const inked: [color: string, d: string][][] = [];
function pathsOf(index: number) {
  if (inked[index]) return inked[index];
  const byColor = new Map<string, string>();
  for (const { from, to, color } of strokesOf(index)) {
    byColor.set(color, `${byColor.get(color) ?? ""}M${from[0].toFixed(1)} ${from[1].toFixed(1)}L${to[0].toFixed(1)} ${to[1].toFixed(1)}`);
  }
  return (inked[index] = [...byColor]);
}

const postcards = [
  {
    place: "the Coast",
    description: "A lighthouse beam sweeps over a green headland as the sun sets into a rippling sea",
    stamp: 410,
    note: "The lighthouse came on just as the sun went down, and for a moment the whole sea was ruled in gold. I thought of you. Keep a light on for me.",
  },
  {
    place: "the Dunes",
    description: "A low sun over layered sand dunes, their shaded slopes cross-hatched",
    stamp: 520,
    note: "The wind redraws these hills every night, and every morning they are beautiful again. So are you, even on the days you have to start over.",
  },
  {
    place: "the Alps",
    description: "Snow-capped peaks above a pine forest and a still lake",
    stamp: 352,
    note: "Climbed until the air ran thin. Everything small stayed down in the valley. Turns out you only need to carry what matters. Bring yourself.",
  },
];
const fan = [{ x: 0, y: 15, r: -8 }, { x: 22, y: 3, r: -1.5 }, { x: 44, y: 17, r: 7 }];
const DRAW_SECONDS = 2.2;

function Ink({ index, draw }: { index: number; draw: boolean }) {
  if (!draw) {
    return (
      <g fill="none" strokeWidth="1.1" strokeLinecap="round">
        {pathsOf(index).map(([color, d]) => <path key={color} d={d} stroke={color} />)}
      </g>
    );
  }
  const strokes = strokesOf(index);
  return (
    <g className="pc-draw" strokeWidth="1.1" strokeLinecap="round">
      {strokes.map(({ from, to, color }, i) => (
        <line
          key={i}
          x1={from[0]}
          y1={from[1]}
          x2={to[0]}
          y2={to[1]}
          stroke={color}
          pathLength={1}
          style={{ animationDelay: `${(i / strokes.length * DRAW_SECONDS).toFixed(3)}s` }}
        />
      ))}
    </g>
  );
}

function Front({ index, draw = false }: { index: number; draw?: boolean }) {
  return (
    <div className="pc-face pc-front">
      <svg className="pc-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={postcards[index].description}>
        <Ink index={index} draw={draw} />
      </svg>
      <div className="pc-caption">
        <span>Greetings from {postcards[index].place}</span>
        <span>No. 0{index + 1}</span>
      </div>
    </div>
  );
}

// A wavy cancellation line, the kind a post office prints across a stamp.
const wave = (y: number) => Array.from({ length: 12 }, (_, i) => `${i ? "" : `M72 ${y}`}q4 ${i % 2 ? 4 : -4} 8 0`).join("");

function Back({ index, ring }: { index: number; ring: string }) {
  const { place, note, stamp } = postcards[index];
  return (
    <div className="pc-face pc-back">
      <span className="pc-heading">Post card</span>
      <div className={`pc-message ${hand.className}`}>
        <p>{note}</p>
        <p className="pc-sign">x</p>
      </div>
      <div className="pc-divider" />
      <div className="pc-address">
        <div className="pc-stamps">
          <svg className="pc-stamp" viewBox="0 0 100 124" aria-hidden>
            <rect width="100" height="124" fill="#fffdf8" />
            <svg x="7" y="7" width="86" height="96" viewBox={`${stamp - 120} 60 240 268`} preserveAspectRatio="xMidYMid slice">
              <g fill="none" strokeWidth="2.2" strokeLinecap="round">
                {pathsOf(index).map(([color, d]) => <path key={color} d={d} stroke={color} />)}
              </g>
            </svg>
            <rect x="7" y="7" width="86" height="96" fill="none" stroke="#6b6253" strokeWidth="0.6" />
            <text x="50" y="116" textAnchor="middle" fontSize="8" letterSpacing="1.5" fill="#6b6253" fontFamily="system-ui, sans-serif">LINE POST · 12</text>
            <rect width="100" height="124" fill="none" stroke="#fbf8f1" strokeWidth="6" strokeDasharray="0 7.6" strokeLinecap="round" />
          </svg>
          <svg className="pc-postmark" viewBox="0 0 160 80" aria-hidden>
            <g fill="none" stroke="currentColor" strokeWidth="1.3">
              <circle cx="40" cy="40" r="31" />
              <circle cx="40" cy="40" r="22" />
              {[24, 33, 42, 51, 60].map((y) => <path key={y} d={wave(y)} />)}
            </g>
            <path id={ring} d="M40 40m-26.5 0a26.5 26.5 0 1 1 53 0a26.5 26.5 0 1 1 -53 0" fill="none" />
            <text fontSize="6.4" letterSpacing="1.4" fill="currentColor" fontFamily="system-ui, sans-serif">
              <textPath href={`#${ring}`}>{`${place.replace("the ", "").toUpperCase()} · LINE POST ·`}</textPath>
            </text>
            <text x="40" y="38" textAnchor="middle" fontSize="8" fill="currentColor" fontFamily="system-ui, sans-serif">20 NOV</text>
            <text x="40" y="48" textAnchor="middle" fontSize="8" fill="currentColor" fontFamily="system-ui, sans-serif">2026</text>
          </svg>
        </div>
        <div className={`pc-lines ${hand.className}`}>
          <span>To you,</span>
          <span>wherever you are</span>
          <span />
        </div>
      </div>
    </div>
  );
}

const css = `
.pc-root { position: relative; display: grid; place-items: center; width: 100%; overflow: hidden; color: var(--foreground); font: 500 13px/1.2 system-ui, sans-serif; }
.pc-fan { position: relative; width: min(92%, 640px); aspect-ratio: 16 / 9; }
.pc-card { container-type: inline-size; }
.pc-fan-card { position: absolute; width: 56%; aspect-ratio: 3 / 2; padding: 0; border: 0; background: none; cursor: pointer; transform: rotate(var(--r)); transition: transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.pc-fan-card:hover, .pc-fan-card:focus-visible { z-index: 3; transform: translateY(-5%) rotate(calc(var(--r) * 0.5)); }
.pc-fan-card:focus-visible { outline: none; }
.pc-fan-card:focus-visible .pc-face { outline: 2px solid #b9473a; outline-offset: 3px; }
.pc-hint { position: absolute; bottom: clamp(16px, 4vh, 32px); left: 0; right: 0; text-align: center; color: var(--muted-foreground); }
.pc-face { position: absolute; inset: 0; overflow: hidden; border-radius: 0.8cqw; background: #fbf8f1; box-shadow: 0 0.25cqw 0 #e6dece, 0 0.5cqw 0 #d6ccb8, 0 0.75cqw 0 #c9bea8, 0 1cqw 0.6cqw rgba(60, 40, 20, 0.18), 0 3.5cqw 6cqw -2cqw rgba(60, 40, 20, 0.3); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.pc-front { display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 2.4cqw; padding: 3.4cqw 3.4cqw 2.8cqw; }
.pc-art { display: block; width: 100%; height: 100%; }
.pc-caption { display: flex; justify-content: space-between; color: #6b6253; font: 600 1.9cqw/1 system-ui, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; }
.pc-back { display: grid; grid-template-columns: 1.15fr auto 1fr; gap: 4cqw; padding: 8cqw 5cqw 5cqw; color: #2f3a6b; transform: rotateY(180deg); }
.pc-heading { position: absolute; top: 3cqw; left: 0; right: 0; color: #8a8070; font: 600 1.7cqw/1 system-ui, sans-serif; letter-spacing: 0.5em; text-align: center; text-transform: uppercase; }
.pc-message { font-size: 4.3cqw; line-height: 1.22; }
.pc-message p { margin: 0; }
.pc-sign { margin-top: 0.6em !important; text-align: right; font-size: 1.3em; }
.pc-divider { width: 1px; margin: 1cqw 0; background: #c6bca9; }
.pc-address { display: grid; grid-template-rows: auto 1fr; }
.pc-stamps { position: relative; height: 22cqw; }
.pc-stamp { position: absolute; top: 0; right: 0; width: 15cqw; filter: drop-shadow(0 0.2cqw 0.3cqw rgba(60, 40, 20, 0.15)); }
.pc-postmark { position: absolute; top: 5cqw; right: 7cqw; width: 26cqw; color: rgba(47, 58, 107, 0.62); transform: rotate(-9deg); }
.pc-lines { display: grid; align-self: end; }
.pc-lines span { display: flex; align-items: flex-end; height: 6.6cqw; padding: 0 0 0.5cqw 1cqw; border-bottom: 1px solid #c6bca9; font-size: 4.2cqw; line-height: 1; }
.pc-overlay { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; container-type: size; }
.pc-backdrop { position: absolute; inset: 0; background: color-mix(in oklab, var(--background) 78%, transparent); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
.pc-mover { position: relative; width: min(88cqw, 720px, calc((100cqh - 110px) * 1.5)); perspective: 2000px; }
.pc-flip { position: relative; width: 100%; aspect-ratio: 3 / 2; cursor: pointer; transform-style: preserve-3d; transition: transform 900ms cubic-bezier(0.3, 0.7, 0.2, 1); }
.pc-flip[data-flipped="true"] { transform: rotateY(180deg); }
.pc-flip > div { position: absolute; inset: 0; transform-style: preserve-3d; }
/* Real thickness for the flip: the faces sit apart, and a slab fills the edge between them. */
.pc-flip > div:nth-child(1) { transform: translateZ(0.4cqw); }
.pc-flip > div:nth-child(2) { transform: translateZ(-0.4cqw); }
.pc-flip > .pc-edge { inset: 0 auto 0 calc(50% - 0.4cqw); width: 0.8cqw; background: linear-gradient(#efe8da, #d3c9b5); transform: rotateY(90deg); }
.pc-controls { position: relative; display: flex; gap: 4px; padding: 4px; border: 1px solid var(--border); border-radius: 999px; background: color-mix(in oklab, var(--background) 85%, transparent); animation: pc-fade 400ms 300ms both; }
.pc-controls button { padding: 8px 14px; border: 0; border-radius: 999px; color: inherit; font: inherit; background: transparent; cursor: pointer; transition: background-color 160ms ease, transform 120ms ease; }
.pc-controls button:hover { background: color-mix(in oklab, var(--foreground) 8%, transparent); }
.pc-controls button:active { transform: scale(0.96); }
.pc-controls button:focus-visible { outline: 2px solid #b9473a; outline-offset: 2px; }
@keyframes pc-fade { from { opacity: 0; transform: translateY(6px); } }
@keyframes pc-draw { from { stroke-dashoffset: 1.05; } to { stroke-dashoffset: 0; } }
.pc-draw line { stroke-dasharray: 1 2; animation: pc-draw 0.5s cubic-bezier(0.3, 0.7, 0.4, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .pc-draw line { animation: none; stroke-dasharray: none; }
  .pc-flip, .pc-fan-card { transition: none; }
  .pc-controls { animation: none; }
}
`;

const ease = "cubic-bezier(0.2, 0.9, 0.25, 1)";
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The transform that puts the big card exactly over a small one in the fan.
function overFan(card: HTMLElement, mover: HTMLElement, rotate: number) {
  const from = card.getBoundingClientRect();
  const to = mover.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) rotate(${rotate}deg) scale(${card.offsetWidth / mover.offsetWidth})`;
}

export function LineLandscapes({ thumbnail = false }: { thumbnail?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const mover = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const turn = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const timer = useRef(0);
  const ring = `${useId().replace(/:/g, "")}-ring`;

  useLayoutEffect(() => {
    if (open === null || !mover.current) return;
    const duration = reducedMotion() ? 0 : 650;
    mover.current.animate([{ transform: overFan(cards.current[open]!, mover.current, fan[open].r) }, { transform: "none" }], { duration, easing: ease });
    backdrop.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration * 0.6 });
    turn.current?.focus({ preventScroll: true });
    // Let the pen finish the picture, then turn the card over to the message.
    timer.current = window.setTimeout(() => setFlipped(true), reducedMotion() ? 600 : (DRAW_SECONDS + 0.7) * 1000);
    return () => clearTimeout(timer.current);
  }, [open]);

  function close() {
    if (open === null || closing.current || !mover.current) return;
    closing.current = true;
    clearTimeout(timer.current);
    setFlipped(false);
    const card = cards.current[open]!;
    const duration = reducedMotion() ? 0 : 600;
    backdrop.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration, fill: "forwards" });
    mover.current.animate([{ transform: "none" }, { transform: overFan(card, mover.current, fan[open].r) }], { duration, easing: ease, fill: "forwards" })
      .finished.then(() => {
        closing.current = false;
        setOpen(null);
        card.focus({ preventScroll: true });
      });
  }

  function flip() {
    clearTimeout(timer.current);
    setFlipped((side) => !side);
  }

  return (
    <div
      className={`pc-root ${thumbnail ? "" : "craft-fill"}`}
      style={{ minHeight: thumbnail ? undefined : "clamp(420px, 72svh, 640px)", padding: thumbnail ? "6% 0" : undefined }}
    >
      <style>{css}</style>
      <div className="pc-fan">
        {postcards.map(({ place }, index) => (
          <button
            key={place}
            ref={(node) => { cards.current[index] = node; }}
            type="button"
            className="pc-card pc-fan-card"
            disabled={thumbnail}
            aria-label={`Open the postcard from ${place}`}
            onClick={() => { setFlipped(false); setOpen(index); }}
            style={{
              left: `${fan[index].x}%`,
              top: `${fan[index].y}%`,
              "--r": `${fan[index].r}deg`,
              visibility: open === index ? "hidden" : undefined,
            } as React.CSSProperties}
          >
            <Front index={index} />
          </button>
        ))}
      </div>
      {!thumbnail && open === null && <p className="pc-hint">Pick a postcard</p>}
      {open !== null && (
        <div
          className="pc-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Postcard from ${postcards[open].place}`}
          onKeyDown={(event) => { if (event.key === "Escape") close(); }}
        >
          <div ref={backdrop} className="pc-backdrop" onClick={close} />
          <div ref={mover} className="pc-card pc-mover">
            <div className="pc-flip" data-flipped={flipped} onClick={flip}>
              <div aria-hidden={flipped}><Front index={open} draw /></div>
              <div aria-hidden={!flipped}><Back index={open} ring={ring} /></div>
              <div className="pc-edge" aria-hidden />
            </div>
          </div>
          <div className="pc-controls">
            <button ref={turn} type="button" onClick={flip}>{flipped ? "See the picture" : "Turn over"}</button>
            <button type="button" onClick={close}>Put it back</button>
          </div>
        </div>
      )}
    </div>
  );
}
