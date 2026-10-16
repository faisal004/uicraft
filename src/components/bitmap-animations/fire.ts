import type { DrawAnimation } from "./types";

export const drawFire: DrawAnimation = (context, size, frame) => {
  context.fillStyle = "#080604";
  context.fillRect(0, 0, size, size);

  const cols = size;
  for (let x = 0; x < cols; x++) {
    const edge = 1 - Math.abs(x / (size - 1) - 0.5) * 1.7;
    const flicker =
      0.55 +
      0.25 * Math.sin(frame * 0.35 + x * 0.4) +
      0.2 * Math.sin(frame * 0.17 + x * 0.9);
    const height = Math.max(2, Math.round(edge * flicker * size * 0.78));

    for (let row = 0; row < height; row++) {
      const y = size - 1 - row;
      const t = row / height;
      const wobble = Math.sin(frame * 0.4 + x * 0.55 + row * 0.2) * (1 - t) * 1.2;
      const px = Math.round(x + wobble);
      if (px < 0 || px >= size) continue;

      context.fillStyle =
        t > 0.78
          ? "#fff4c2"
          : t > 0.55
            ? "#ffb347"
            : t > 0.32
              ? "#ff6a2b"
              : t > 0.14
                ? "#d1341b"
                : "#6a1a12";
      context.fillRect(px, y, 1, 1);
    }
  }

  context.fillStyle = "#1a120c";
  context.fillRect(0, size - Math.max(2, Math.floor(size * 0.06)), size, size);
  for (let i = 0; i < Math.floor(size / 3); i++) {
    const x = (i * 13 + frame) % size;
    const y = size - 2 - ((i * 5 + Math.floor(frame / 2)) % 4);
    context.fillStyle = i % 2 ? "#3a2a1c" : "#2a1c12";
    context.fillRect(x, y, 2, 1);
  }
};
