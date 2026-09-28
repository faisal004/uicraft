"use client";

import { useEffect, useRef } from "react";

const WIDTH = 600;
const HEIGHT = 300;
const stages = ["Coordinates", "Rectangle", "Circle", "Text", "Animation", "Pixels"];

export function CanvasBasicsDemo({
  initialStep = 0,
}: {
  initialStep?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const step = initialStep;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let frame = 0;
    const started = performance.now();

    const draw = (time = 0) => {
      // A canvas keeps old drawings until you clear or cover them.
      context.clearRect(0, 0, WIDTH, HEIGHT);
      context.fillStyle = "#f8fafc";
      context.fillRect(0, 0, WIDTH, HEIGHT);

      context.strokeStyle = "#dce4ee";
      context.lineWidth = 1;
      for (let x = 0; x <= WIDTH; x += 50) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, HEIGHT);
        context.stroke();
      }
      for (let y = 0; y <= HEIGHT; y += 50) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(WIDTH, y);
        context.stroke();
      }
      context.fillStyle = "#64748b";
      context.font = "14px Arial";
      context.fillText("(0, 0)", 10, 22);
      context.fillText("x →", WIDTH - 42, 22);
      context.fillText("y ↓", 10, HEIGHT - 12);

      if (step >= 1 && step <= 3) {
        context.fillStyle = "#2563eb";
        context.fillRect(50, 65, 180, 100);
      }
      if (step >= 2 && step <= 3) {
        context.beginPath();
        context.arc(430, 115, 50, 0, Math.PI * 2);
        context.fillStyle = "#f59e0b";
        context.fill();
      }
      if (step === 3) {
        context.fillStyle = "#0f172a";
        context.font = "bold 44px Arial";
        context.fillText("Hello, canvas!", 150, 242);
      }
      if (step === 4) {
        const x = 80 + (Math.sin((time - started) / 700) + 1) * 200;
        context.beginPath();
        context.arc(x, 150, 34, 0, Math.PI * 2);
        context.fillStyle = "#2563eb";
        context.fill();
        frame = requestAnimationFrame(draw);
      }
      if (step === 5) {
        // An offscreen canvas lets us inspect the pixels of drawn text.
        const mask = document.createElement("canvas");
        mask.width = WIDTH;
        mask.height = HEIGHT;
        const maskContext = mask.getContext("2d");
        if (!maskContext) return;
        maskContext.fillStyle = "black";
        maskContext.font = "bold 110px Arial";
        maskContext.textAlign = "center";
        maskContext.textBaseline = "middle";
        maskContext.fillText("HELLO", WIDTH / 2, HEIGHT / 2);
        const pixels = maskContext.getImageData(0, 0, WIDTH, HEIGHT).data;
        context.fillStyle = "#2563eb";
        for (let y = 0; y < HEIGHT; y += 5) {
          for (let x = 0; x < WIDTH; x += 5) {
            if (pixels[(y * WIDTH + x) * 4 + 3] > 128) {
              context.fillRect(x, y, 3, 3);
            }
          }
        }
      }
    };

    draw(started);
    return () => cancelAnimationFrame(frame);
  }, [step]);

  return (
    <div style={{ border: "1px solid #dce4ee", background: "white", color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        aria-label={`Canvas example: ${stages[step]}`}
        role="img"
        style={{ display: "block", width: "100%", maxWidth: WIDTH, height: "auto", margin: "0 auto" }}
      >
        {stages[step]} canvas example.
      </canvas>
      <p style={{ margin: 0, borderTop: "1px solid #dce4ee", padding: "8px 12px", fontSize: 12, color: "#475569" }}>Live example: {stages[step]}</p>
    </div>
  );
}
