// Video burst engine: draws a video as a grid of pieces with WebGL and moves the pieces with one of
// seven effects. Each frame JavaScript works out every piece's position, rotation, scale and look,
// uploads that as one buffer, and WebGL draws each piece as a point whose fragment shader cuts out
// the piece's shape (square, dot, jigsaw piece, droplet or glass shard) and paints its bit of video.
//
// Two ways to move the pieces:
// - Scrubbed (physics off): every piece's position is a formula of the scroll progress, so scrolling
//   back up rewinds it exactly. Gravity and bounces are worked out in closed form.
// - Simulated (physics on): once the scroll passes a piece's delay it is let go into a small physics
//   world with gravity, wind, drag, floor and walls, and collisions with other loose pieces. Scrolling
//   back above its delay pulls it home again.

export type EffectName = "burst" | "jigsaw" | "droplets" | "shatter" | "melt" | "flakes" | "vortex";
export type Origin = "center" | "top" | "bottom" | "left" | "right" | "click";

export type BurstSettings = {
  effect: EffectName;
  physics: boolean;
  pieceSize: number; // CSS px
  gravity: number; // 1 = falls the hero height in about 1.4 s
  bounce: number; // 0 = dead stop, 1 = perfect bounce
  wind: number; // sideways push, negative blows left
  spread: number; // how hard pieces are thrown
  spin: number; // how much pieces rotate
  glow: number; // how much brighter loose pieces get
  origin: Origin; // where the break starts
  tab: number; // jigsaw: tab size
  stretch: number; // droplets: how much falling drops stretch
  cracks: number; // shatter: brightness of the crack lines
  flutter: number; // flakes: how fast they flip
  drip: number; // melt: how uneven the columns run
  twist: number; // vortex: how tightly it spirals
};

// Shape ids the fragment shader understands.
const SHAPE = { dot: 0, jigsaw: 1, droplet: 2, shard: 3, square: 4, flake: 5 } as const;

type EffectInfo = {
  label: string;
  shape: number;
  extent: number; // point size / piece size: room for the shape, its tabs, and rotation
  radius: number; // collision radius / piece size
  gravityScale: number; // how much of the gravity setting this effect feels
  drag: number; // air drag per second
  // With physics on, loose pieces shrink to this size, as if falling away from you. Without it the
  // pieces would fill the hero exactly and jam into a full stack instead of a pile.
  loose: number;
  defaults: Partial<BurstSettings>;
};

export const EFFECTS: Record<EffectName, EffectInfo> = {
  burst: {
    label: "Burst",
    shape: SHAPE.dot,
    extent: 1.45,
    radius: 0.3,
    gravityScale: 0.4,
    drag: 0.6,
    loose: 1,
    defaults: { pieceSize: 8, gravity: 0.4, bounce: 0.4, wind: 0, spread: 1, spin: 1, glow: 0.6, origin: "center" },
  },
  jigsaw: {
    label: "Jigsaw",
    shape: SHAPE.jigsaw,
    extent: 2.2,
    radius: 0.5,
    gravityScale: 1,
    drag: 0.05,
    loose: 0.55,
    defaults: { pieceSize: 56, gravity: 1, bounce: 0.3, wind: 0, spread: 0.6, spin: 1, glow: 0, origin: "bottom" },
  },
  droplets: {
    label: "Droplets",
    shape: SHAPE.droplet,
    extent: 1.45,
    radius: 0.42,
    gravityScale: 1,
    drag: 0.05,
    loose: 1,
    defaults: { pieceSize: 16, gravity: 1, bounce: 0.35, wind: 0, spread: 0.4, spin: 0, glow: 0.2, origin: "bottom" },
  },
  shatter: {
    label: "Shatter",
    shape: SHAPE.shard,
    extent: 2.9,
    radius: 0.5,
    gravityScale: 1,
    drag: 0.05,
    loose: 0.6,
    defaults: { pieceSize: 64, gravity: 1, bounce: 0.25, wind: 0, spread: 1, spin: 1, glow: 0.1, origin: "click" },
  },
  melt: {
    label: "Melt",
    shape: SHAPE.square,
    extent: 1.45,
    radius: 0.5,
    gravityScale: 1,
    drag: 0.3,
    loose: 0.6,
    defaults: { pieceSize: 8, gravity: 0.8, bounce: 0.1, wind: 0, spread: 0.2, spin: 0, glow: 0, origin: "top" },
  },
  flakes: {
    label: "Flakes",
    shape: SHAPE.flake,
    extent: 1.45,
    radius: 0.45,
    gravityScale: 0.15,
    drag: 1.2,
    loose: 0.55,
    defaults: { pieceSize: 22, gravity: 1, bounce: 0.2, wind: 0.6, spread: 0.5, spin: 1, glow: 0.1, origin: "right" },
  },
  vortex: {
    label: "Vortex",
    shape: SHAPE.dot,
    extent: 1.45,
    radius: 0.3,
    gravityScale: 0,
    drag: 1,
    loose: 1,
    defaults: { pieceSize: 8, gravity: 0, bounce: 0.3, wind: 0, spread: 1, spin: 1, glow: 0.5, origin: "center" },
  },
};

export const DEFAULT_SETTINGS: BurstSettings = {
  effect: "burst",
  physics: false,
  pieceSize: 8,
  gravity: 0.4,
  bounce: 0.4,
  wind: 0,
  spread: 1,
  spin: 1,
  glow: 0.6,
  origin: "center",
  tab: 0.17,
  stretch: 1,
  cracks: 0.6,
  flutter: 1,
  drip: 1,
  twist: 1,
};

/** Apply an effect's recommended settings, keeping the effect-specific knobs the user set. */
export function settingsForEffect(settings: BurstSettings, effect: EffectName): BurstSettings {
  return { ...settings, ...EFFECTS[effect].defaults, effect };
}

// ---------------------------------------------------------------------------------------------
// Shaders

const vertexShader = /* glsl */ `
attribute vec2 a_home;    // where the piece's picture comes from, device px, y down
attribute vec2 a_cellId;  // column and row
attribute vec2 a_pos;     // where the piece is now
attribute float a_angle;  // rotation in radians
attribute vec2 a_scale;   // scale along the piece's own x and y (negative x = flipped over)
attribute float a_morph;  // 0 = still part of the picture, 1 = fully loose
attribute float a_alpha;
attribute float a_spread; // 1 = paint the piece's whole patch of video, 0 = one colour

uniform vec2 u_res;
uniform float u_cell;     // piece size in device px
uniform float u_extent;   // point size / piece size
uniform float u_maxPoint; // the GPU's largest point size
uniform float u_pass;     // 0 = draw resting pieces, 1 = draw loose pieces on top

varying vec2 v_home;
varying vec2 v_cellId;
varying vec2 v_scale;
varying float v_angle;
varying float v_morph;
varying float v_alpha;
varying float v_spread;
varying float v_size;

void main() {
  float loose = step(0.0005, a_morph);
  if (abs(loose - u_pass) > 0.5 || a_alpha <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // off screen: skipped
    gl_PointSize = 0.0;
    return;
  }
  vec2 clip = a_pos / u_res * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = min(u_cell * u_extent * max(abs(a_scale.x), abs(a_scale.y)), u_maxPoint);

  v_home = a_home;
  v_cellId = a_cellId;
  v_scale = a_scale;
  v_angle = a_angle;
  v_morph = a_morph;
  v_alpha = a_alpha;
  v_spread = a_spread;
  v_size = gl_PointSize;
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D u_video;
uniform sampler2D u_cells; // per piece: seed jitter (r, g) and jigsaw tab directions (b, a)
uniform vec2 u_res;
uniform vec2 u_grid;       // columns, rows
uniform vec2 u_uvScale;    // object-fit: cover
uniform vec2 u_uvOffset;
uniform float u_cell;
uniform float u_shape;
uniform float u_tab;
uniform float u_glow;
uniform float u_cracks;

varying vec2 v_home;
varying vec2 v_cellId;
varying vec2 v_scale;
varying float v_angle;
varying float v_morph;
varying float v_alpha;
varying float v_spread;
varying float v_size;

vec4 cellData(vec2 id) { return texture2D(u_cells, (id + 0.5) / u_grid); }
bool inGrid(vec2 id) { return id.x >= 0.0 && id.y >= 0.0 && id.x < u_grid.x && id.y < u_grid.y; }

// Signed distance to a square of half size h: negative inside.
float box(vec2 q, float h) {
  vec2 d = abs(q) - h;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// A jigsaw edge: s = 1 adds a round tab past the edge, s = -1 cuts the matching blank out of it.
// The neighbour across the edge uses the same circle the other way round, so pieces interlock.
float tab(float d, vec2 q, vec2 n, float s) {
  if (s > 0.5) return min(d, length(q - n * 0.6) - u_tab);
  if (s < -0.5) return max(d, u_tab - length(q - n * 0.4));
  return d; // the border of the picture stays straight
}

float tabSign(float v) { return v > 0.5 ? 1.0 : -1.0; }

float jigsaw(vec2 q) {
  vec2 id = v_cellId;
  vec4 me = cellData(id);
  float d = box(q, 0.5);
  d = tab(d, q, vec2(1.0, 0.0), inGrid(id + vec2(1.0, 0.0)) ? tabSign(me.b) : 0.0);
  d = tab(d, q, vec2(0.0, 1.0), inGrid(id + vec2(0.0, 1.0)) ? tabSign(me.a) : 0.0);
  d = tab(d, q, vec2(-1.0, 0.0), inGrid(id - vec2(1.0, 0.0)) ? -tabSign(cellData(id - vec2(1.0, 0.0)).b) : 0.0);
  d = tab(d, q, vec2(0.0, -1.0), inGrid(id - vec2(0.0, 1.0)) ? -tabSign(cellData(id - vec2(0.0, 1.0)).a) : 0.0);
  return d;
}

// Glass shards are Voronoi cells: each pixel belongs to the nearest seed, one seed per grid cell.
vec2 seedOf(vec2 id) { return id + 0.2 + 0.6 * cellData(id).rg; }

float shard(vec2 q, out float crack) {
  vec2 p = seedOf(v_cellId) + q;
  vec2 base = floor(p);
  float best = 1e5;
  float second = 1e5;
  vec2 bestId = vec2(-1.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      if (!inGrid(id)) continue;
      float d = distance(p, seedOf(id));
      if (d < best) { second = best; best = d; bestId = id; }
      else if (d < second) { second = d; }
    }
  }
  crack = second - best; // 0 on the line between two shards
  return all(equal(bestId, v_cellId)) ? -crack : crack;
}

void main() {
  // From this pixel's place in the point, undo the piece's rotation and scale to get back to where
  // it sits in the resting picture, in piece units (the piece spans -0.5 to 0.5).
  vec2 offset = (gl_PointCoord - 0.5) * v_size;
  float c = cos(v_angle), s = sin(v_angle);
  vec2 unrotated = vec2(c * offset.x + s * offset.y, -s * offset.x + c * offset.y);
  vec2 scale = max(abs(v_scale), vec2(0.03));
  vec2 q = unrotated / (u_cell * scale);

  float crack = 1.0;
  float d;
  if (u_shape < 0.5) d = mix(box(q, 0.5), length(q) - 0.5, v_morph);       // square to dot
  else if (u_shape < 1.5) d = jigsaw(q);
  else if (u_shape < 2.5) d = mix(box(q, 0.5), length(q) - 0.45, v_morph); // square to droplet
  else if (u_shape < 3.5) d = shard(q, crack);
  else d = box(q, 0.5);                                                     // square, flake

  // Resting pieces use a hard edge so they tile without seams; loose ones get a soft edge.
  float aa = 1.2 / (u_cell * min(scale.x, scale.y));
  float mask = v_morph > 0.0005 ? smoothstep(aa, -aa, d) : step(d, 0.0);
  if (mask <= 0.0) discard;

  vec2 uv = clamp((v_home + q * u_cell * v_spread) / u_res, 0.0, 1.0);
  vec3 color = texture2D(u_video, u_uvOffset + uv * u_uvScale).rgb;
  color *= 1.0 + u_glow * v_morph;

  if (u_shape > 0.5 && u_shape < 1.5) {
    // Jigsaw: a dark cut line round each loose piece.
    color *= 1.0 - 0.45 * v_morph * smoothstep(-0.07, 0.0, d);
  } else if (u_shape > 1.5 && u_shape < 2.5) {
    // Droplet: darker rim and a bright highlight, like a bead of water.
    color *= 1.0 - 0.35 * v_morph * smoothstep(-0.2, 0.0, d);
    vec2 h = offset / (u_cell * (scale.x + scale.y) * 0.5) - vec2(-0.14, -0.16);
    color = mix(color, vec3(1.0), 0.75 * v_morph * smoothstep(0.12, 0.0, length(h)));
  } else if (u_shape > 2.5 && u_shape < 3.5) {
    // Shard: bright cracks along the edges.
    color = mix(color, vec3(1.0), u_cracks * v_morph * (1.0 - smoothstep(0.0, 0.07, crack)));
  } else if (u_shape > 4.5) {
    // Flake: darker when edge-on, grey on the back.
    float grey = dot(color, vec3(0.3, 0.59, 0.11));
    if (v_scale.x < 0.0) color = mix(color, vec3(grey), 0.6) * 0.6;
    color *= 0.55 + 0.45 * abs(v_scale.x);
  }

  gl_FragColor = vec4(color * mask * v_alpha, mask * v_alpha); // premultiplied alpha
}
`;

// ---------------------------------------------------------------------------------------------
// Helpers

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Closed-form fall with floor bounces: where something dropped from y with speed vy is after t
 * seconds, under gravity g, bouncing off `floor` and keeping `bounce` of its speed each time.
 */
function fall(y: number, vy: number, g: number, floor: number, bounce: number, t: number) {
  if (g <= 0) return { y: y + vy * t, vy, landed: false };
  for (let i = 0; i < 8; i++) {
    const hit = (-vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * (floor - y)))) / g; // time to the floor
    if (y > floor || hit >= t) return { y: Math.min(floor, y + vy * t + 0.5 * g * t * t), vy: vy + g * t, landed: false };
    t -= hit;
    vy = -(vy + g * hit) * bounce;
    y = floor;
    if (Math.abs(vy) < g * 0.02) break;
  }
  return { y: floor, vy: 0, landed: true };
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

// Floats per piece in the buffer uploaded every frame: x, y, angle, scale x, scale y, morph, alpha, spread.
const DYNAMIC = 8;
// Seconds of "virtual time" a scrubbed piece covers between its delay and the end of its window.
const SCRUB_SECONDS = 2.5;
const WINDOW = 0.5;
// Above this many pieces, loose pieces don't collide with each other (it would cost too much).
const MAX_COLLIDING = 6000;

export type EngineCallbacks = {
  getProgress: () => number;
  onProgress: (progress: number) => void;
  onReady: () => void;
};

export function startVideoBurst(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  settings: { current: BurstSettings },
  callbacks: EngineCallbacks,
) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
  if (!gl) return { dispose: () => {}, setClickPoint: () => {} };

  const program = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, vertexShader);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.useProgram(program);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    res: uniform("u_res"),
    cell: uniform("u_cell"),
    extent: uniform("u_extent"),
    maxPoint: uniform("u_maxPoint"),
    pass: uniform("u_pass"),
    grid: uniform("u_grid"),
    uvScale: uniform("u_uvScale"),
    uvOffset: uniform("u_uvOffset"),
    shape: uniform("u_shape"),
    tab: uniform("u_tab"),
    glow: uniform("u_glow"),
    cracks: uniform("u_cracks"),
  };
  gl.uniform1i(uniform("u_video"), 0);
  gl.uniform1i(uniform("u_cells"), 1);
  gl.uniform1f(u.maxPoint, (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1]);

  const makeTexture = (unit: number, filter: number) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    return texture;
  };
  const videoTexture = makeTexture(0, gl.LINEAR);
  const cellTexture = makeTexture(1, gl.NEAREST);

  const staticBuffer = gl.createBuffer();
  const dynamicBuffer = gl.createBuffer();
  const bindAttribute = (buffer: WebGLBuffer | null, name: string, size: number, stride: number, offset: number) => {
    const location = gl.getAttribLocation(program, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride * 4, offset * 4);
  };
  bindAttribute(staticBuffer, "a_home", 2, 4, 0);
  bindAttribute(staticBuffer, "a_cellId", 2, 4, 2);
  bindAttribute(dynamicBuffer, "a_pos", 2, DYNAMIC, 0);
  bindAttribute(dynamicBuffer, "a_angle", 1, DYNAMIC, 2);
  bindAttribute(dynamicBuffer, "a_scale", 2, DYNAMIC, 3);
  bindAttribute(dynamicBuffer, "a_morph", 1, DYNAMIC, 5);
  bindAttribute(dynamicBuffer, "a_alpha", 1, DYNAMIC, 6);
  bindAttribute(dynamicBuffer, "a_spread", 1, DYNAMIC, 7);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // ---- The grid of pieces ----
  let dpr = 1;
  let W = 1;
  let H = 1;
  let cell = 8;
  let cols = 1;
  let rows = 1;
  let count = 0;
  let homeX = new Float32Array(0);
  let homeY = new Float32Array(0);
  let colOf = new Uint16Array(0);
  let rowOf = new Uint16Array(0);
  let rand = new Float32Array(0); // 4 per piece
  let columnRand = new Float32Array(0);
  let dynamic = new Float32Array(0);
  // Physics state.
  let px = new Float32Array(0);
  let py = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let angle = new Float32Array(0);
  let spinRate = new Float32Array(0);
  let morph = new Float32Array(0);
  let releasedAt = new Float32Array(0);
  let state = new Uint8Array(0); // 0 resting, 1 free, 2 flying home
  let shrink = new Float32Array(0); // current size of a loose piece, 1 = full size
  let builtFor = "";

  const build = () => {
    const s = settings.current;
    cell = Math.max(3, s.pieceSize * dpr);
    cols = Math.ceil(W / cell);
    rows = Math.ceil(H / cell);
    count = cols * rows;
    homeX = new Float32Array(count);
    homeY = new Float32Array(count);
    colOf = new Uint16Array(count);
    rowOf = new Uint16Array(count);
    rand = new Float32Array(count * 4);
    columnRand = new Float32Array(cols);
    dynamic = new Float32Array(count * DYNAMIC);
    px = new Float32Array(count);
    py = new Float32Array(count);
    vx = new Float32Array(count);
    vy = new Float32Array(count);
    angle = new Float32Array(count);
    spinRate = new Float32Array(count);
    morph = new Float32Array(count);
    releasedAt = new Float32Array(count);
    state = new Uint8Array(count);
    shrink = new Float32Array(count).fill(1);

    let seed = 7; // seeded, so the same settings always break the same way
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let c = 0; c < cols; c++) columnRand[c] = random();

    const cells = new Uint8Array(count * 4);
    const staticData = new Float32Array(count * 4);
    const shard = EFFECTS[s.effect].shape === SHAPE.shard;
    for (let row = 0, i = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++, i++) {
        const jx = random();
        const jy = random();
        cells[i * 4] = Math.round(jx * 255);
        cells[i * 4 + 1] = Math.round(jy * 255);
        cells[i * 4 + 2] = random() > 0.5 ? 255 : 0;
        cells[i * 4 + 3] = random() > 0.5 ? 255 : 0;
        // A shard pivots on its Voronoi seed; every other piece on its square's centre.
        const ox = shard ? 0.2 + 0.6 * (cells[i * 4] / 255) : 0.5;
        const oy = shard ? 0.2 + 0.6 * (cells[i * 4 + 1] / 255) : 0.5;
        homeX[i] = (col + ox) * cell;
        homeY[i] = (row + oy) * cell;
        colOf[i] = col;
        rowOf[i] = row;
        for (let k = 0; k < 4; k++) rand[i * 4 + k] = random();
        staticData.set([homeX[i], homeY[i], col, row], i * 4);
        px[i] = homeX[i];
        py[i] = homeY[i];
      }
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cellTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, cells);
    gl.bindBuffer(gl.ARRAY_BUFFER, staticBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, staticData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, dynamic, gl.DYNAMIC_DRAW);
    builtFor = `${s.effect}|${s.pieceSize}|${s.physics}|${W}x${H}`;
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = H = Math.max(1, Math.round(rect.height * dpr));
    gl.viewport(0, 0, W, H);
    builtFor = ""; // rebuild on the next frame
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  // ---- Where the break starts ----
  let click = { x: 0.5, y: 0.5 }; // 0 to 1 across the canvas
  type Point = { x: number; y: number; far: number };
  const originPoint = (): Point => {
    const at = (x: number, y: number) => ({
      x,
      y,
      // Distance to the farthest corner, so the last piece to go gets order 1.
      far: Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y)),
    });
    switch (settings.current.origin) {
      case "top":
        return at(W / 2, 0);
      case "bottom":
        return at(W / 2, H);
      case "left":
        return at(0, H / 2);
      case "right":
        return at(W, H / 2);
      case "click":
        return at(click.x * W, click.y * H);
      default:
        return at(W / 2, H / 2);
    }
  };
  // 0 for the first pieces to go, 1 for the last.
  const originOrder = (i: number, o: Point) => {
    switch (settings.current.origin) {
      case "top":
        return homeY[i] / H;
      case "bottom":
        return 1 - homeY[i] / H;
      case "left":
        return homeX[i] / W;
      case "right":
        return 1 - homeX[i] / W;
      default:
        return Math.hypot(homeX[i] - o.x, homeY[i] - o.y) / o.far;
    }
  };
  const delayOf = (i: number, o: Point) => {
    const r0 = rand[i * 4];
    const order = originOrder(i, o);
    switch (settings.current.effect) {
      case "shatter":
        return order * 0.45 + r0 * 0.05; // the crack runs out cleanly from the impact
      case "melt":
        return columnRand[colOf[i]] * 0.3 + order * 0.15; // whole columns go at their own pace
      default:
        return order * 0.3 + r0 * 0.2;
    }
  };

  // ---- Scrubbed motion: a pure function of progress ----
  const writePiece = (i: number, x: number, y: number, a: number, sx: number, sy: number, m: number, alpha: number, spread: number) => {
    const o = i * DYNAMIC;
    dynamic[o] = x;
    dynamic[o + 1] = y;
    dynamic[o + 2] = a;
    dynamic[o + 3] = sx;
    dynamic[o + 4] = sy;
    dynamic[o + 5] = m;
    dynamic[o + 6] = alpha;
    dynamic[o + 7] = spread;
  };

  const scrub = (progress: number, time: number, motion: number) => {
    const s = settings.current;
    const o = originPoint();
    const g = s.gravity * H * EFFECTS[s.effect].gravityScale;
    const halfDiagonal = Math.hypot(W, H) / 2;
    for (let i = 0; i < count; i++) {
      const hx = homeX[i];
      const hy = homeY[i];
      const r1 = rand[i * 4 + 1];
      const r2 = rand[i * 4 + 2];
      const r3 = rand[i * 4 + 3];
      const delay = delayOf(i, o);
      const e = clamp01((progress - delay) / WINDOW);
      if (e <= 0 && s.effect !== "shatter") {
        writePiece(i, hx, hy, 0, 1, 1, 0, 1, 1);
        continue;
      }
      const t = e * SCRUB_SECONDS;
      const radius = cell * 0.5;
      const dx = hx - o.x;
      const dy = hy - o.y;
      const dist = Math.hypot(dx, dy) || 1;

      switch (s.effect) {
        case "burst": {
          const flight = 1 - (1 - e) ** 3;
          const dir = Math.atan2(dy, dx) + (r1 - 0.5) * 1.6;
          const reach = (0.1 + r2 * 0.6) * halfDiagonal * s.spread * flight;
          let x = hx + Math.cos(dir) * reach - o.x;
          let y = hy + Math.sin(dir) * reach - o.y;
          const swirl = (r3 - 0.5) * 1.2 * s.spin * flight;
          [x, y] = [x * Math.cos(swirl) - y * Math.sin(swirl), x * Math.sin(swirl) + y * Math.cos(swirl)];
          const depth = 1 + (r3 * 0.9 - 0.3) * flight;
          x = o.x + x * depth + Math.sin(time * 1.3 + r1 * 40) * cell * 1.5 * e * motion;
          y = o.y + y * depth - H * 0.12 * flight * flight + 0.5 * g * 0.2 * flight * flight + Math.cos(time * 1.1 + r2 * 30) * cell * 1.5 * e * motion;
          const scale = 1 + ((0.6 + r2 * 0.5) * depth - 1) * smoothstep(0, 0.6, e);
          const m = smoothstep(0, 0.12, e);
          writePiece(i, x, y, 0, scale, scale, m, 1 - 0.35 * smoothstep(0.6, 1, e), 1 - m);
          break;
        }
        case "jigsaw": {
          const v0x = (r1 - 0.5) * s.spread * H * 0.6;
          const v0y = -(0.1 + 0.3 * r2) * s.spread * H;
          const f = fall(hy, v0y, g, H - radius, s.bounce, t);
          const x = hx + v0x * t + 0.5 * s.wind * H * t * t;
          const a = (r3 - 0.5) * s.spin * 4 * Math.min(t, 1.2);
          const lift = 1 + 0.08 * smoothstep(0, 0.05, e);
          writePiece(i, x, f.y, a, lift, lift, Math.max(0.001, smoothstep(0, 0.02, e)), 1, 1);
          break;
        }
        case "droplets": {
          const v0x = (r1 - 0.5) * s.spread * H * 0.3;
          const f = fall(hy, (r2 - 0.5) * s.spread * H * 0.2, g, H - radius * 0.9, s.bounce, t);
          const vxNow = v0x + s.wind * H * t;
          const x = hx + v0x * t + 0.5 * s.wind * H * t * t;
          const m = smoothstep(0, 0.12, e);
          const { a, sx, sy } = dropletShape(vxNow, f.vy, f.landed, m, s.stretch);
          writePiece(i, x, f.y, a, sx * 0.85, sy * 0.85, m, 1, 1 - m);
          break;
        }
        case "shatter": {
          // Cracks show up just before a shard leaves.
          const crack = smoothstep(delay - 0.12, delay - 0.02, progress);
          if (e <= 0) {
            writePiece(i, hx, hy, 0, 1, 1, crack * 0.999, 1, 1);
            break;
          }
          const near = 1 - Math.min(1, dist / halfDiagonal);
          const speed = s.spread * (0.25 + 0.6 * near + 0.2 * r1) * H;
          const f = fall(hy, (dy / dist) * speed - 0.2 * H * s.spread, g, H - radius, s.bounce, t);
          const x = hx + (dx / dist) * speed * t + 0.5 * s.wind * H * t * t;
          const a = (r2 - 0.5) * s.spin * 6 * Math.min(t, 1.5);
          const zoom = 1 + 0.25 * smoothstep(0, 0.3, e);
          writePiece(i, x, f.y, a, zoom, zoom, Math.max(crack, 0.001), 1, 1);
          break;
        }
        case "melt": {
          const speed = 0.5 + columnRand[colOf[i]] * s.drip;
          const lower = 1 + (0.4 * rowOf[i]) / rows;
          const drop = 0.5 * Math.max(g, H * 0.2) * t * t * speed;
          const stretch = 1 + (drop * 0.4) / rows / cell; // fill the gap that opens between rows
          writePiece(i, hx + s.wind * H * 0.5 * t * t, hy + drop * lower, 0, 1, stretch, 0.001, 1, 1);
          break;
        }
        case "flakes": {
          const x = hx + s.wind * W * 0.6 * t + Math.sin(t * 2 + r1 * 6) * cell * 2 * s.flutter + (r1 - 0.5) * s.spread * H * 0.4 * t;
          const y = hy + 0.5 * g * t * t + (r2 - 0.6) * s.spread * H * 0.4 * t;
          const a = (r3 - 0.5) * s.spin * 2 * t;
          const flip = Math.cos(t * s.flutter * 4 + r3 * 6);
          writePiece(i, x, y, a, flip, 1, Math.max(0.001, smoothstep(0, 0.05, e)), 1, 1);
          break;
        }
        case "vortex": {
          const far = halfDiagonal * 1.2;
          const r = dist * (1 - e) ** 1.5;
          const turn = Math.atan2(dy, dx) + s.twist * e * (3 + r1 * 2) * (1 + (1 - Math.min(1, dist / far)));
          const scale = 1 - 0.7 * e;
          const m = smoothstep(0, 0.2, e);
          writePiece(i, o.x + Math.cos(turn) * r, o.y + Math.sin(turn) * r, 0, scale, scale, m, 1 - smoothstep(0.75, 1, e), 1 - m);
          break;
        }
      }
    }
  };

  // ---- Simulated motion ----
  let lastSim = 0;
  const simulate = (progress: number, time: number, dt: number) => {
    const s = settings.current;
    const info = EFFECTS[s.effect];
    const o = originPoint();
    const g = s.gravity * H * info.gravityScale;
    const halfDiagonal = Math.hypot(W, H) / 2;
    // Small fixed steps keep stacks stable; a long frame takes more of them (up to a limit).
    const steps = Math.min(6, Math.max(1, Math.ceil(dt / (1 / 120))));
    const h = dt / steps;
    // Collisions cost the most. Thousands of tiny dots skip them and only meet the floor and walls.
    const collisions = count <= MAX_COLLIDING;

    for (let i = 0; i < count; i++) {
      const delay = delayOf(i, o);
      if (state[i] === 0 && progress >= delay) {
        state[i] = 1;
        releasedAt[i] = time;
        kick(i, o, halfDiagonal);
      } else if (state[i] === 1 && progress < delay - 0.02) {
        state[i] = 2;
      }
    }

    // Loose pieces ease down to their loose size over half a second; returning ones grow back.
    for (let i = 0; i < count; i++) {
      const goal = state[i] === 1 ? info.loose : 1;
      shrink[i] += (goal - shrink[i]) * Math.min(1, dt * 4);
    }

    for (let step = 0; step < steps; step++) {
      for (let i = 0; i < count; i++) {
        if (state[i] === 2) {
          // Fly home on a quick ease, ignoring everything else.
          const k = Math.min(1, h * 6);
          px[i] += (homeX[i] - px[i]) * k;
          py[i] += (homeY[i] - py[i]) * k;
          angle[i] -= angle[i] * k;
          vx[i] = vy[i] = spinRate[i] = 0;
          if (Math.abs(px[i] - homeX[i]) + Math.abs(py[i] - homeY[i]) < 0.5) {
            state[i] = 0;
            px[i] = homeX[i];
            py[i] = homeY[i];
            angle[i] = 0;
          }
          continue;
        }
        if (state[i] !== 1) continue;
        const r = rand[i * 4 + 1];
        vy[i] += g * h;
        vx[i] += s.wind * H * 0.5 * h;
        if (s.effect === "flakes") vx[i] += Math.sin(time * 3 + r * 20) * s.flutter * H * 0.8 * h;
        if (s.effect === "vortex") {
          const dx = o.x - px[i];
          const dy = o.y - py[i];
          const d = Math.hypot(dx, dy) || 1;
          vx[i] += ((dx / d) * 1.5 - (dy / d) * 1.2 * s.twist) * H * h;
          vy[i] += ((dy / d) * 1.5 + (dx / d) * 1.2 * s.twist) * H * h;
        }
        const drag = Math.max(0, 1 - info.drag * h);
        vx[i] *= drag;
        vy[i] *= drag;
        px[i] += vx[i] * h;
        py[i] += vy[i] * h;
        angle[i] += spinRate[i] * h;

        // Floor and walls.
        const radius = pieceRadius(i);
        if (py[i] > H - radius) {
          py[i] = H - radius;
          vy[i] = -Math.abs(vy[i]) * s.bounce;
          vx[i] *= 0.85;
          spinRate[i] *= 0.6;
        }
        if (px[i] < radius) {
          px[i] = radius;
          vx[i] = Math.abs(vx[i]) * s.bounce;
        } else if (px[i] > W - radius) {
          px[i] = W - radius;
          vx[i] = -Math.abs(vx[i]) * s.bounce;
        }
      }
      if (collisions) collide(s.bounce);
    }

    // Turn the physics state into what the shader draws.
    for (let i = 0; i < count; i++) {
      const target = state[i] === 1 ? 1 : 0;
      morph[i] += (target - morph[i]) * Math.min(1, dt * (info.shape === SHAPE.jigsaw ? 20 : 6));
      if (state[i] === 0) morph[i] = 0;
      let m = state[i] === 0 ? 0 : Math.max(0.001, morph[i]);
      // Shatter: cracks show just before a shard leaves.
      if (s.effect === "shatter" && state[i] === 0) m = smoothstep(delayOf(i, o) - 0.12, delayOf(i, o) - 0.02, progress) * 0.999;
      const r2 = rand[i * 4 + 2];
      const age = time - releasedAt[i];
      switch (s.effect) {
        case "burst":
        case "vortex": {
          const scale = 1 + (0.6 + r2 * 0.5 - 1) * m;
          writePiece(i, px[i], py[i], 0, scale, scale, m, s.effect === "vortex" ? 1 : 0.95, 1 - m);
          break;
        }
        case "droplets": {
          const landed = py[i] >= H - pieceRadius(i) - 1 && Math.abs(vy[i]) < H * 0.05;
          const { a, sx, sy } = dropletShape(vx[i], vy[i], landed, m, s.stretch);
          writePiece(i, px[i], py[i], a, sx * 0.85, sy * 0.85, m, 1, 1 - m);
          break;
        }
        case "flakes": {
          const flip = state[i] === 1 ? Math.cos(age * s.flutter * 4 + rand[i * 4 + 3] * 6) : 1;
          writePiece(i, px[i], py[i], angle[i], flip * shrink[i], shrink[i], m, 1, 1);
          break;
        }
        case "shatter": {
          writePiece(i, px[i], py[i], angle[i], shrink[i], shrink[i], m, 1, 1);
          break;
        }
        default:
          writePiece(i, px[i], py[i], angle[i], shrink[i], shrink[i], m, 1, 1);
      }
    }
    lastSim = time;
  };

  // The push a piece gets the moment it's let go.
  const kick = (i: number, o: Point, halfDiagonal: number) => {
    const s = settings.current;
    const r1 = rand[i * 4 + 1];
    const r2 = rand[i * 4 + 2];
    const r3 = rand[i * 4 + 3];
    const dx = homeX[i] - o.x;
    const dy = homeY[i] - o.y;
    const dist = Math.hypot(dx, dy) || 1;
    px[i] = homeX[i];
    py[i] = homeY[i];
    angle[i] = 0;
    spinRate[i] = (r3 - 0.5) * s.spin * 4;
    switch (s.effect) {
      case "burst": {
        const dir = Math.atan2(dy, dx) + (r1 - 0.5) * 1.6;
        const speed = (0.4 + r2) * s.spread * H * 1.2;
        vx[i] = Math.cos(dir) * speed;
        vy[i] = Math.sin(dir) * speed - H * 0.3;
        break;
      }
      case "shatter": {
        const near = 1 - Math.min(1, dist / halfDiagonal);
        const speed = s.spread * (0.25 + 0.6 * near + 0.2 * r1) * H;
        vx[i] = (dx / dist) * speed;
        vy[i] = (dy / dist) * speed - 0.2 * H * s.spread;
        spinRate[i] = (r2 - 0.5) * s.spin * 6;
        break;
      }
      case "vortex":
        vx[i] = (-dy / dist) * H * 0.5 * s.twist;
        vy[i] = (dx / dist) * H * 0.5 * s.twist;
        break;
      case "melt":
        vx[i] = 0;
        vy[i] = columnRand[colOf[i]] * s.drip * H * 0.2;
        break;
      default:
        vx[i] = (r1 - 0.5) * s.spread * H * 0.6;
        vy[i] = -(0.1 + 0.3 * r2) * s.spread * H;
    }
  };

  const pieceRadius = (i: number) => {
    const info = EFFECTS[settings.current.effect];
    const dot = info.shape === SHAPE.dot ? 0.6 + rand[i * 4 + 2] * 0.5 : 1;
    return cell * info.radius * dot * shrink[i];
  };

  // Loose pieces push each other apart. Pieces are sorted into a grid of buckets so each one only
  // checks its neighbours, not every other piece.
  let bucketStart = new Int32Array(0);
  let bucketItems = new Int32Array(0);
  const collide = (bounce: number) => {
    const maxR = cell * EFFECTS[settings.current.effect].radius * 1.1; // dots are at most 1.1
    const size = maxR * 2;
    const bw = Math.ceil(W / size) + 1;
    const bh = Math.ceil(H / size) + 1;
    const buckets = bw * bh;
    if (bucketStart.length < buckets + 1) bucketStart = new Int32Array(buckets + 1);
    if (bucketItems.length < count) bucketItems = new Int32Array(count);
    bucketStart.fill(0, 0, buckets + 1);
    const bucketOf = (i: number) => {
      const bx = Math.min(bw - 1, Math.max(0, Math.floor(px[i] / size)));
      const by = Math.min(bh - 1, Math.max(0, Math.floor(py[i] / size)));
      return by * bw + bx;
    };
    let free = 0;
    for (let i = 0; i < count; i++) {
      if (state[i] !== 1) continue;
      bucketStart[bucketOf(i) + 1]++;
      free++;
    }
    if (free < 2) return;
    for (let b = 0; b < buckets; b++) bucketStart[b + 1] += bucketStart[b];
    const fill = bucketStart.slice(0, buckets);
    for (let i = 0; i < count; i++) if (state[i] === 1) bucketItems[fill[bucketOf(i)]++] = i;

    for (let i = 0; i < count; i++) {
      if (state[i] !== 1) continue;
      const ri = pieceRadius(i);
      const bx = Math.min(bw - 1, Math.max(0, Math.floor(px[i] / size)));
      const by = Math.min(bh - 1, Math.max(0, Math.floor(py[i] / size)));
      for (let y = Math.max(0, by - 1); y <= Math.min(bh - 1, by + 1); y++) {
        for (let x = Math.max(0, bx - 1); x <= Math.min(bw - 1, bx + 1); x++) {
          const b = y * bw + x;
          for (let k = bucketStart[b]; k < bucketStart[b + 1]; k++) {
            const j = bucketItems[k];
            if (j <= i) continue;
            const dx = px[j] - px[i];
            const dy = py[j] - py[i];
            const min = ri + pieceRadius(j);
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min || d2 === 0) continue;
            const d = Math.sqrt(d2);
            const nx = dx / d;
            const ny = dy / d;
            const push = (min - d) / 2;
            px[i] -= nx * push;
            py[i] -= ny * push;
            px[j] += nx * push;
            py[j] += ny * push;
            const approach = (vx[j] - vx[i]) * nx + (vy[j] - vy[i]) * ny;
            if (approach < 0) {
              const impulse = (-(1 + bounce) * approach) / 2;
              vx[i] -= impulse * nx;
              vy[i] -= impulse * ny;
              vx[j] += impulse * nx;
              vy[j] += impulse * ny;
              spinRate[i] *= 0.9;
              spinRate[j] *= 0.9;
            }
          }
        }
      }
    }
  };

  // ---- Video ----
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true;
  const play = () => {
    if (!reduceMotion) video.play().catch(() => {});
  };
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      play();
      if (!frame) frame = requestAnimationFrame(render);
    } else {
      video.pause();
    }
  });
  intersectionObserver.observe(canvas);

  // ---- Frame loop ----
  let progress = callbacks.getProgress();
  let uploadedTime = -1;
  let ready = false;
  let frame = 0;
  let last = performance.now();
  const render = (now: number) => {
    frame = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    const s = settings.current;

    if (builtFor !== `${s.effect}|${s.pieceSize}|${s.physics}|${W}x${H}`) build();

    const target = callbacks.getProgress();
    progress = reduceMotion ? target : progress + (target - progress) * Math.min(1, dt * 8);
    callbacks.onProgress(progress);

    if (video.readyState >= video.HAVE_CURRENT_DATA && video.currentTime !== uploadedTime) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      uploadedTime = video.currentTime;
      if (!ready) {
        ready = true;
        callbacks.onReady();
      }
    }

    if (ready) {
      if (s.physics) simulate(progress, time, lastSim ? dt : 0);
      else scrub(progress, time, reduceMotion ? 0 : 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dynamic);

      // object-fit: cover — read the middle of the video that matches the canvas shape.
      const canvasAspect = W / H;
      const videoAspect = video.videoWidth / video.videoHeight;
      const scaleX = canvasAspect > videoAspect ? 1 : canvasAspect / videoAspect;
      const scaleY = canvasAspect > videoAspect ? videoAspect / canvasAspect : 1;
      const info = EFFECTS[s.effect];

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.res, W, H);
      gl.uniform2f(u.grid, cols, rows);
      gl.uniform1f(u.cell, cell);
      gl.uniform1f(u.extent, info.extent);
      gl.uniform2f(u.uvScale, scaleX, scaleY);
      gl.uniform2f(u.uvOffset, (1 - scaleX) / 2, (1 - scaleY) / 2);
      gl.uniform1f(u.shape, info.shape);
      gl.uniform1f(u.tab, s.tab);
      gl.uniform1f(u.glow, s.glow);
      gl.uniform1f(u.cracks, s.cracks);
      // Resting pieces first, loose pieces on top of them.
      gl.uniform1f(u.pass, 0);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.uniform1f(u.pass, 1);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    frame = requestAnimationFrame(render);
  };
  play();
  frame = requestAnimationFrame(render);

  return {
    /** Set where "click" origin breaks from, 0 to 1 across the canvas. */
    setClickPoint: (x: number, y: number) => {
      click = { x, y };
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      video.pause();
      // Free GPU objects but keep the context, so a Strict Mode remount can reuse it.
      gl.deleteTexture(videoTexture);
      gl.deleteTexture(cellTexture);
      gl.deleteBuffer(staticBuffer);
      gl.deleteBuffer(dynamicBuffer);
      gl.deleteProgram(program);
    },
  };
}

// A falling drop stretches along its path; a landed drop squashes flat.
function dropletShape(vx: number, vy: number, landed: boolean, morph: number, stretch: number) {
  if (landed) return { a: 0, sx: 1 + 0.35 * morph, sy: 1 - 0.3 * morph };
  const speed = Math.hypot(vx, vy);
  const k = 1 + stretch * Math.min(1.2, speed / 2500) * morph;
  return { a: Math.atan2(vy, vx) - Math.PI / 2, sx: 1 / Math.sqrt(k), sy: k };
}
