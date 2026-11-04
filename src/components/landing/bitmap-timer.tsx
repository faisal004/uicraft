"use client";

import { useEffect, useState } from "react";

/** A 3×5 bitmap font: each glyph is five rows of three bits. */
const GLYPHS: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  ":": ["0", "1", "0", "1", "0"],
};

function format(seconds: number) {
  const minutes = Math.floor(seconds / 60) % 100;
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Bitmap display, used as a timer: counts how long you have been on the page,
 * with every digit drawn from a tiny grid of dots.
 */
export function BitmapTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const text = format(seconds);
  const columns: string[][] = [];
  for (const character of text) {
    const glyph = GLYPHS[character] ?? GLYPHS["0"];
    for (let x = 0; x < glyph[0].length; x++) columns.push(glyph.map((row) => row[x]));
    columns.push(["0", "0", "0", "0", "0"]);
  }
  columns.pop();

  return (
    <div className="flex w-full max-w-64 flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${columns.length} 5`}
        className="w-full"
        role="img"
        aria-label={`Time on this page: ${text}`}
      >
        {columns.flatMap((column, x) =>
          column.map((bit, y) => (
            <circle
              key={`${x}-${y}`}
              cx={x + 0.5}
              cy={y + 0.5}
              r={0.36}
              style={{ transitionDelay: `${(x + y) * 12}ms` }}
              className={`transition-[fill] duration-200 motion-reduce:transition-none ${bit === "1" ? "fill-foreground" : "fill-foreground/10"}`}
            />
          )),
        )}
      </svg>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/45">Time on this page</p>
    </div>
  );
}
