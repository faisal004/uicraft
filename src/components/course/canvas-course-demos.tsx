"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

export function CanvasSizeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [height, setHeight] = useState(150);
  const [matchBuffer, setMatchBuffer] = useState(false);
  const [buffer, setBuffer] = useState({ width: 300, height: 150 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const dpr = matchBuffer ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(300 * dpr);
    canvas.height = Math.round((matchBuffer ? height : 150) * dpr);
    setBuffer({ width: canvas.width, height: canvas.height });
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = "#eff6ff";
    context.fillRect(0, 0, 300, matchBuffer ? height : 150);
    context.fillStyle = "#2563eb";
    context.beginPath();
    context.arc(150, 75, 42, 0, Math.PI * 2);
    context.fill();
  }, [height, matchBuffer]);

  return (
    <div className="not-prose my-6 border border-foreground/15 p-4">
      <div className="flex min-h-72 items-start justify-center overflow-x-auto bg-white p-2">
        <canvas
          ref={canvasRef}
          width={300}
          height={150}
          style={{ width: 300, height, flex: "none" }}
          role="img"
          aria-label={matchBuffer ? "A circular shape on a correctly sized canvas" : "A shape stretched by CSS canvas sizing"}
        />
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <label className="flex items-center gap-3">
          CSS height: {height}px
          <input type="range" min="150" max="270" step="30" value={height} onChange={(event) => setHeight(Number(event.target.value))} className="min-w-0 flex-1" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={matchBuffer} onChange={(event) => setMatchBuffer(event.target.checked)} />
          Match the drawing buffer to the displayed size
        </label>
        <p className="text-foreground/60">Drawing buffer: {buffer.width} × {buffer.height} pixels. CSS display: 300 × {height} pixels.</p>
      </div>
    </div>
  );
}

export function CanvasPointerDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [point, setPoint] = useState({ x: 300, y: 150 });

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.fillStyle = "#eff6ff";
    context.fillRect(0, 0, 600, 300);
    context.strokeStyle = "#bfd3f7";
    context.beginPath();
    context.moveTo(point.x, 0);
    context.lineTo(point.x, 300);
    context.moveTo(0, point.y);
    context.lineTo(600, point.y);
    context.stroke();
    context.fillStyle = "#2563eb";
    context.beginPath();
    context.arc(point.x, point.y, 12, 0, Math.PI * 2);
    context.fill();
  }, [point]);

  function move(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const box = canvas.getBoundingClientRect();
    setPoint({
      x: Math.round(((event.clientX - box.left) * canvas.width) / box.width),
      y: Math.round(((event.clientY - box.top) * canvas.height) / box.height),
    });
  }

  return (
    <div className="not-prose my-6 border border-foreground/15 bg-white">
      <canvas ref={canvasRef} width={600} height={300} onPointerMove={move} className="block h-auto w-full touch-none" role="img" aria-label="Move the pointer here to see its canvas coordinates" />
      <p className="border-t border-foreground/15 px-4 py-3 font-mono text-sm text-slate-700">Move over the canvas: x = {point.x}, y = {point.y}</p>
    </div>
  );
}
