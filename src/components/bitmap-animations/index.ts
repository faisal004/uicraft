import type { DrawAnimation } from "./types";

export const animations: {
  id: string;
  label: string;
  load: () => Promise<DrawAnimation>;
}[] = [
  {
    id: "rocket",
    label: "Rocket launch",
    load: async () => (await import("./rocket")).drawRocket,
  },
  {
    id: "matrix",
    label: "Matrix rain",
    load: async () => (await import("./matrix")).drawMatrix,
  },
  {
    id: "starfield",
    label: "Starfield",
    load: async () => (await import("./starfield")).drawStarfield,
  },
  {
    id: "equalizer",
    label: "Equalizer",
    load: async () => (await import("./equalizer")).drawEqualizer,
  },
  {
    id: "fire",
    label: "Fire",
    load: async () => (await import("./fire")).drawFire,
  },
];
