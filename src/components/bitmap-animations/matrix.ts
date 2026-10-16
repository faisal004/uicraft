import type { DrawAnimation } from "./types";

const GLYPHS = [
  ["111", "101", "101", "101", "111"],
  ["010", "110", "010", "010", "111"],
  ["110", "001", "010", "100", "111"],
  ["111", "001", "011", "001", "111"],
  ["010", "101", "111", "101", "101"],
  ["110", "101", "110", "101", "110"],
  ["101", "101", "010", "101", "101"],
  ["010", "010", "111", "010", "010"],
];

export const drawMatrix: DrawAnimation = (context, size, frame) => {
  context.fillStyle = "#020907";
  context.fillRect(0, 0, size, size);

  const columns = Math.ceil(size / 5);
  for (let col = 0; col < columns; col++) {
    const speed = 1 + (col % 3);
    const head = (frame * speed + col * 19) % (size + 90) - 45;
    const length = 6 + (col % 6);

    for (let tail = 0; tail < length; tail++) {
      const y = head - tail * 7;
      if (y < -5 || y >= size) continue;
      const glyph = GLYPHS[(col * 11 + tail * 7 + Math.floor(frame / 5)) % GLYPHS.length];
      context.fillStyle = tail === 0 ? "#d9ffe5" : tail < 3 ? "#56f995" : tail < 6 ? "#18944e" : "#0c472b";
      for (let row = 0; row < 5; row++) {
        for (let bit = 0; bit < 3; bit++) {
          if (glyph[row][bit] === "1") context.fillRect(col * 5 + bit, y + row, 1, 1);
        }
      }
    }
  }
};
