import type { DrawAnimation } from "./types";

export const drawRocket: DrawAnimation = (context, size, frame) => {
  const tick = frame % 96;
  const lift = tick < 10 ? 0 : Math.round((Math.min(tick - 10, 65) / 65) ** 1.35 * 96);
  const launched = tick >= 10;

  context.save();
  context.scale(size / 64, size / 64);

  const sky = context.createLinearGradient(0, 0, 0, 64);
  sky.addColorStop(0, "#071226");
  sky.addColorStop(1, "#174568");
  context.fillStyle = sky;
  context.fillRect(0, 0, 64, 64);

  for (let i = 0; i < 30; i++) {
    const x = (i * 23 + 7) % 64;
    const y = (i * 17 + 5) % 43;
    context.fillStyle = (i + Math.floor(frame / 6)) % 5 === 0 ? "#ffffff" : "#7599b6";
    context.fillRect(x, y, 1, 1);
  }

  context.fillStyle = "#14273d";
  context.fillRect(0, 54, 64, 10);
  context.fillStyle = "#354a5b";
  context.fillRect(0, 54, 64, 2);
  context.fillStyle = "#607b8a";
  context.fillRect(23, 52, 18, 3);
  context.fillStyle = "#253c51";
  context.fillRect(8, 29, 2, 25);
  for (let y = 31; y < 52; y += 5) context.fillRect(8, y, 9, 1);

  if (launched && tick < 85) {
    const spread = Math.min(18, Math.floor((tick - 10) / 3));
    for (let i = 0; i < 7; i++) {
      const x = 32 + (i - 3) * spread * 0.65;
      const y = 55 + ((i * 3 + frame) % 5);
      context.fillStyle = i % 2 ? "#b9c9c9" : "#e0e6db";
      context.beginPath();
      context.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
      context.fill();
    }
  }

  if (tick <= 75) {
    context.save();
    context.translate(32, 43 - lift);

    if (launched) {
      const flame = 10 + (frame % 3) * 2;
      context.fillStyle = "#f05a31";
      context.beginPath();
      context.moveTo(-4, 8);
      context.lineTo(0, 8 + flame);
      context.lineTo(4, 8);
      context.fill();
      context.fillStyle = "#ffe371";
      context.beginPath();
      context.moveTo(-2, 8);
      context.lineTo(0, 5 + flame);
      context.lineTo(2, 8);
      context.fill();
    }

    context.fillStyle = "#071b2d";
    context.fillRect(-6, -17, 12, 25);
    context.fillStyle = "#e8eee8";
    context.fillRect(-5, -17, 10, 23);
    context.fillStyle = "#b9d0d5";
    context.fillRect(2, -16, 3, 20);
    context.fillStyle = "#f35b48";
    context.beginPath();
    context.moveTo(-5, -17);
    context.lineTo(0, -27);
    context.lineTo(5, -17);
    context.fill();
    context.fillStyle = "#f35b48";
    context.beginPath();
    context.moveTo(-5, -2);
    context.lineTo(-10, 8);
    context.lineTo(-5, 6);
    context.moveTo(5, -2);
    context.lineTo(10, 8);
    context.lineTo(5, 6);
    context.fill();
    context.fillStyle = "#173b58";
    context.beginPath();
    context.arc(0, -10, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#64d5e6";
    context.beginPath();
    context.arc(-1, -11, 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f35b48";
    context.fillRect(-5, 2, 10, 2);
    context.restore();
  }

  context.restore();
};
