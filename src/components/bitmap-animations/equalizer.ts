import type { DrawAnimation } from "./types";

export const drawEqualizer: DrawAnimation = (context, size, frame) => {
  const sky = context.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, "#0a1020");
  sky.addColorStop(1, "#121828");
  context.fillStyle = sky;
  context.fillRect(0, 0, size, size);

  const bars = Math.max(8, Math.floor(size / 4));
  const gap = Math.max(1, Math.floor(size / 64));
  const width = Math.max(2, Math.floor((size - gap * (bars + 1)) / bars));
  const floor = size - Math.max(2, Math.floor(size * 0.08));

  for (let i = 0; i < bars; i++) {
    const wave =
      0.35 +
      0.35 * Math.sin(frame * 0.18 + i * 0.7) +
      0.25 * Math.sin(frame * 0.31 + i * 1.3) +
      0.15 * Math.sin(frame * 0.09 + i);
    const height = Math.max(2, Math.round(wave * (floor - 4)));
    const x = gap + i * (width + gap);
    const y = floor - height;

    for (let row = 0; row < height; row++) {
      const t = row / height;
      context.fillStyle =
        t > 0.82 ? "#ffe08a" : t > 0.55 ? "#5ce1a2" : t > 0.28 ? "#2f9eef" : "#3155d9";
      context.fillRect(x, y + row, width, 1);
    }

    context.fillStyle = "#d7e0ea";
    context.fillRect(x, y, width, 1);
  }

  context.fillStyle = "#1c2436";
  context.fillRect(0, floor, size, size - floor);
  context.fillStyle = "#3a455c";
  context.fillRect(0, floor, size, 1);
};
