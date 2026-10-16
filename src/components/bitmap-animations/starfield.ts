import type { DrawAnimation } from "./types";

export const drawStarfield: DrawAnimation = (context, size, frame) => {
  context.fillStyle = "#03060f";
  context.fillRect(0, 0, size, size);

  const count = Math.max(28, Math.floor(size * 1.1));
  const cx = size / 2;
  const cy = size / 2;

  for (let i = 0; i < count; i++) {
    const angle = ((i * 47) % 360) * (Math.PI / 180);
    const seed = ((i * 97) % 1000) / 1000;
    const travel = ((frame * (0.8 + seed * 2.4) + seed * size * 2) % (size * 0.95)) / (size * 0.95);
    const radius = 1 + travel * travel * (size * 0.72);
    const x = Math.round(cx + Math.cos(angle) * radius);
    const y = Math.round(cy + Math.sin(angle) * radius);
    if (x < 0 || y < 0 || x >= size || y >= size) continue;

    const bright = travel > 0.75;
    const mid = travel > 0.4;
    context.fillStyle = bright ? "#ffffff" : mid ? "#9eb6ff" : "#3d4f7a";
    const streak = bright ? 2 + Math.floor(travel * 3) : 1;
    context.fillRect(x, y, streak, 1);
    if (bright) context.fillRect(x, y, 1, 1);
  }

  context.fillStyle = "#12182a";
  context.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3);
  context.fillStyle = "#6b7a9e";
  context.fillRect(Math.round(cx), Math.round(cy), 1, 1);
};
