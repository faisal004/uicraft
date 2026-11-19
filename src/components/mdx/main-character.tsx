"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Main character on an endless footpath through a park, drawn as an
// isometric pixel-art diorama. The ground is a fixed patch with ragged grassy
// edges; its texture scrolls underneath so the hero seems to walk forever.
// People and props fade out with a pixel dither as they reach the edges.

const PATCH_W = 46; // ground patch size (x), big enough to fill the screen
const PATCH_D = 36; // ground patch size (z)
const TEX_PX = 16; // texture pixels per world unit
const TEX_TILE = 4; // ground texture repeats every 4 units along x
const L = 40; // world wrap length for people and props
const FADE_IN = 15; // things start fading out beyond this |x| (off screen at default zoom)
const FADE_OUT = 19;
const PATH_HALF = 2; // path spans z ∈ [-2, 2]
const HERO_Z = 1.3; // hero walks along the near edge: nobody passes in front
const GHOSTS = 3;

const rand = mulberry32(11);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const wrap = (x: number) => ((((x + L / 2) % L) + L) % L) - L / 2;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const edgeFade = (x: number) => 1 - smooth(FADE_IN, FADE_OUT, Math.abs(x));

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value noise on a grid that wraps every `periodX` cells, so textures tile.
function makeNoise(cellsX: number, cellsY: number) {
  const g = Array.from({ length: (cellsX + 1) * (cellsY + 1) }, () => rand());
  const at = (i: number, j: number) => g[(((i % cellsX) + cellsX) % cellsX) + j * (cellsX + 1)];
  return (u: number, v: number) => {
    const i = Math.floor(u);
    const j = Math.floor(v);
    const fu = u - i;
    const fv = v - j;
    const su = fu * fu * (3 - 2 * fu);
    const sv = fv * fv * (3 - 2 * fv);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * su;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * su;
    return a + (b - a) * sv;
  };
}

// ---------- textures ----------

const GRASS = ["#3d6a26", "#4a7a2c", "#578b33", "#66993a", "#74a742"];
const STONE = ["#b8ad98", "#c3b9a4", "#ada28d", "#cbc2ae", "#b2a690"];

function groundTexture() {
  const w = TEX_TILE * TEX_PX;
  const h = PATCH_D * TEX_PX;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const big = makeNoise(4, Math.ceil(h / 16) + 1);
  const small = makeNoise(16, Math.ceil(h / 4) + 1);
  const edge = makeNoise(16, 2);

  // Each paving stone gets one colour.
  const stoneColor = new Map<string, string>();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const z = -PATCH_D / 2 + (y + 0.5) / TEX_PX;
      const ragged = (edge(x / 4, 0) - 0.5) * 0.35 + (edge(x / 4, 1) - 0.5) * 0.2;
      let hex: string;
      if (Math.abs(z) < PATH_HALF + ragged) {
        // Running-bond paving: 8×8 px stones, alternate rows shifted by 4 px.
        const row = Math.floor(y / 8);
        const sx = x + (row % 2) * 4;
        const joint = y % 8 === 0 || sx % 8 === 0;
        const key = `${Math.floor(sx / 8) % (w / 8)},${row}`;
        if (!stoneColor.has(key)) stoneColor.set(key, pick(STONE));
        hex = joint ? "#857b6b" : stoneColor.get(key)!;
        if (!joint && rand() < 0.12) hex = shadeHex(hex, rand() < 0.5 ? -10 : 8);
      } else {
        const n = big(x / 16, y / 16) * 0.6 + small(x / 4, y / 4) * 0.4 + (rand() - 0.5) * 0.25;
        hex = GRASS[Math.max(0, Math.min(GRASS.length - 1, Math.floor(n * GRASS.length)))];
        const r = rand();
        if (r < 0.006) hex = pick(["#f2d16b", "#f5f1e6", "#e59bb6"]);
        else if (r < 0.05) hex = "#33591f";
      }
      const i = (y * w + x) * 4;
      img.data[i] = parseInt(hex.slice(1, 3), 16);
      img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(PATCH_W / TEX_TILE, 1);
  return tex;
}

function shadeHex(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

// A fixed rounded-rectangle mask with a noisy, grassy edge.
function edgeMask() {
  const w = PATCH_W * TEX_PX;
  const h = PATCH_D * TEX_PX;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const n1 = makeNoise(Math.ceil(w / 9) + 1, Math.ceil(h / 9) + 1);
  const n2 = makeNoise(Math.ceil(w / 3) + 1, Math.ceil(h / 3) + 1);
  const hx = PATCH_W / 2 - 0.6;
  const hz = PATCH_D / 2 - 0.5;
  const r = 2.4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = (x + 0.5) / TEX_PX - PATCH_W / 2;
      const pz = (y + 0.5) / TEX_PX - PATCH_D / 2;
      const qx = Math.abs(px) - (hx - r);
      const qz = Math.abs(pz) - (hz - r);
      const d = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
      const noise = (n1(x / 9, y / 9) - 0.5) * 0.9 + (n2(x / 3, y / 3) - 0.5) * 0.35 + (rand() - 0.5) * 0.12;
      const v = d + noise < 0 ? 255 : 0;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

// ---------- dithered fade ----------

// Lambert material that can fade out with an ordered (Bayer) dither, which
// reads as pixel art and avoids transparency sorting problems.
type Fade = { value: number };
const DITHER = /* glsl */ `
  {
    int bx = int(mod(gl_FragCoord.x, 4.0));
    int by = int(mod(gl_FragCoord.y, 4.0));
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    if (uFade < (m[bx + by * 4] + 0.5) / 16.0) discard;
  }
`;

function ditherMat(color: number, fade: Fade, flat = false) {
  const m = new THREE.MeshLambertMaterial({ color, flatShading: flat });
  m.onBeforeCompile = (s) => {
    s.uniforms.uFade = fade;
    s.fragmentShader =
      "uniform float uFade;\n" +
      s.fragmentShader.replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\n" + DITHER);
  };
  m.customProgramCacheKey = () => "dither";
  return m;
}

// ---------- people ----------

function contour(points: [number, number][], depth = 1, start = 0, length = Math.PI * 2) {
  return new THREE.LatheGeometry(points.map(([radius, y]) => new THREE.Vector2(radius, y)), 24, start, length).scale(depth, 1, 1);
}

function sneaker(points: [number, number][], bevel: number) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.065, steps: 1, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3,
  }).translate(0, 0, -0.0325);
}

const TORSO: [number, number][] = [[0, -0.17], [0.115, -0.17], [0.12, -0.145], [0.108, -0.07], [0.123, 0.025], [0.151, 0.09], [0.14, 0.125], [0.09, 0.16], [0.045, 0.18], [0, 0.18]];

const pg = {
  thigh: contour([[0, -0.28], [0.041, -0.26], [0.048, -0.18], [0.062, -0.055], [0.056, 0.015], [0, 0.035]]),
  shin: contour([[0, -0.27], [0.032, -0.25], [0.036, -0.17], [0.048, -0.065], [0.042, 0.015], [0, 0.035]]),
  shoe: sneaker([[-0.06, -0.03], [0.095, -0.03], [0.105, -0.02], [0.099, -0.006], [0.07, 0.004], [0.02, 0.018], [0, 0.036], [-0.043, 0.036], [-0.063, 0.012]], 0.006),
  sole: sneaker([[-0.064, -0.005], [0.099, -0.005], [0.11, 0], [0.102, 0.005], [-0.064, 0.005]], 0.002),
  hips: new THREE.SphereGeometry(1, 16, 10).scale(0.08, 0.075, 0.125),
  torso: contour(TORSO, 0.7),
  jacket: contour(TORSO, 0.7, Math.PI / 2 + 0.45, Math.PI * 2 - 0.9),
  jacketEdge: contour(TORSO, 0.705, Math.PI / 2 + 0.45, 0.065),
  sleeve: contour([[0, -0.145], [0.044, -0.145], [0.048, -0.1], [0.054, -0.015], [0.04, 0.025], [0, 0.035]]),
  forearm: contour([[0, -0.165], [0.025, -0.15], [0.032, -0.09], [0.035, -0.02], [0.029, 0.035], [0, 0.045]]),
  hand: new THREE.CapsuleGeometry(0.022, 0.018, 6, 12).scale(1, 1, 0.65),
  neck: new THREE.CylinderGeometry(0.038, 0.043, 0.09, 10),
  head: contour([[0, -0.115], [0.035, -0.105], [0.061, -0.08], [0.08, -0.035], [0.086, 0.025], [0.081, 0.065], [0.06, 0.095], [0, 0.115]], 1.05),
  detail: new THREE.SphereGeometry(1, 8, 6),
  hair: new THREE.SphereGeometry(0.103, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(0.92, 1.2, 0.87),
  capTop: new THREE.SphereGeometry(0.105, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, 0.8, 0.95),
  capBrim: new THREE.SphereGeometry(1, 16, 8).scale(0.085, 0.009, 0.092),
  band: new THREE.TorusGeometry(0.125, 0.012, 8, 24, Math.PI).rotateY(Math.PI / 2).scale(1, 1.4, 1),
  cup: new THREE.CylinderGeometry(0.037, 0.037, 0.028, 12).rotateX(Math.PI / 2),
  pack: new THREE.CapsuleGeometry(0.105, 0.12, 4, 8).scale(0.65, 1, 1),
  strap: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.13, 0.81, 0.09),
    new THREE.Vector3(-0.04, 0.91, 0.11),
    new THREE.Vector3(0.055, 0.86, 0.125),
    new THREE.Vector3(0.088, 0.76, 0.11),
    new THREE.Vector3(0.06, 0.65, 0.09),
  ]), 16, 0.01, 6, false),
  bag: new THREE.BoxGeometry(0.07, 0.18, 0.2),
};

type Look = {
  skin: number;
  hair: number;
  top: number;
  pants: number;
  shoes: number;
  extra?: "pack" | "bag";
  cap?: number;
  headphones?: number;
};

type Person = {
  root: THREE.Group;
  body: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  knees: THREE.Object3D[];
  elbows: THREE.Object3D[];
  feet: THREE.Object3D[];
  mats: THREE.Material[];
};

function makePerson(look: Look, material: (c: number) => THREE.Material, shadow: boolean, detailed = false): Person {
  const mats = new Map<number, THREE.Material>();
  const mat = (c: number) => {
    if (!mats.has(c)) mats.set(c, material(c));
    return mats.get(c)!;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const chest = new THREE.Group();
  body.add(chest);
  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, c: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(g, mat(c));
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    parent.add(m);
    return m;
  };
  const pivot = (x: number, y: number, z: number, parent: THREE.Group = body) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    parent.add(p);
    return p;
  };

  const legL = pivot(0, 0.55, 0.075);
  const legR = pivot(0, 0.55, -0.075);
  const knees: THREE.Object3D[] = [];
  const feet: THREE.Object3D[] = [];
  for (const leg of [legL, legR]) {
    mesh(leg, pg.thigh, look.pants, 0, 0, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.25;
    leg.add(knee);
    knees.push(knee);
    mesh(knee, pg.shin, look.pants, 0, 0, 0);
    const foot = new THREE.Group();
    foot.position.y = -0.25;
    knee.add(foot);
    feet.push(foot);
    mesh(foot, pg.shoe, look.shoes, 0.02, -0.008, 0);
    if (detailed) mesh(foot, pg.sole, 0xc9c7c1, 0.02, -0.043, 0);
  }
  mesh(body, pg.hips, look.pants, 0, 0.57, 0);
  const shirt = mesh(chest, pg.torso, detailed ? 0xe9e1cf : look.top, 0, 0.75, 0);
  if (detailed) {
    shirt.scale.set(0.95, 0.98, 0.95);
    mesh(chest, pg.jacket, look.top, 0, 0.75, 0);
    mesh(chest, pg.jacketEdge, 0xb9642b, 0, 0.75, 0);
    mesh(chest, pg.jacketEdge, 0xb9642b, 0, 0.75, 0).scale.z = -1;
  }
  const armL = pivot(-0.008, 0.865, 0.14, chest);
  const armR = pivot(-0.008, 0.865, -0.14, chest);
  armL.rotation.x = -0.09;
  armR.rotation.x = 0.09;
  const elbows: THREE.Object3D[] = [];
  for (const arm of [armL, armR]) {
    mesh(arm, pg.sleeve, look.top, 0, 0, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.17;
    arm.add(elbow);
    elbows.push(elbow);
    mesh(elbow, pg.forearm, detailed ? look.top : look.skin, 0, 0, 0);
    mesh(elbow, pg.hand, look.skin, 0, -0.17, 0);
  }
  mesh(chest, pg.neck, look.skin, 0, 0.945, 0);
  const head = new THREE.Group();
  chest.add(head);
  mesh(head, pg.head, look.skin, 0, 1.065, 0);
  mesh(head, pg.hair, look.hair, -0.015, 1.08, 0);
  if (detailed) {
    mesh(head, pg.detail, look.skin, 0.09, 1.055, 0).scale.set(0.025, 0.025, 0.019);
    for (const side of [-1, 1]) {
      mesh(head, pg.detail, look.skin, -0.005, 1.055, side * 0.084).scale.set(0.018, 0.029, 0.014);
      mesh(head, pg.detail, 0x30251f, 0.079, 1.085, side * 0.043).scale.set(0.006, 0.008, 0.007);
      mesh(head, pg.detail, look.hair, 0.077, 1.101, side * 0.044).scale.set(0.01, 0.004, 0.016);
    }
    mesh(head, pg.detail, 0x925d45, 0.076, 1.02, 0).scale.set(0.005, 0.004, 0.02);
    mesh(chest, pg.neck, 0xe9e1cf, 0, 0.923, 0).scale.set(1.35, 0.16, 1.35);
  }
  if (look.cap !== undefined) {
    mesh(head, pg.capTop, look.cap, -0.012, 1.14, 0);
    mesh(head, pg.capBrim, look.cap, 0.075, 1.14, 0).rotation.z = -0.08;
  }
  if (look.headphones !== undefined) {
    mesh(head, pg.band, look.headphones, -0.012, 1.075, 0);
    for (const side of [-1, 1]) {
      mesh(head, pg.cup, look.headphones, -0.012, 1.055, side * 0.12);
      mesh(head, pg.cup, 0x36383c, -0.012, 1.055, side * 0.103).scale.set(0.9, 0.9, 0.45);
    }
  }
  if (look.extra === "pack") {
    const color = look.cap !== undefined ? 0x2f3b4c : 0x4a4038;
    mesh(chest, pg.pack, color, -0.13, 0.75, 0);
    if (detailed) {
      for (const side of [-1, 1]) mesh(chest, pg.strap, color, 0, 0, 0).scale.z = side;
      mesh(chest, pg.pack, 0x26313f, -0.195, 0.69, 0).scale.set(0.45, 0.45, 0.8);
    }
  }
  if (look.extra === "bag") mesh(body, pg.bag, 0x5b4636, 0, 0.6, 0.2);

  for (const child of head.children) child.position.y -= 1.055;
  head.position.y = 1.055;
  for (const child of chest.children) child.position.y -= 0.62;
  chest.position.y = 0.62;

  return { root, body, chest, head, legL, legR, armL, armR, knees, elbows, feet, mats: [...mats.values()] };
}

function pose(p: Person, phase: number, stride: number) {
  const s = Math.sin(phase) * stride;
  p.legL.rotation.z = s;
  p.legR.rotation.z = -s;
  p.armL.rotation.z = -s * 0.8;
  p.armR.rotation.z = s * 0.8;
  p.knees[0].rotation.z = -Math.max(0, Math.cos(phase)) * stride * 1.5;
  p.knees[1].rotation.z = -Math.max(0, -Math.cos(phase)) * stride * 1.5;
  p.elbows[0].rotation.z = 0.18 + s * 0.15;
  p.elbows[1].rotation.z = 0.18 - s * 0.15;
  // Keep the lower sole on the path as weight passes between the legs.
  const left = s + p.knees[0].rotation.z;
  const right = -s + p.knees[1].rotation.z;
  p.feet[0].rotation.z = -left;
  p.feet[1].rotation.z = -right;
  p.body.position.y = 0.25 * (Math.cos(s) + Math.max(Math.cos(left), Math.cos(right))) - 0.5;
  p.body.rotation.y = Math.sin(phase) * stride * 0.12;
  p.body.position.z = Math.sin(phase) * stride * 0.025;
  p.chest.rotation.set(Math.sin(phase) * stride * 0.045, -Math.sin(phase) * stride * 0.2, -0.045);
  p.head.rotation.y = 0.12 + Math.sin(phase * 0.5) * stride * 0.04;
  p.head.rotation.z = 0.045;
}

// ---------- props ----------

type Prop = { group: THREE.Group; x: number; fade: Fade; foliage?: THREE.Group };

function buildProps(scene: THREE.Scene) {
  const props: Prop[] = [];
  const place = (x: number, z: number, make: (g: THREE.Group, m: (c: number, flat?: boolean) => THREE.Material) => THREE.Group | void) => {
    const fade = { value: 1 };
    const g = new THREE.Group();
    g.position.z = z;
    const foliage = make(g, (c, flat = true) => ditherMat(c, fade, flat));
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(g);
    props.push({ group: g, x, fade, foliage: foliage || undefined });
  };
  const add = (g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  const leafColors = [0x3e6b2f, 0x4d7f37, 0x5d9140, 0x35602a];
  const blossomGeometry = new THREE.IcosahedronGeometry(0.065, 1);
  const tree = (x: number, z: number, s: number) =>
    place(x, z, (g, m) => {
      add(g, new THREE.CylinderGeometry(0.09 * s, 0.13 * s, 1.4 * s, 7), m(0x5a4030), 0, 0.7 * s, 0);
      const crown = new THREE.Group();
      crown.position.y = 1.3 * s;
      g.add(crown);
      const blossom = rand() < 0.4 ? m(pick([0xf1becb, 0xf6dedb, 0xf9eddf])) : undefined;
      for (let i = 0; i < 7; i++) {
        const r = (0.45 + rand() * 0.35) * s;
        const leaves = add(
          crown,
          new THREE.IcosahedronGeometry(r, 1),
          m(pick(leafColors)),
          (rand() - 0.5) * 0.9 * s,
          (0.3 + rand() * 0.9) * s,
          (rand() - 0.5) * 0.9 * s,
        );
        if (blossom) {
          for (let j = 0; j < 4; j++) {
            const angle = rand() * Math.PI * 2;
            const height = rand() * 0.8;
            const radius = Math.sqrt(1 - height * height) * r;
            add(crown, blossomGeometry, blossom,
              leaves.position.x + Math.cos(angle) * radius,
              leaves.position.y + height * r,
              leaves.position.z + Math.sin(angle) * radius).scale.setScalar(s);
          }
        }
      }
      return crown;
    });
  const bush = (x: number, z: number, s: number) =>
    place(x, z, (g, m) => {
      for (let i = 0; i < 4; i++) {
        const r = (0.22 + rand() * 0.16) * s;
        add(g, new THREE.IcosahedronGeometry(r, 1), m(pick(leafColors)), (rand() - 0.5) * 0.6 * s, r * 0.8, (rand() - 0.5) * 0.5 * s);
      }
    });
  const lamp = (x: number, z: number) =>
    place(x, z, (g, m) => {
      add(g, new THREE.CylinderGeometry(0.035, 0.05, 2.1, 6), m(0x2c2f36, false), 0, 1.05, 0);
      add(g, new THREE.BoxGeometry(0.2, 0.22, 0.2), m(0x2c2f36), 0, 2.15, 0);
      add(g, new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0xffe7b0 }), 0, 2.12, 0);
    });
  const bench = (x: number, z: number) =>
    place(x, z, (g, m) => {
      const wood = m(0x8a5a36);
      const iron = m(0x2c2f36);
      add(g, new THREE.BoxGeometry(1.2, 0.06, 0.38), wood, 0, 0.36, 0);
      add(g, new THREE.BoxGeometry(1.2, 0.26, 0.05), wood, 0, 0.56, -0.2);
      for (const sx of [-0.5, 0.5]) add(g, new THREE.BoxGeometry(0.05, 0.36, 0.34), iron, sx, 0.18, 0);
    });
  const petalShape = new THREE.Shape();
  for (let i = 0; i <= 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const radius = 0.034 + 0.014 * Math.cos(angle * 5);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) petalShape.moveTo(x, y);
    else petalShape.lineTo(x, y);
  }
  const petals = new THREE.ShapeGeometry(petalShape).rotateX(-Math.PI / 2);
  const flowerStem = new THREE.CylinderGeometry(0.005, 0.007, 1, 5);
  const flowerCenter = new THREE.SphereGeometry(0.012, 8, 6).scale(1, 0.5, 1);
  const flowerLeaf = new THREE.SphereGeometry(1, 8, 4).scale(0.032, 0.008, 0.012);
  const flowers = (x: number, z: number) =>
    place(x, z, (g, m) => {
      const c = pick([0xf2d16b, 0xe59bb6, 0xf5f1e6, 0xd96a5a]);
      const stemMat = m(0x426b2a, false);
      const petalMat = m(c, false);
      petalMat.side = THREE.DoubleSide;
      const centerMat = m(0xd7a342, false);
      for (let i = 0; i < 6; i++) {
        const px = (rand() - 0.5) * 0.5;
        const pz = (rand() - 0.5) * 0.4;
        const height = 0.14 + rand() * 0.14;
        add(g, flowerStem, stemMat, px, height / 2, pz).scale.y = height;
        add(g, petals, petalMat, px, height, pz);
        add(g, flowerCenter, centerMat, px, height + 0.003, pz);
        add(g, flowerLeaf, stemMat, px + 0.022, height * 0.45, pz).rotation.z = 0.5;
      }
    });

  // Far side: lamps and benches by the path, then rows of trees back into the
  // park. Near side stays low close to the path so the hero is never covered;
  // trees only appear further out, where they project well below him.
  for (let x = -L / 2; x < L / 2; x += 6.5) {
    lamp(x + 3.3, -2.35);
    bench(x + 1.7, -2.6);
    tree(x + rand() * 1.2, -3.8 - rand() * 0.6, 0.95 + rand() * 0.3);
    tree(x + 3 + rand() * 1.5, -7 - rand() * 2, 1 + rand() * 0.35);
    tree(x + 1 + rand() * 2, -11 - rand() * 2.5, 1.05 + rand() * 0.35);
    bush(x + 4.6, -3.4 - rand() * 0.8, 1 + rand() * 0.3);
    bush(x + rand() * 6, -5.5 - rand() * 5, 1 + rand() * 0.4);
    flowers(x + rand() * 6, -2.6 - rand() * 1.5);
    flowers(x + rand() * 6, -5 - rand() * 6);

    bush(x + 2.4 + rand() * 2, 3.0 + rand() * 0.9, 0.8 + rand() * 0.3);
    bush(x + rand() * 6, 4.5 + rand() * 3, 0.9 + rand() * 0.4);
    flowers(x + rand() * 6, 2.7 + rand() * 1.5);
    flowers(x + rand() * 6, 4.5 + rand() * 4);
    tree(x + rand() * 6, 8.5 + rand() * 4, 1 + rand() * 0.3);
  }
  return props;
}

// ---------- birds ----------

function buildAtmosphere(scene: THREE.Scene) {
  // White gull-like birds. The body is a streamlined ellipsoid with a head,
  // beak and fanned tail. Each wing has two jointed parts (inner arm and outer
  // hand with dark tips), and the outer part lags behind the inner one, so the
  // wingbeat bends like a real stroke instead of flapping as a flat card.
  const white = new THREE.MeshLambertMaterial({ color: 0xf8f8f4, side: THREE.DoubleSide });
  const wingGrey = new THREE.MeshLambertMaterial({ color: 0xe2e6ea, side: THREE.DoubleSide });
  const tipDark = new THREE.MeshLambertMaterial({ color: 0x3a3f46, side: THREE.DoubleSide });
  const beakMat = new THREE.MeshLambertMaterial({ color: 0xf2b134 });
  const flat = (pts: [number, number][]) =>
    new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))).rotateX(Math.PI / 2);
  // Wing shapes lie in the x/z plane and reach out along +z (x is forward).
  const innerWing = flat([[0.06, 0], [0.05, 0.17], [-0.03, 0.18], [-0.09, 0.05], [-0.08, 0]]);
  const outerWing = flat([[0.05, 0], [0.0, 0.14], [-0.07, 0.2], [-0.06, 0.09], [-0.03, 0]]);
  const wingTip = flat([[0.0, 0.14], [-0.07, 0.2], [-0.065, 0.13]]);
  const tail = flat([[0, 0.035], [-0.11, 0.06], [-0.12, 0], [-0.11, -0.06], [0, -0.035]]);
  const bodyGeometry = new THREE.SphereGeometry(1, 12, 8).scale(0.16, 0.05, 0.055);
  const headGeometry = new THREE.SphereGeometry(0.045, 10, 8);
  const beakGeometry = new THREE.ConeGeometry(0.013, 0.055, 6).rotateZ(-Math.PI / 2);

  const birds = Array.from({ length: 7 }, (_, i) => {
    const root = new THREE.Group();
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };
    add(root, bodyGeometry, white, 0, 0, 0);
    add(root, headGeometry, white, 0.14, 0.025, 0);
    add(root, beakGeometry, beakMat, 0.195, 0.02, 0);
    add(root, tail, white, -0.13, 0.005, 0);

    // side 1 reaches +z, side -1 is mirrored to reach -z.
    const wings = [1, -1].map((side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.02, 0.02, side * 0.04);
      shoulder.scale.z = side;
      root.add(shoulder);
      add(shoulder, innerWing, white, 0, 0, 0);
      const wrist = new THREE.Group();
      wrist.position.set(0, 0, 0.17);
      shoulder.add(wrist);
      add(wrist, outerWing, wingGrey, 0, 0, 0);
      add(wrist, wingTip, tipDark, 0, 0.001, 0);
      return { shoulder, wrist, side };
    });
    root.scale.setScalar(1.15);
    const dir = i < 4 ? 1 : -1;
    root.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(root);
    return { root, wings, dir, phase: i * 1.7 };
  });

  return (time: number, offset: number, reducedMotion: boolean) => {
    const t = reducedMotion ? 0 : time;
    for (let i = 0; i < birds.length; i++) {
      const { root, wings, dir, phase } = birds[i];
      const x = wrap(-8 + i * 2.3 + dir * t * 1.9 - offset);
      // Flap-and-glide: a burst of wingbeats, then a glide with wings held
      // in a shallow V, like gulls cruising over a park.
      const flapping = smooth(-0.2, 0.2, Math.sin(t * 0.8 + phase * 1.3));
      const beat = t * 9 + phase;
      const stroke = Math.sin(beat) * 0.75 * flapping;
      const lagged = Math.sin(beat - 0.7) * 0.55 * flapping;
      const glide = (1 - flapping) * -0.15; // slight upward V while gliding
      for (const w of wings) {
        // The shoulder rotates after its mirror scale, so it needs the side
        // sign; the wrist rotates inside the mirrored space, so it doesn't.
        w.shoulder.rotation.x = -w.side * (stroke + glide);
        w.wrist.rotation.x = -(lagged + glide * 0.5);
      }
      // The body lifts a touch on each downstroke and banks gently.
      const lift = Math.sin(beat + Math.PI / 2) * 0.03 * flapping;
      root.position.set(x, 3.4 + (i % 4) * 0.22 + Math.sin(t * 0.9 + phase) * 0.12 + lift, -3 + (i % 3) * 1.3);
      root.visible = Math.abs(x) < FADE_OUT;
      root.scale.setScalar(1.15 * edgeFade(x));
      root.rotation.x = Math.sin(t * 0.6 + phase) * 0.12;
      root.rotation.z = Math.sin(t * 0.9 + phase) * 0.05;
    }
  };
}

// ---------- palettes ----------

const SKIN = [0xf1c8a5, 0xd9a47c, 0xb57b55, 0x8a5a3c, 0x6b4430];
const HAIR = [0x1e1a17, 0x3b2a20, 0x5a3e2b, 0x8c6a46, 0x2a2a2e, 0x9a9590];
const TOPS = [0x56657a, 0x6f7d8c, 0x8a8f99, 0x47505e, 0x7b6f63, 0x5f6b5c, 0xa8a49a, 0x3f4655];
const PANTS = [0x2e3440, 0x3b4252, 0x4c4f56, 0x5a5048, 0x262a33];
const SHOES = [0x1d1d1f, 0xe6e2da, 0x5a4636, 0x2f3540];

const HERO: Look = {
  skin: 0xd9a47c,
  hair: 0x1e1a17,
  top: 0xf08a3c,
  pants: 0x2b3a55,
  shoes: 0xf2efe8,
  cap: 0xf2c94c,
  headphones: 0x1d1f24,
  extra: "pack",
};

// ---------- component ----------

type Walker = {
  copies: Person[];
  fade: Fade;
  x: number;
  z: number;
  dir: 1 | -1;
  speed: number;
  phase: number;
};

type MainCharacterProps = {
  /** Show the Tweakpane panel. */
  controls?: boolean;
  /** Starting zoom; small frames (like a landing tile) zoom in on the hero. */
  zoom?: number;
};

export function MainCharacter({ controls = true, zoom = 1 }: MainCharacterProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  // One mutable settings object: Tweakpane edits it in place, the loop reads it every frame.
  const settings = useRef({ crowdSpeed: 1, heroSpeed: 0.55, trails: true, pixel: 2, zoom });

  // Tweakpane builds DOM as soon as it loads, so import it on the client only.
  useEffect(() => {
    if (!controls) return;
    let dispose = () => {};
    let cancelled = false;
    import("tweakpane").then(({ Pane }) => {
      if (cancelled) return;
      const s = settings.current;
      const pane = new Pane({ container: paneRef.current!, title: "Main character", expanded: window.innerWidth >= 640 });
      const motion = pane.addFolder({ title: "Motion" });
      motion.addBinding(s, "crowdSpeed", { label: "Crowd speed", min: 0, max: 3, step: 0.05 });
      motion.addBinding(s, "heroSpeed", { label: "Hero speed", min: 0, max: 2, step: 0.05 });
      motion.addBinding(s, "trails", { label: "Ghost trails" });
      const view = pane.addFolder({ title: "View" });
      view.addBinding(s, "zoom", { label: "Zoom", min: 0.6, max: 2, step: 0.05 });
      view.addBinding(s, "pixel", { label: "Pixel size", min: 1, max: 6, step: 1 });
      dispose = () => pane.dispose();
    });
    return () => {
      cancelled = true;
      dispose();
    };
  }, [controls]);

  useEffect(() => {
    const host = hostRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.imageRendering = "pixelated";
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    // Late-afternoon sun from behind-left, so shadows fall toward the viewer.
    scene.add(new THREE.HemisphereLight(0xdbe7ff, 0x4a3b2a, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
    sun.position.set(-7, 12, -5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
    scene.add(sun);

    const camera = new THREE.OrthographicCamera();
    camera.position.set(20, 17, 20);
    camera.position.z += HERO_Z;
    camera.lookAt(0, 0.6, HERO_Z);

    // Ground: fixed ragged patch, scrolling texture.
    const groundTex = groundTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(PATCH_W, PATCH_D).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ map: groundTex, alphaMap: edgeMask(), alphaTest: 0.5 }),
    );
    ground.receiveShadow = true;
    scene.add(ground);

    const props = buildProps(scene);
    const animateAtmosphere = buildAtmosphere(scene);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Crowd: lanes behind the hero only, so he is never covered.
    const walkers: Walker[] = [];
    for (let i = 0; i < 44; i++) {
      const look: Look = {
        skin: pick(SKIN),
        hair: pick(HAIR),
        top: pick(TOPS),
        pants: pick(PANTS),
        shoes: pick(SHOES),
        extra: rand() < 0.2 ? "pack" : rand() < 0.2 ? "bag" : undefined,
      };
      const fade = { value: 1 };
      const dir = rand() < 0.5 ? 1 : -1;
      const scale = 0.94 + rand() * 0.12;
      const copies: Person[] = [];
      for (let g = 0; g <= GHOSTS; g++) {
        const ghost = g > 0;
        const p = makePerson(
          look,
          (c) =>
            ghost
              ? new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false })
              : ditherMat(c, fade),
          !ghost,
        );
        p.root.rotation.y = dir > 0 ? 0 : Math.PI;
        p.root.scale.setScalar(scale);
        scene.add(p.root);
        copies.push(p);
      }
      walkers.push({
        copies,
        fade,
        x: rand() * L - L / 2,
        z: -PATH_HALF + 0.25 + rand() * (HERO_Z - 0.7 + PATH_HALF - 0.25),
        dir,
        speed: 2.8 + rand() * 1.6,
        phase: rand() * 6.28,
      });
    }

    const hero = makePerson(HERO, (c) => new THREE.MeshLambertMaterial({ color: c }), true, true);
    hero.root.position.z = HERO_Z;
    scene.add(hero.root);

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(Math.ceil(w / settings.current.pixel), Math.ceil(h / settings.current.pixel), false);
      // World units visible vertically; on narrow screens keep ~14 units across.
      const aspect = w / h;
      const view = Math.max(11, 14 / aspect) / settings.current.zoom;
      Object.assign(camera, { left: (-view * aspect) / 2, right: (view * aspect) / 2, top: view / 2, bottom: -view / 2 });
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let offset = 0;
    let elapsed = 0;
    let heroPhase = 0;
    let lastPixel = settings.current.pixel;
    let lastZoom = settings.current.zoom;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { crowdSpeed, heroSpeed, trails, pixel, zoom } = settings.current;
      if (pixel !== lastPixel || zoom !== lastZoom) {
        lastPixel = pixel;
        lastZoom = zoom;
        resize();
      }

      offset += heroSpeed * dt;
      elapsed += dt;
      groundTex.offset.x = (offset / TEX_TILE) % 1;

      for (const p of props) {
        const x = wrap(p.x - offset);
        p.fade.value = edgeFade(x);
        p.group.visible = p.fade.value > 0;
        p.group.position.x = x;
        if (p.foliage) {
          const breeze = reducedMotion.matches ? 0 : Math.sin(elapsed * 1.4 + p.x * 0.7 + p.group.position.z);
          p.foliage.rotation.z = breeze * 0.025;
          p.foliage.rotation.x = breeze * 0.015;
        }
      }
      animateAtmosphere(elapsed, offset, reducedMotion.matches);

      heroPhase += heroSpeed * dt * 5.5;
      pose(hero, heroPhase, 0.42);

      for (const w of walkers) {
        const v = w.speed * crowdSpeed;
        const rel = w.dir * v - heroSpeed;
        w.x = wrap(w.x + rel * dt);
        w.phase += v * dt * 5;
        w.fade.value = edgeFade(w.x);
        for (let g = 0; g <= GHOSTS; g++) {
          const p = w.copies[g];
          const lag = g * 0.035;
          const x = wrap(w.x - rel * lag);
          const f = edgeFade(x);
          p.root.visible = f > 0 && (g === 0 || (trails && v > 0.5));
          if (!p.root.visible) continue;
          if (g > 0) for (const m of p.mats) (m as THREE.MeshLambertMaterial).opacity = 0.32 * (1 - g / (GHOSTS + 1)) * f;
          p.root.position.set(x, 0, w.z);
          pose(p, w.phase - v * lag * 5, 0.7);
        }
      }

      renderer.render(scene, camera);
      if (onScreen) raf = requestAnimationFrame(tick);
    };

    // Only render while the scene is on screen (it can sit below the fold on
    // the landing page), and pick up smoothly when it scrolls back into view.
    let onScreen = false;
    const io = new IntersectionObserver(([entry]) => {
      const was = onScreen;
      onScreen = entry.isIntersecting;
      if (onScreen && !was) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      const shared = new Set<THREE.BufferGeometry>(Object.values(pg));
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          if (!shared.has(o.geometry)) o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      groundTex.dispose();
      renderer.dispose();
      host.removeChild(canvas);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div
        ref={hostRef}
        role="img"
        aria-label="An isometric pixel-art park. A person in a yellow cap and orange hoodie walks slowly along a path while a crowd rushes past them in both directions."
        className="absolute inset-0"
      />
      {controls && <div ref={paneRef} data-og-hide className="absolute top-3 right-3 z-10 w-64" />}
    </div>
  );
}

/** The craft page demo: the scene filling the stage, with the Tweakpane panel. */
export function MainCharacterDemo() {
  return (
    <div className="craft-fill relative min-h-[30rem] w-full overflow-hidden bg-[#050505] sm:min-h-[36rem]">
      <MainCharacter />
    </div>
  );
}
