"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// A grid of small square cells over a blue gradient. Each cell fades between random brightnesses at its
// own pace, so the surface shimmers without any one dot drawing the eye. On hover, random tiles across the
// whole card blink on and off quickly. It's the same everywhere, so there's no spotlight following the pointer.
const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uCell;
uniform float uHover;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 cell = floor(px / uCell);
  vec2 local = fract(px / uCell);

  float seed = hash(cell);
  float t = uTime * (0.25 + seed * 0.6) + seed * 10.0;
  float step0 = floor(t);
  float a = hash(cell + step0 * 1.37);
  float b = hash(cell + (step0 + 1.0) * 1.37);
  float glow = pow(mix(a, b, smoothstep(0.0, 1.0, fract(t))), 3.0);

  // On hover, each cell re-rolls several times a second and about one in six is lit. No fade between
  // rolls, so the tiles snap on and off like a flicker rather than a glow.
  float roll = floor(uTime * (4.0 + seed * 6.0) + seed * 20.0);
  float flick = step(0.83, hash(cell + roll * 2.71)) * uHover;

  float square = step(0.16, local.x) * step(local.x, 0.84) * step(0.16, local.y) * step(local.y, 0.84);

  float mark = square * (0.035 + glow * 0.22 + flick * 0.3);

  vec2 uv = px / uRes;
  vec3 base = mix(vec3(0.14, 0.25, 0.80), vec3(0.22, 0.36, 0.94), uv.y);
  gl_FragColor = vec4(base + mark * vec3(0.75, 0.85, 1.0), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/**
 * A shimmering blue dot grid drawn with WebGL, sized to its parent. Hovering or focusing the parent makes
 * random tiles flicker. Without WebGL the parent's own background shows.
 */
export function DotField({ className, cell = 5 }: { className?: string; cell?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!canvas || !host || !gl) return;

    const program = gl.createProgram()!;
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uCell = gl.getUniformLocation(program, "uCell");
    const uHover = gl.getUniformLocation(program, "uHover");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = performance.now();
    let frame = 0;
    let hover = 0;
    let target = 0;

    const draw = () => {
      gl.uniform1f(uTime, reduced.matches ? 0 : (performance.now() - start) / 1000);
      gl.uniform1f(uHover, hover);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uCell, cell * dpr);
      draw();
    };

    // The shimmer is slow, so 30fps is plenty. Hover eases in and out with an exponential approach.
    let last = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < 33) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      hover += (target - hover) * (1 - Math.exp(-dt * (target > hover ? 4 : 7)));
      draw();
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(loop);
      else {
        hover = target;
        draw();
      }
    };

    const enter = () => {
      target = 1;
      if (reduced.matches) sync();
    };
    const focus = () => {
      if (host.matches(":focus-visible")) enter();
    };
    const leave = () => {
      if (host.matches(":hover, :focus-visible")) return;
      target = 0;
      if (reduced.matches) sync();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    sync();
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("focus", focus);
    host.addEventListener("blur", leave);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("focus", focus);
      host.removeEventListener("blur", leave);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [cell]);

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 size-full", className)} />;
}
