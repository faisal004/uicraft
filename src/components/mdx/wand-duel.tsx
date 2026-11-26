"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

type Phase = "idle" | "duel" | "won" | "lost";
type Palette = { core: THREE.Color; mid: THREE.Color; glow: THREE.Color; ramp: THREE.Color[] };

const palette = (core: string, mid: string, glow: string, ramp: string[]): Palette => ({
  core: new THREE.Color(core),
  mid: new THREE.Color(mid),
  glow: new THREE.Color(glow),
  ramp: ramp.map((c) => new THREE.Color(c)),
});

const PLAYER = palette("#fff1d6", "#ff6a1f", "#d81e0c", ["#fffbe8", "#ffd36a", "#ff8a24", "#d23a10", "#5a1406", "#000000"]);
const RIVAL = palette("#eaffe0", "#5dff5a", "#16c43a", ["#f2ffe8", "#b4ff8a", "#52f04a", "#1c9a2c", "#06380e", "#000000"]);

const FOG = "#8aa392";
const MAX_SPARKS = 4200;
const ASH = 700;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const wave = (x: number, seed: number) =>
  Math.sin(x * 1.7 + seed) * 0.5 + Math.sin(x * 3.1 - seed * 1.3) * 0.3 + Math.sin(x * 5.3 + seed * 0.7) * 0.2;

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(size: number, paint: (g: CanvasRenderingContext2D, size: number) => void, color = true) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (g) paint(g, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function speckle(g: CanvasRenderingContext2D, size: number, amount: number, random: () => number) {
  const image = g.getImageData(0, 0, size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (random() - 0.5) * amount;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  g.putImageData(image, 0, 0);
}

function paintCobbles(g: CanvasRenderingContext2D, size: number) {
  const random = seeded(3);
  g.fillStyle = "#24261f";
  g.fillRect(0, 0, size, size);
  const cell = size / 16;
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 17; col++) {
      const x = (col + (row % 2) * 0.5) * cell + (random() - 0.5) * cell * 0.15;
      const y = (row + 0.5) * cell + (random() - 0.5) * cell * 0.15;
      const w = cell * (0.36 + random() * 0.14);
      const h = cell * (0.3 + random() * 0.14);
      const shade = 62 + random() * 40;
      for (const ox of [-size, 0, size]) {
        const grad = g.createRadialGradient(x + ox - w * 0.3, y - h * 0.35, 1, x + ox, y, w * 1.1);
        grad.addColorStop(0, `rgb(${shade + 28}, ${shade + 32}, ${shade + 24})`);
        grad.addColorStop(0.7, `rgb(${shade}, ${shade + 4}, ${shade - 4})`);
        grad.addColorStop(1, `rgb(${shade - 30}, ${shade - 27}, ${shade - 32})`);
        g.fillStyle = grad;
        g.beginPath();
        g.ellipse(x + ox, y, w, h, (random() - 0.5) * 0.3, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${30 + random() * 20}, ${40 + random() * 25}, ${22 + random() * 10}, ${0.12 + random() * 0.2})`;
    g.beginPath();
    g.ellipse(random() * size, random() * size, 10 + random() * 60, 6 + random() * 40, random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  speckle(g, size, 26, random);
}

function paintStone(g: CanvasRenderingContext2D, size: number) {
  const random = seeded(9);
  g.fillStyle = "#3e443f";
  g.fillRect(0, 0, size, size);
  const rowH = size / 10;
  for (let row = 0; row < 10; row++) {
    let x = -random() * 60;
    while (x < size) {
      const w = rowH * (1.4 + random() * 1.6);
      const shade = 92 + random() * 34;
      g.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade})`;
      g.fillRect(x + 2, row * rowH + 2, w - 4, rowH - 4);
      g.fillStyle = `rgba(255,255,255,${random() * 0.06})`;
      g.fillRect(x + 2, row * rowH + 2, w - 4, 3);
      x += w;
    }
  }
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(${20 + random() * 30}, ${30 + random() * 30}, ${20 + random() * 20}, ${0.08 + random() * 0.18})`;
    g.beginPath();
    g.ellipse(random() * size, random() * size, 6 + random() * 50, 4 + random() * 70, 0, 0, Math.PI * 2);
    g.fill();
  }
  speckle(g, size, 30, random);
}

function paintBlotch(g: CanvasRenderingContext2D, size: number) {
  const random = seeded(21);
  for (let i = 0; i < 26; i++) {
    const x = size / 2 + (random() - 0.5) * size * 0.55;
    const y = size / 2 + (random() - 0.5) * size * 0.55;
    const r = size * (0.08 + random() * 0.18);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
}

function paintDot(g: CanvasRenderingContext2D, size: number) {
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.8)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
}

function pointedArch(w: number, spring: number, apex: number, base = 0) {
  const path = new THREE.Path();
  path.moveTo(-w / 2, base);
  path.lineTo(w / 2, base);
  path.lineTo(w / 2, spring);
  path.quadraticCurveTo(w / 2, lerp(spring, apex, 0.75), 0, apex);
  path.quadraticCurveTo(-w / 2, lerp(spring, apex, 0.75), -w / 2, spring);
  path.closePath();
  return path;
}

function bayGeometry(w: number, h: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h);
  shape.lineTo(-w / 2, h);
  shape.closePath();
  shape.holes.push(pointedArch(w * 0.62, h * 0.52, h * 0.82, 0.02));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

function beamMaterial(radius: number, sharp: number, seed: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uLength: { value: 1 },
      uRadius: { value: radius },
      uAmp: { value: 0.05 },
      uSeed: { value: seed },
      uSharp: { value: sharp },
      uOpacity: { value: 1 },
      uCore: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uLength;
      uniform float uRadius;
      uniform float uAmp;
      uniform float uSeed;
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      float w(float x, float s) { return sin(x * 1.7 + s) * 0.5 + sin(x * 3.1 - s * 1.3) * 0.3 + sin(x * 5.3 + s * 0.7) * 0.2; }
      void main() {
        vUv = uv;
        float t = position.y + 0.5;
        float along = t * uLength;
        float envelope = sin(t * 3.14159) * (0.45 + 0.55 * t);
        vec2 wiggle = vec2(w(along * 2.2 - uTime * 9.0, uSeed), w(along * 1.9 + uTime * 7.5, uSeed * 1.7)) * uAmp * envelope;
        float swell = 1.0 + 0.25 * sin(along * 6.0 - uTime * 24.0 + uSeed) + 0.6 * smoothstep(0.85, 1.0, t);
        vec3 p = vec3(position.x * uRadius * swell + wiggle.x, along, position.z * uRadius * swell + wiggle.y);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNormalV = normalize(normalMatrix * vec3(position.x, 0.0, position.z));
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uLength;
      uniform float uSharp;
      uniform float uOpacity;
      uniform vec3 uCore;
      uniform vec3 uMid;
      uniform vec3 uGlow;
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      ${NOISE}
      void main() {
        float facing = abs(dot(normalize(vNormalV), normalize(vViewDir)));
        float core = pow(facing, uSharp);
        float flow = fbm(vec2(vUv.y * uLength * 3.0 - uTime * 14.0, vUv.x * 4.0 + uTime * 2.0));
        float pulse = 0.55 + 0.6 * flow;
        float ends = smoothstep(0.0, 0.04, vUv.y);
        vec3 color = mix(uGlow, uMid, core) * 0.9 + uCore * pow(core, 6.0) * 0.8;
        gl_FragColor = vec4(color * pulse, core * uOpacity * ends);
      }
    `,
  });
}

function fireMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uLead: { value: 0.5 },
      uPower: { value: 0.5 },
      uOpacity: { value: 1 },
      uA: { value: PLAYER.mid.clone() },
      uB: { value: RIVAL.mid.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uLead;
      uniform float uPower;
      uniform float uOpacity;
      uniform vec3 uA;
      uniform vec3 uB;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        float angle = atan(p.y, p.x);
        float turbulence = fbm(p * 5.0 + vec2(uTime * 1.3, -uTime * 2.1)) - 0.5;
        float body = smoothstep(0.32, 0.0, r + turbulence * 0.22);
        float rays = pow(noise(vec2(angle * 7.0, uTime * 6.0)), 6.0) * smoothstep(0.5, 0.05, r) * 1.4;
        float hot = smoothstep(0.12, 0.0, r + turbulence * 0.05);
        float side = smoothstep(-0.25, 0.25, p.x + turbulence * 0.3);
        vec3 tint = mix(uA, uB, mix(side, 1.0 - uLead, 0.55));
        vec3 color = tint * (body * 1.3 + rays) + vec3(1.0, 0.95, 0.82) * (hot * 1.6 + body * body * 0.35);
        float alpha = clamp(body + rays + hot, 0.0, 1.0);
        gl_FragColor = vec4(color * (0.6 + uPower * 0.45), alpha * uOpacity);
      }
    `,
  });
}

function pointsMaterial(texture: THREE.Texture, additive: boolean) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexColors: true,
    uniforms: { uMap: { value: texture }, uScale: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float alpha;
      uniform float uScale;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });
}

const GRADE = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float vignette = smoothstep(0.95, 0.25, length((vUv - 0.5) * vec2(1.15, 1.0)));
      color.rgb *= mix(0.55, 1.0, vignette);
      color.rgb *= vec3(0.96, 1.02, 0.97);
      color.rgb += (hash(vUv * 1000.0 + uTime) - 0.5) * 0.035;
      gl_FragColor = color;
    }
  `,
};

function makeFigure(cloth: string, skin: string, hair: string | null, materials: THREE.Material[], geometries: THREE.BufferGeometry[]) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const clothMat = new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.95, metalness: 0 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: "#4a2f1a", roughness: 0.6 });
  materials.push(clothMat, skinMat, woodMat);

  const profile = [
    [0, 0],
    [0.4, 0],
    [0.37, 0.12],
    [0.31, 0.55],
    [0.25, 1.0],
    [0.24, 1.25],
    [0.22, 1.38],
    [0.14, 1.47],
    [0.07, 1.5],
    [0, 1.5],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const robeGeo = new THREE.LatheGeometry(profile, 20);
  const robe = new THREE.Mesh(robeGeo, clothMat);
  robe.scale.set(1, 1, 0.78);
  robe.castShadow = true;
  body.add(robe);

  const headGeo = new THREE.SphereGeometry(0.115, 20, 16);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0.02, 1.62, 0);
  head.scale.set(0.95, 1.08, 0.92);
  head.castShadow = true;
  body.add(head);
  geometries.push(robeGeo, headGeo);

  if (hair) {
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9 });
    materials.push(hairMat);
    const hairGeo = new THREE.SphereGeometry(0.125, 20, 16, Math.PI * 0.55, Math.PI * 1.9, 0, Math.PI * 0.62);
    geometries.push(hairGeo);
    const mop = new THREE.Mesh(hairGeo, hairMat);
    mop.position.copy(head.position).add(new THREE.Vector3(-0.012, 0.012, 0));
    mop.castShadow = true;
    body.add(mop);
  }

  const collarGeo = new THREE.TorusGeometry(0.15, 0.045, 8, 20);
  geometries.push(collarGeo);
  const collar = new THREE.Mesh(collarGeo, clothMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.47;
  body.add(collar);

  const armGeo = new THREE.CapsuleGeometry(0.052, 0.5, 6, 10);
  armGeo.rotateZ(-Math.PI / 2);
  armGeo.translate(0.3, 0, 0);
  const handGeo = new THREE.SphereGeometry(0.045, 12, 10);
  const wandGeo = new THREE.CylinderGeometry(0.004, 0.009, 0.36, 8);
  wandGeo.rotateZ(-Math.PI / 2);
  wandGeo.translate(0.18, 0, 0);
  geometries.push(armGeo, handGeo, wandGeo);

  const shoulder = new THREE.Group();
  shoulder.position.set(0.04, 1.4, 0.12);
  body.add(shoulder);
  const arm = new THREE.Mesh(armGeo, clothMat);
  arm.castShadow = true;
  shoulder.add(arm);
  const hand = new THREE.Mesh(handGeo, skinMat);
  hand.position.set(0.6, 0, 0);
  shoulder.add(hand);
  const wand = new THREE.Mesh(wandGeo, woodMat);
  wand.position.set(0.62, 0, 0);
  wand.castShadow = true;
  shoulder.add(wand);
  const tip = new THREE.Object3D();
  tip.position.set(0.98, 0, 0);
  shoulder.add(tip);

  const otherShoulder = new THREE.Group();
  otherShoulder.position.set(-0.02, 1.38, -0.14);
  otherShoulder.rotation.set(0.2, 0, -1.25);
  body.add(otherShoulder);
  const otherArm = new THREE.Mesh(armGeo, clothMat);
  otherArm.castShadow = true;
  otherShoulder.add(otherArm);

  return { root, body, robe, shoulder, tip };
}

export function WandDuel({ thumbnail = false }: { thumbnail?: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<{ phase: Phase; wins: number }>({ phase: "idle", wins: 0 });

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const button = buttonRef.current;
    if (!stage || !canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, thumbnail ? 1 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const track = <T extends THREE.BufferGeometry>(geometry: T) => {
      geometries.push(geometry);
      return geometry;
    };
    const trackMat = <T extends THREE.Material>(material: T) => {
      materials.push(material);
      return material;
    };

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(FOG, 0.021);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    const target = new THREE.Vector3(0.4, 2.1, -3);

    const sky = new THREE.Mesh(
      track(new THREE.SphereGeometry(300, 32, 16)),
      trackMat(
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          fog: false,
          depthWrite: false,
          uniforms: {
            uTop: { value: new THREE.Color("#22302a") },
            uHorizon: { value: new THREE.Color("#a3baa7") },
            uSun: { value: new THREE.Color("#e6f0e2") },
          },
          vertexShader: /* glsl */ `
            varying vec3 vDir;
            void main() {
              vDir = normalize(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: /* glsl */ `
            uniform vec3 uTop;
            uniform vec3 uHorizon;
            uniform vec3 uSun;
            varying vec3 vDir;
            ${NOISE}
            void main() {
              float h = clamp(vDir.y, 0.0, 1.0);
              vec3 color = mix(uHorizon, uTop, pow(h, 0.55));
              float sun = pow(max(dot(vDir, normalize(vec3(0.35, 0.45, -1.0))), 0.0), 6.0);
              float cloud = fbm(vDir.xz / max(vDir.y + 0.15, 0.05) * 1.6);
              color = mix(color, uHorizon * 1.05, smoothstep(0.45, 0.8, cloud) * 0.35 * smoothstep(0.0, 0.3, h));
              color += uSun * sun * 0.45;
              gl_FragColor = vec4(color, 1.0);
            }
          `,
        }),
      ),
    );
    scene.add(sky);

    const ridge = (z: number, height: number, color: string, seed: number, lean: number) => {
      const geometry = track(new THREE.PlaneGeometry(420, height, 260, 1));
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        if (position.getY(i) > 0) {
          const x = position.getX(i);
          const r =
            Math.abs(Math.sin(x * 0.018 + seed)) * 0.55 +
            Math.abs(Math.sin(x * 0.047 + seed * 2.3)) * 0.3 +
            Math.abs(Math.sin(x * 0.13 + seed * 0.7)) * 0.15;
          position.setY(i, -height / 2 + height * (0.25 + 0.75 * r) * (1 - clamp((x + 40) / 200, 0, 1) * lean));
        }
      }
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, trackMat(new THREE.MeshBasicMaterial({ color, fog: false })));
      mesh.position.set(0, height / 2 - 2, z);
      scene.add(mesh);
    };
    ridge(-170, 95, "#7f9886", 1.3, 0.55);
    ridge(-120, 55, "#667f6d", 4.2, 0.6);

    const cobbleMap = canvasTexture(1024, paintCobbles);
    const cobbleBump = canvasTexture(1024, paintCobbles, false);
    cobbleMap.repeat.set(30, 30);
    cobbleBump.repeat.set(30, 30);
    const stoneMap = canvasTexture(512, paintStone);
    const stoneBump = canvasTexture(512, paintStone, false);
    stoneMap.repeat.set(0.32, 0.32);
    stoneBump.repeat.set(0.32, 0.32);
    const blotch = canvasTexture(256, paintBlotch, false);
    const dot = canvasTexture(64, paintDot, false);
    textures.push(cobbleMap, cobbleBump, stoneMap, stoneBump, blotch, dot);

    const ground = new THREE.Mesh(
      track(new THREE.PlaneGeometry(140, 140)),
      trackMat(new THREE.MeshStandardMaterial({ map: cobbleMap, bumpMap: cobbleBump, bumpScale: 1.4, roughness: 0.94, color: "#8a9086" })),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const patchMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#26301f", roughness: 1, transparent: true, alphaMap: blotch, depthWrite: false }),
    );
    const patchGeo = track(new THREE.PlaneGeometry(1, 1));
    for (const [x, z, sx, sz] of [
      [-9, 4, 14, 7],
      [3, 6, 16, 6],
      [-2, -5, 9, 4],
      [12, 3, 10, 6],
      [-14, -6, 10, 5],
    ]) {
      const patch = new THREE.Mesh(patchGeo, patchMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.012, z);
      patch.scale.set(sx, sz, 1);
      patch.receiveShadow = true;
      scene.add(patch);
    }

    const stoneMat = trackMat(new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBump, bumpScale: 3, roughness: 0.96, color: "#b8c0b6" }));
    const darkMat = trackMat(new THREE.MeshStandardMaterial({ color: "#101411", roughness: 1 }));
    const random = seeded(17);

    const arcade = (x0: number, x1: number, z: number, height: number, bay: number, depth: number) => {
      const geometry = track(bayGeometry(bay, height, depth));
      const count = Math.floor((x1 - x0) / bay);
      const mesh = new THREE.InstancedMesh(geometry, stoneMat, count);
      const m = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        const broken = random() < 0.2 ? rand(0.55, 0.8) : rand(0.92, 1.05);
        m.compose(new THREE.Vector3(x0 + bay * (i + 0.5), 0, z), new THREE.Quaternion(), new THREE.Vector3(1, broken, 1));
        mesh.setMatrixAt(i, m);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      const pierGeo = track(new THREE.BoxGeometry(0.5, 1, depth + 0.5));
      const spireGeo = track(new THREE.ConeGeometry(0.22, 1.8, 4));
      for (let i = 0; i <= count; i++) {
        const h = height * rand(0.75, 1.12);
        const pier = new THREE.Mesh(pierGeo, stoneMat);
        pier.scale.y = h;
        pier.position.set(x0 + bay * i, h / 2, z + 0.1);
        pier.castShadow = true;
        pier.receiveShadow = true;
        scene.add(pier);
        if (random() < 0.45) {
          const spire = new THREE.Mesh(spireGeo, stoneMat);
          spire.position.set(x0 + bay * i, h + 0.9, z + 0.1);
          spire.rotation.y = Math.PI / 4;
          scene.add(spire);
        }
      }
    };
    arcade(-26, -5.5, -15, 6.2, 2.6, 0.8);
    arcade(-2, 9, -19, 4.2, 2.2, 0.7);

    const hallX = 19;
    const hallZ = -22;
    const hall = new THREE.Mesh(track(new THREE.BoxGeometry(18, 17, 9)), stoneMat);
    hall.position.set(hallX, 8.5, hallZ);
    hall.castShadow = true;
    hall.receiveShadow = true;
    scene.add(hall);
    const facadeShape = new THREE.Shape();
    facadeShape.moveTo(-4.5, 0);
    facadeShape.lineTo(4.5, 0);
    facadeShape.lineTo(4.5, 15);
    facadeShape.lineTo(0, 18.5);
    facadeShape.lineTo(-4.5, 15);
    facadeShape.closePath();
    facadeShape.holes.push(pointedArch(3.4, 6.5, 10.5, 0.02));
    const facade = new THREE.Mesh(track(new THREE.ExtrudeGeometry(facadeShape, { depth: 1.6, bevelEnabled: false })), stoneMat);
    facade.position.set(hallX - 3, 0, hallZ + 4.5);
    facade.castShadow = true;
    scene.add(facade);
    const doorway = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 10.5, 0.3)), darkMat);
    doorway.position.set(hallX - 3, 5.2, hallZ + 4.6);
    scene.add(doorway);
    const lancetGeo = track(new THREE.BoxGeometry(0.7, 3.6, 0.2));
    for (let i = 0; i < 5; i++) {
      const lancet = new THREE.Mesh(lancetGeo, darkMat);
      lancet.position.set(hallX + 2.2 + i * 1.5, 7.5, hallZ + 4.56);
      scene.add(lancet);
    }
    const buttressGeo = track(new THREE.BoxGeometry(0.9, 1, 2.2));
    for (let i = 0; i < 6; i++) {
      const buttress = new THREE.Mesh(buttressGeo, stoneMat);
      const h = rand(9, 15);
      buttress.scale.y = h;
      buttress.position.set(hallX - 8.5 + i * 3.4, h / 2, hallZ + 5.2);
      buttress.castShadow = true;
      scene.add(buttress);
    }
    const tower = new THREE.Mesh(track(new THREE.BoxGeometry(4, 27, 4)), stoneMat);
    tower.position.set(hallX - 9.5, 13.5, hallZ + 2);
    tower.castShadow = true;
    scene.add(tower);
    const crenelGeo = track(new THREE.BoxGeometry(0.7, 1, 0.7));
    for (let i = 0; i < 4; i++) {
      for (const [dx, dz] of [
        [-1.6 + i * 1.07, -1.65],
        [-1.6 + i * 1.07, 1.65],
      ]) {
        if (random() < 0.25) continue;
        const crenel = new THREE.Mesh(crenelGeo, stoneMat);
        crenel.position.set(hallX - 9.5 + dx, 27.5, hallZ + 2 + dz);
        scene.add(crenel);
      }
    }

    const rubbleGeo = track(new THREE.DodecahedronGeometry(1, 0));
    const rubbleMat = trackMat(new THREE.MeshStandardMaterial({ map: stoneMap, roughness: 1, color: "#9aa199" }));
    const piles: [number, number, number, number, number][] = [
      [3.5, -13.5, 6, 2.4, 260],
      [-9, -12, 4, 1.4, 120],
      [12, -13, 4.5, 2, 160],
      [-18, -11, 3, 1.2, 70],
    ];
    const scatter = 260;
    const rubbleCount = piles.reduce((sum, pile) => sum + pile[4], 0) + scatter;
    const rubble = new THREE.InstancedMesh(rubbleGeo, rubbleMat, rubbleCount);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const tint = new THREE.Color();
    let index = 0;
    for (const [cx, cz, radius, height, count] of piles) {
      for (let i = 0; i < count; i++) {
        const a = random() * Math.PI * 2;
        const d = Math.sqrt(random()) * radius;
        const y = Math.max(0, (1 - d / radius) * height * random());
        const s = rand(0.15, 0.6) * (1 - d / radius * 0.5);
        q.setFromEuler(e.set(random() * 3, random() * 3, random() * 3));
        m.compose(new THREE.Vector3(cx + Math.cos(a) * d, y, cz + Math.sin(a) * d * 0.6), q, new THREE.Vector3(s, s * rand(0.5, 1), s));
        rubble.setMatrixAt(index, m);
        rubble.setColorAt(index, tint.setHSL(0.3, 0.05, rand(0.35, 0.6)));
        index++;
      }
    }
    for (let i = 0; i < scatter; i++) {
      let x = 0;
      let z = 0;
      do {
        x = rand(-18, 18);
        z = rand(-11, 7);
      } while (Math.abs(z) < 1.4 && Math.abs(x) < 6);
      const s = rand(0.04, 0.22);
      q.setFromEuler(e.set(random() * 3, random() * 3, random() * 3));
      m.compose(new THREE.Vector3(x, s * 0.3, z), q, new THREE.Vector3(s * rand(1, 2), s * 0.5, s));
      rubble.setMatrixAt(index, m);
      rubble.setColorAt(index, tint.setHSL(0.28, 0.06, rand(0.3, 0.55)));
      index++;
    }
    rubble.castShadow = true;
    rubble.receiveShadow = true;
    scene.add(rubble);

    const hemi = new THREE.HemisphereLight("#b9cdbc", "#23271f", 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight("#e4eee2", 1.5);
    sun.position.set(7, 14, -16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(thumbnail ? 512 : 2048, thumbnail ? 512 : 2048);
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    const player = makeFigure("#1c1d1a", "#c9a98c", "#14110e", materials, geometries);
    player.root.position.set(-3.9, 0, 0.4);
    scene.add(player.root);
    const rival = makeFigure("#17201b", "#d9ddd0", null, materials, geometries);
    rival.root.position.set(4.1, 0, -0.4);
    rival.root.rotation.y = Math.PI;
    scene.add(rival.root);

    const clashLight = new THREE.PointLight("#ffffff", 30, 0, 2);
    scene.add(clashLight);
    const playerLight = new THREE.PointLight(PLAYER.mid, 4, 0, 2);
    const rivalLight = new THREE.PointLight(RIVAL.mid, 4, 0, 2);
    scene.add(playerLight, rivalLight);

    const beamGeo = track(new THREE.CylinderGeometry(1, 1, 1, 12, 96, true));
    const makeBeam = (pal: Palette, seed: number) => {
      const layers = [beamMaterial(0.2, 1.2, seed), beamMaterial(0.075, 2.2, seed), beamMaterial(0.028, 3.5, seed)].map((mat, i) => {
        materials.push(mat);
        mat.uniforms.uCore.value.copy(pal.core);
        mat.uniforms.uMid.value.copy(i === 0 ? pal.glow : pal.mid);
        mat.uniforms.uGlow.value.copy(i === 0 ? pal.glow : pal.glow);
        const mesh = new THREE.Mesh(beamGeo, mat);
        mesh.frustumCulled = false;
        scene.add(mesh);
        return mesh;
      });
      return layers;
    };
    const playerBeam = makeBeam(PLAYER, 1.3);
    const rivalBeam = makeBeam(RIVAL, 7.9);

    const fire = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), trackMat(fireMaterial()));
    fire.frustumCulled = false;
    scene.add(fire);
    const fireUniforms = (fire.material as THREE.ShaderMaterial).uniforms;

    const sparkPos = new Float32Array(MAX_SPARKS * 3);
    const sparkVel = new Float32Array(MAX_SPARKS * 3);
    const sparkColor = new Float32Array(MAX_SPARKS * 3);
    const sparkSize = new Float32Array(MAX_SPARKS);
    const sparkAlpha = new Float32Array(MAX_SPARKS);
    const sparkHeat = new Float32Array(MAX_SPARKS);
    const sparkCool = new Float32Array(MAX_SPARKS);
    const sparkKind = new Uint8Array(MAX_SPARKS);
    const sparkPal = new Uint8Array(MAX_SPARKS);
    const sparkGround = new Uint8Array(MAX_SPARKS);
    let sparkCursor = 0;
    const sparkGeo = track(new THREE.BufferGeometry());
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkColor, 3));
    sparkGeo.setAttribute("size", new THREE.BufferAttribute(sparkSize, 1));
    sparkGeo.setAttribute("alpha", new THREE.BufferAttribute(sparkAlpha, 1));
    const sparkMat = trackMat(pointsMaterial(dot, true));
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    sparks.frustumCulled = false;
    scene.add(sparks);

    const ashPos = new Float32Array(ASH * 3);
    const ashColor = new Float32Array(ASH * 3);
    const ashSize = new Float32Array(ASH);
    const ashAlpha = new Float32Array(ASH);
    const ashSeed = new Float32Array(ASH);
    for (let i = 0; i < ASH; i++) {
      ashPos[i * 3] = rand(-18, 18);
      ashPos[i * 3 + 1] = rand(0, 11);
      ashPos[i * 3 + 2] = rand(-14, 8);
      const shade = rand(0.45, 0.8);
      ashColor[i * 3] = shade * 0.92;
      ashColor[i * 3 + 1] = shade;
      ashColor[i * 3 + 2] = shade * 0.94;
      ashSize[i] = rand(0.025, 0.06);
      ashAlpha[i] = rand(0.35, 0.8);
      ashSeed[i] = rand(0, 100);
    }
    const ashGeo = track(new THREE.BufferGeometry());
    ashGeo.setAttribute("position", new THREE.BufferAttribute(ashPos, 3));
    ashGeo.setAttribute("color", new THREE.BufferAttribute(ashColor, 3));
    ashGeo.setAttribute("size", new THREE.BufferAttribute(ashSize, 1));
    ashGeo.setAttribute("alpha", new THREE.BufferAttribute(ashAlpha, 1));
    const ashMat = trackMat(pointsMaterial(dot, false));
    const ash = new THREE.Points(ashGeo, ashMat);
    ash.frustumCulled = false;
    scene.add(ash);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.75, 0.45, 0.9);
    composer.addPass(bloom);
    const grade = new ShaderPass(GRADE);
    composer.addPass(grade);
    composer.addPass(new OutputPass());

    let phase: Phase = "idle";
    let phaseTime = 0;
    let clash = 0.5;
    let clashVel = 0;
    let playerPower = 0.55;
    let rivalPower = 0.55;
    let holding = false;
    let wiggle = 0;
    let surge = 0;
    let surgeWarn = 0;
    let nextSurge = rand(2.2, 3.6);
    let shake = 0;
    let wins = 0;
    let playerFall = 0;
    let rivalFall = 0;
    let lastPointer: { x: number; y: number } | null = null;
    let lastPointerTime = 0;
    let time = 0;
    let sparkBudget = 0;
    let flameBudget = 0;
    let frame = 0;
    let last = performance.now();
    let running = false;
    let visible = true;
    let cameraBase = new THREE.Vector3();

    const tipL = new THREE.Vector3();
    const tipR = new THREE.Vector3();
    const point = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const mid = new THREE.Vector3();

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.resolution.set(w, h);
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 52 : 38;
      const half = Math.tan((camera.fov * Math.PI) / 360);
      const distance = 7.4 / (half * Math.min(aspect, 1.9));
      cameraBase = target.clone().add(new THREE.Vector3(0.08, 0.3, 1).normalize().multiplyScalar(distance));
      camera.updateProjectionMatrix();
      const scale = renderer.getPixelRatio() * h * 0.5 / half;
      sparkMat.uniforms.uScale.value = scale;
      ashMat.uniforms.uScale.value = scale;
    };

    const setPhase = (next: Phase) => {
      phase = next;
      phaseTime = 0;
      if (next === "won") wins += 1;
      if (!thumbnail) setStatus({ phase: next, wins });
    };

    const emit = (origin: THREE.Vector3, kind: number, pal: number, speed: number, bias: number) => {
      const i = sparkCursor;
      sparkCursor = (sparkCursor + 1) % MAX_SPARKS;
      sparkPos[i * 3] = origin.x + rand(-0.06, 0.06);
      sparkPos[i * 3 + 1] = origin.y + rand(-0.06, 0.06);
      sparkPos[i * 3 + 2] = origin.z + rand(-0.06, 0.06);
      if (kind === 0) {
        const a = rand(0, Math.PI * 2);
        const s = rand(0.4, 1) * speed;
        sparkVel[i * 3] = Math.cos(a) * s * 0.8 + bias * rand(0.5, 2.5);
        sparkVel[i * 3 + 1] = rand(0.3, 1.2) * speed * 0.8;
        sparkVel[i * 3 + 2] = Math.sin(a) * s * 0.9;
        sparkSize[i] = rand(0.035, 0.075);
        sparkCool[i] = rand(0.18, 0.4);
      } else {
        sparkVel[i * 3] = rand(-0.4, 0.4);
        sparkVel[i * 3 + 1] = rand(0.3, 1.1);
        sparkVel[i * 3 + 2] = rand(-0.4, 0.4);
        sparkSize[i] = rand(0.12, 0.26);
        sparkCool[i] = rand(2.4, 4);
      }
      sparkHeat[i] = 1;
      sparkKind[i] = kind;
      sparkPal[i] = pal;
      sparkGround[i] = 0;
    };

    const explode = (origin: THREE.Vector3, pal: number, bias: number) => {
      for (let i = 0; i < (reduce ? 400 : 1400); i++) emit(origin, 0, pal, rand(3, 9), bias);
      for (let i = 0; i < 80; i++) emit(origin, 1, pal, 1, 0);
    };

    const ramp = (pal: Palette, heat: number, out: THREE.Color) => {
      const stops = pal.ramp;
      const t = clamp(1 - heat, 0, 0.999) * (stops.length - 1);
      const i = Math.floor(t);
      return out.copy(stops[i]).lerp(stops[i + 1], t - i);
    };
    const scratch = new THREE.Color();

    const press = () => {
      holding = true;
      if (phase === "idle") setPhase("duel");
    };
    const release = () => {
      holding = false;
      lastPointer = null;
    };

    const placeBeam = (layers: THREE.Mesh[], from: THREE.Vector3, to: THREE.Vector3, power: number, opacity: number, warn: number) => {
      dir.subVectors(to, from);
      const length = dir.length();
      dir.normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
      mid.copy(from);
      layers.forEach((mesh, i) => {
        const mat = mesh.material as THREE.ShaderMaterial;
        mesh.position.copy(mid);
        mesh.quaternion.copy(quaternion);
        mat.uniforms.uTime.value = time;
        mat.uniforms.uLength.value = length;
        mat.uniforms.uAmp.value = (0.03 + power * 0.05) * (reduce ? 0.3 : 1) * (i === 0 ? 0.6 : 1);
        mat.uniforms.uOpacity.value = opacity * (i === 0 ? 0.3 + power * 0.15 + warn * 0.3 : i === 1 ? 0.75 : 0.9);
        const base = i === 0 ? 0.2 : i === 1 ? 0.075 : 0.028;
        mat.uniforms.uRadius.value = base * (0.75 + power * 0.35 + warn * 0.5);
      });
    };

    const poseFigure = (figure: ReturnType<typeof makeFigure>, fall: number, crouch: number, power: number, aimAt: THREE.Vector3, facing: number) => {
      figure.body.scale.y = 1 - crouch * 0.1;
      figure.body.rotation.z = -crouch * 0.12 + fall * 1.42 + (reduce ? 0 : Math.sin(time * 9) * power * 0.006);
      figure.body.position.x = -fall * 0.7;
      figure.robe.rotation.x = reduce ? 0 : Math.sin(time * 2.3 + facing) * 0.025;
      const local = figure.shoulder.parent!.worldToLocal(aimAt.clone());
      const angle = Math.atan2(local.y - figure.shoulder.position.y, local.x - figure.shoulder.position.x);
      const yaw = Math.atan2(-(local.z - figure.shoulder.position.z), local.x - figure.shoulder.position.x);
      figure.shoulder.rotation.set(0, yaw * (1 - fall), (fall > 0.2 ? 0.9 : angle) + (reduce ? 0 : Math.sin(time * 31) * power * 0.01));
    };

    const update = (dt: number) => {
      time += dt;
      phaseTime += dt;
      wiggle = Math.max(0, wiggle - dt * 1.6);
      shake = Math.max(0, shake - dt * 2.2);

      if (thumbnail) {
        holding = Math.sin(time * 0.9) > -0.2;
        if (phase === "idle") phase = "duel";
      }

      if (phase === "idle") {
        playerPower = lerp(playerPower, 0.55, dt * 2);
        rivalPower = lerp(rivalPower, 0.55, dt * 2);
        clash = lerp(clash, 0.5 + Math.sin(time * 0.8) * 0.04, dt * 1.5);
      } else if (phase === "duel") {
        const goal = holding ? clamp(0.82 + wiggle * 0.55, 0, 1.45) : 0.18;
        playerPower = lerp(playerPower, goal, dt * (holding ? 3.2 : 1.6));
        nextSurge -= dt;
        if (nextSurge <= 0 && surge <= 0 && surgeWarn <= 0) surgeWarn = 0.55;
        if (surgeWarn > 0) {
          surgeWarn -= dt;
          if (surgeWarn <= 0) {
            surge = rand(0.6, 0.95);
            nextSurge = rand(2, 3.8);
            shake = Math.max(shake, 0.45);
          }
        }
        if (surge > 0) surge -= dt;
        const pressure = Math.min(0.25, phaseTime * 0.012);
        rivalPower = lerp(rivalPower, 0.7 + pressure + wave(time * 0.7, 3) * 0.12 + (surge > 0 ? 0.5 : 0), dt * 4);
        clashVel = lerp(clashVel, (playerPower - rivalPower) * 0.6, dt * 5);
        clash += clashVel * dt;
        if (thumbnail) clash = clamp(clash, 0.3, 0.7);
        if (clash >= 0.97) {
          clash = 0.97;
          setPhase("won");
          shake = 1;
          explode(tipR, 0, 1);
        } else if (clash <= 0.03) {
          clash = 0.03;
          setPhase("lost");
          shake = 1;
          explode(tipL, 1, -1);
        }
      } else {
        playerPower = lerp(playerPower, phase === "won" ? 1 : 0, dt * 3);
        rivalPower = lerp(rivalPower, phase === "won" ? 0 : 1, dt * 3);
        if (phase === "won") rivalFall = Math.min(1, rivalFall + dt * (1.2 + rivalFall * 3));
        if (phase === "lost") playerFall = Math.min(1, playerFall + dt * (1.2 + playerFall * 3));
        if (phaseTime > 2.8) {
          clash = lerp(clash, 0.5, dt * 2.5);
          playerFall = Math.max(0, playerFall - dt * 1.2);
          rivalFall = Math.max(0, rivalFall - dt * 1.2);
        }
        if (phaseTime > 3.8) {
          clashVel = 0;
          surge = 0;
          surgeWarn = 0;
          playerFall = 0;
          rivalFall = 0;
          nextSurge = rand(2.2, 3.6);
          setPhase("idle");
        }
      }

      const rivalShown = rivalPower + (surge > 0 ? 0.3 : 0);
      point.lerpVectors(tipL, tipR, clash);
      if (tipL.lengthSq() === 0) point.set(0, 1.35, 0);
      poseFigure(player, playerFall, 1, playerPower, point, 1);
      poseFigure(rival, rivalFall, 0, rivalShown, point, -1);
      scene.updateMatrixWorld();
      player.tip.getWorldPosition(tipL);
      rival.tip.getWorldPosition(tipR);
      point.lerpVectors(tipL, tipR, clash);
      point.y += wave(time * 2, 9) * 0.03;

      if (phase === "duel" || phase === "idle") {
        const heat = phase === "duel" ? 0.8 + Math.abs(playerPower - rivalPower) * 1.5 : 0.3;
        const lead = playerPower >= rivalPower ? 0 : 1;
        sparkBudget += dt * (reduce ? 40 : 160) * heat;
        while (sparkBudget > 1) {
          sparkBudget -= 1;
          emit(point, 0, Math.random() < 0.72 ? lead : 1 - lead, rand(1.5, 4.5), lead === 0 ? 1 : -1);
        }
        flameBudget += dt * 70;
        while (flameBudget > 1) {
          flameBudget -= 1;
          emit(point, 1, Math.random() < 0.6 ? lead : 1 - lead, 1, 0);
        }
      }

      for (let i = 0; i < MAX_SPARKS; i++) {
        if (sparkHeat[i] <= 0) {
          sparkAlpha[i] = 0;
          continue;
        }
        const p = i * 3;
        if (sparkKind[i] === 1) {
          sparkVel[p + 1] += 1.8 * dt;
          sparkVel[p] *= 1 - dt * 2;
          sparkVel[p + 2] *= 1 - dt * 2;
          sparkHeat[i] -= dt * sparkCool[i];
        } else if (!sparkGround[i]) {
          sparkVel[p + 1] -= 9.8 * dt;
          const drag = 1 - dt * 0.35;
          sparkVel[p] *= drag;
          sparkVel[p + 2] *= drag;
          sparkHeat[i] -= dt * sparkCool[i] * 0.45;
        } else {
          const friction = Math.pow(0.015, dt);
          sparkVel[p] *= friction;
          sparkVel[p + 2] *= friction;
          sparkHeat[i] -= dt * sparkCool[i];
        }
        sparkPos[p] += sparkVel[p] * dt;
        sparkPos[p + 1] += sparkVel[p + 1] * dt;
        sparkPos[p + 2] += sparkVel[p + 2] * dt;
        if (sparkKind[i] === 0 && sparkPos[p + 1] < 0.015) {
          sparkPos[p + 1] = 0.015;
          if (sparkVel[p + 1] < -1.1) {
            sparkVel[p + 1] *= -0.3;
            sparkVel[p] *= 0.55;
            sparkVel[p + 2] *= 0.55;
          } else {
            sparkVel[p + 1] = 0;
            sparkGround[i] = 1;
          }
        }
        const heat = Math.max(0, sparkHeat[i]);
        const pal = sparkPal[i] === 0 ? PLAYER : RIVAL;
        ramp(pal, sparkKind[i] === 1 ? 1 - (1 - heat) * 0.6 : heat, scratch);
        const brightness = sparkKind[i] === 1 ? heat * 0.9 : sparkGround[i] ? Math.pow(heat, 1.3) * 1.6 : 2.2;
        sparkColor[p] = scratch.r * brightness;
        sparkColor[p + 1] = scratch.g * brightness;
        sparkColor[p + 2] = scratch.b * brightness;
        sparkAlpha[i] = sparkKind[i] === 1 ? heat * 0.55 : Math.min(1, heat * 2.5);
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkGeo.attributes.color.needsUpdate = true;
      sparkGeo.attributes.size.needsUpdate = true;
      sparkGeo.attributes.alpha.needsUpdate = true;

      for (let i = 0; i < ASH; i++) {
        const p = i * 3;
        ashPos[p + 1] -= dt * (0.18 + (ashSeed[i] % 1) * 0.3);
        ashPos[p] += Math.sin(time * 0.6 + ashSeed[i]) * dt * 0.25 + dt * 0.12;
        ashPos[p + 2] += Math.cos(time * 0.5 + ashSeed[i]) * dt * 0.15;
        if (ashPos[p + 1] < 0) {
          ashPos[p + 1] = 11;
          ashPos[p] = rand(-18, 18);
        }
        if (ashPos[p] > 18) ashPos[p] = -18;
      }
      ashGeo.attributes.position.needsUpdate = true;

      const resolved = phase === "won" || phase === "lost";
      const fade = resolved ? Math.max(0, 1 - phaseTime * 2.2) : 1;
      const warn = surgeWarn > 0 ? Math.abs(Math.sin(surgeWarn * 30)) : 0;
      placeBeam(playerBeam, tipL, point, playerPower, phase === "lost" ? fade : 1, 0);
      placeBeam(rivalBeam, tipR, point, rivalShown, phase === "won" ? fade : 1, warn);
      playerBeam.forEach((mesh) => (mesh.visible = !(phase === "lost" && fade <= 0)));
      rivalBeam.forEach((mesh) => (mesh.visible = !(phase === "won" && fade <= 0)));

      const power = phase === "duel" ? Math.min(1.4, (playerPower + rivalShown) * 0.6) : 0.4;
      const lead = playerPower / Math.max(0.01, playerPower + rivalShown);
      fire.position.copy(point);
      fire.quaternion.copy(camera.quaternion);
      const fireSize = (1.4 + power * 1.3) * (1 + wave(time * 20, 4) * 0.08) * (resolved ? 1 + (1 - fade) * 2 : 1);
      fire.scale.setScalar(fireSize);
      fireUniforms.uTime.value = time;
      fireUniforms.uLead.value = lead;
      fireUniforms.uPower.value = power;
      fireUniforms.uOpacity.value = fade;
      fire.visible = fade > 0;

      clashLight.position.copy(point);
      clashLight.color.copy(PLAYER.mid).lerp(RIVAL.mid, 1 - lead).lerp(new THREE.Color("#fff3dc"), 0.35);
      clashLight.intensity = ((18 + power * 26) * (1 + wave(time * 25, 2) * 0.15) + (resolved ? (1 - fade) * 0 : 0)) * fade + (resolved ? shake * 80 : 0);
      if (resolved) clashLight.position.copy(phase === "won" ? tipR : tipL);
      playerLight.position.copy(tipL);
      playerLight.intensity = (2 + playerPower * 4) * (phase === "lost" ? fade : 1);
      rivalLight.position.copy(tipR);
      rivalLight.intensity = (2 + rivalShown * 4 + warn * 6) * (phase === "won" ? fade : 1);

      const drift = reduce ? 0 : 1;
      const magnitude = reduce ? 0 : shake * shake * 0.12;
      camera.position.set(
        cameraBase.x + Math.sin(time * 0.31) * 0.25 * drift + rand(-magnitude, magnitude),
        cameraBase.y + Math.sin(time * 0.23) * 0.12 * drift + rand(-magnitude, magnitude),
        cameraBase.z,
      );
      camera.lookAt(target.x + Math.sin(time * 0.2) * 0.15 * drift, target.y, target.z);
      grade.uniforms.uTime.value = time % 10;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      update(dt);
      composer.render();
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

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      try {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      } catch {}
      lastPointer = { x: event.clientX, y: event.clientY };
      lastPointerTime = performance.now();
      press();
    };
    const onMove = (event: PointerEvent) => {
      if (!holding) return;
      const now = performance.now();
      if (lastPointer) {
        const distance = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y);
        const elapsed = Math.max(8, now - lastPointerTime);
        wiggle = Math.min(1, wiggle + (distance / elapsed) * 0.045);
      }
      lastPointer = { x: event.clientX, y: event.clientY };
      lastPointerTime = now;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (event.repeat) {
        wiggle = Math.min(1, wiggle + 0.05);
        return;
      }
      press();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") release();
    };

    resize();
    update(0.016);
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

    if (button && !thumbnail) {
      button.addEventListener("pointerdown", onDown);
      button.addEventListener("pointermove", onMove);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
      button.addEventListener("keydown", onKeyDown);
      button.addEventListener("keyup", onKeyUp);
      button.addEventListener("blur", release);
    }
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (button) {
        button.removeEventListener("pointerdown", onDown);
        button.removeEventListener("pointermove", onMove);
        button.removeEventListener("pointerup", release);
        button.removeEventListener("pointercancel", release);
        button.removeEventListener("lostpointercapture", release);
        button.removeEventListener("keydown", onKeyDown);
        button.removeEventListener("keyup", onKeyUp);
        button.removeEventListener("blur", release);
      }
      rubble.dispose();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
      });
      composer.dispose();
      renderer.dispose();
    };
  }, [thumbnail]);

  const message =
    status.phase === "won"
      ? "You won the duel"
      : status.phase === "lost"
        ? "Overpowered. Try again"
        : status.phase === "duel"
          ? "Shake while holding to surge"
          : "Hold to cast. Shake to surge";

  return (
    <div
      ref={stageRef}
      className={thumbnail ? "" : "craft-fill not-prose"}
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        background: "#8fa596",
        ...(thumbnail
          ? { maxWidth: "28rem", marginInline: "auto", aspectRatio: "16 / 9", pointerEvents: "none", borderRadius: 12 }
          : { minHeight: "30rem" }),
      }}
    >
      <canvas ref={canvasRef} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      {!thumbnail && (
        <>
          <button
            ref={buttonRef}
            type="button"
            aria-label="Hold to push your spell. Press and hold Space or Enter, or press and hold anywhere."
            className="focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-amber-400"
            style={{ position: "absolute", inset: 0, background: "transparent", border: 0, cursor: "pointer", touchAction: "none" }}
          />
          <div
            aria-live="polite"
            style={{
              position: "absolute",
              top: "1.5rem",
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              pointerEvents: "none",
              color: "#f2f6f2",
              textShadow: "0 1px 0 rgb(0 0 0 / 0.45), 0 0 14px rgb(0 0 0 / 0.4)",
              fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
              fontWeight: 800,
            }}
          >
            <span style={{ fontSize: "1.05rem", opacity: status.phase === "duel" ? 0.75 : 1 }}>{message}</span>
            {status.wins > 0 && (
              <span style={{ fontSize: "0.8rem", opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>
                {status.wins} {status.wins === 1 ? "win" : "wins"}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
