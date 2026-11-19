"use client";

import { memo, useEffect, useRef, useState } from "react";

// Every character is a 5 × 7 tile of lights, written as 35 ones and zeros, read row by row.
const FONT: Record<string, string> = {
  " ": "00000000000000000000000000000000000",
  "0": "01110100011001110101110011000101110",
  "1": "00100011000010000100001000010001110",
  "2": "01110100010000100010001000100011111",
  "3": "11110000010000101110000010000111110",
  "4": "00010001100101010010111110001000010",
  "5": "11111100001000011110000010000111110",
  "6": "00110010001000011110100011000101110",
  "7": "11111000010001000100010000100001000",
  "8": "01110100011000101110100011000101110",
  "9": "01110100011000101111000010001001100",
  ":": "00000001000010000000001000010000000",
  A: "01110100011000111111100011000110001",
  B: "11110100011000111110100011000111110",
  C: "01110100011000010000100001000101110",
  D: "11110100011000110001100011000111110",
  E: "11111100001000011110100001000011111",
  F: "11111100001000011110100001000010000",
  G: "01110100011000010111100011000101111",
  H: "10001100011000111111100011000110001",
  I: "01110001000010000100001000010001110",
  J: "00111000100001000010000101001001100",
  K: "10001100101010011000101001001010001",
  L: "10000100001000010000100001000011111",
  M: "10001110111010110101100011000110001",
  N: "10001110011010110011100011000110001",
  O: "01110100011000110001100011000101110",
  P: "11110100011000111110100001000010000",
  Q: "01110100011000110001101011001001101",
  R: "11110100011000111110101001001010001",
  S: "01111100001000001110000010000111110",
  T: "11111001000010000100001000010000100",
  U: "10001100011000110001100011000101110",
  V: "10001100011000110001010100010000100",
  W: "10001100011000110101101011010101010",
  X: "10001100010101000100010101000110001",
  Y: "10001100010101000100001000010000100",
  Z: "11111000010001000100010001000011111",
};
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CELL_W = 5;
const CELL_H = 7;

// The board's columns, in character slots. One blank slot separates neighbouring columns, so
// every row is the same 40 equal tiles wide.
const COLUMNS = [
  { label: "Time", width: 5 },
  { label: "Destination", width: 12 },
  { label: "Flight", width: 6 },
  { label: "Gate", width: 4 },
  { label: "Remarks", width: 9 },
];
const SLOTS = COLUMNS.reduce((sum, column) => sum + column.width, 0) + COLUMNS.length - 1;
const ROWS = 7;
// The grid column each heading starts at (1-based), skipping the blank slot between columns.
const LABELS = COLUMNS.map((column, index) => ({
  ...column,
  start: COLUMNS.slice(0, index).reduce((sum, previous) => sum + previous.width + 1, 0) + 1,
}));

const TICK_MS = 2500; // one board minute passes every 2.5 seconds
const STAGGER_MS = 28; // delay between neighbouring tiles starting to shuffle
const SHUFFLE_MS = 360; // how long each tile shows random letters before it lands
const FRAME_MS = 70;

const AMBER = "#ffc233";
const OFF = "#262420";
const STATUS_COLOR: Record<string, string> = {
  "ON TIME": AMBER,
  BOARDING: "#5ee08a",
  "LAST CALL": "#ff7a45",
  DELAYED: "#ff4d4d",
  DEPARTED: "#7d7a72",
};

const DESTINATIONS = [
  "TOKYO", "LISBON", "NEW YORK", "SINGAPORE", "REYKJAVIK", "CAPE TOWN", "SEOUL", "MEXICO CITY",
  "NEW DELHI", "BERLIN", "LOS ANGELES", "ISTANBUL", "SYDNEY", "TORONTO", "DUBAI", "PARIS",
];
const AIRLINES = ["UC", "FN", "KA", "LX", "QR", "NZ"];

type Flight = { id: number; minute: number; destination: string; flight: string; gate: string; delayed: boolean };

// Deterministic made-up flights, so the board reads the same on every visit.
function makeFlight(id: number, minute: number): Flight {
  return {
    id,
    minute,
    destination: DESTINATIONS[id % DESTINATIONS.length],
    flight: `${AIRLINES[(id * 5) % AIRLINES.length]} ${String(100 + ((id * 137) % 900))}`,
    gate: `${"ABC"[id % 3]}${(id * 7) % 24 + 1}`,
    delayed: id % 6 === 4,
  };
}

function status(flight: Flight, now: number) {
  const departs = flight.minute + (flight.delayed ? 10 : 0);
  const until = departs - now;
  if (until <= 0) return "DEPARTED";
  if (until <= 4) return "LAST CALL";
  if (until <= 12) return "BOARDING";
  return flight.delayed ? "DELAYED" : "ON TIME";
}

function clock(minute: number) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(minute * 60_000),
  );
}

// Lay values into their columns, padding each to its width, with one blank slot between columns.
function line(values: string[]) {
  return values.map((value, index) => value.slice(0, COLUMNS[index].width).padEnd(COLUMNS[index].width)).join(" ");
}

// Builds the flights on screen at board time `now`: drop any that left two minutes ago and
// schedule new ones at the bottom so there are always ROWS of them.
function schedule(flights: Flight[], now: number) {
  const next = flights.filter((flight) => now - (flight.minute + (flight.delayed ? 10 : 0)) < 2);
  while (next.length < ROWS) {
    const last = next.at(-1);
    const id = last ? last.id + 1 : 0;
    next.push(makeFlight(id, (last?.minute ?? now) + 4 + ((id * 3) % 5)));
  }
  return next;
}

// Shuffle any tile whose character changed: show random letters for a moment, then land.
// Tiles start one after another from left to right, the way a split-flap board ripples.
function useFlap(target: string[]) {
  const [shown, setShown] = useState(target);
  const previous = useRef(target);
  const key = target.join("\n");

  useEffect(() => {
    const next = key.split("\n");
    const prior = previous.current;
    previous.current = next;
    // With reduced motion every tile lands on the first frame.
    const started = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? -Infinity : performance.now();
    const paint = () => {
      const elapsed = performance.now() - started;
      let pending = false;
      setShown(
        next.map((row, r) =>
          [...row]
            .map((goal, c) => {
              const from = prior[r]?.[c] ?? " ";
              if (from === goal) return goal;
              const start = (c + r * 2) * STAGGER_MS;
              if (elapsed >= start + SHUFFLE_MS) return goal;
              pending = true;
              if (elapsed < start) return from;
              return goal === " " && elapsed > start + SHUFFLE_MS * 0.6
                ? " "
                : CHARSET[Math.floor(Math.random() * CHARSET.length)];
            })
            .join(""),
        ),
      );
      return pending;
    };
    const timer = window.setInterval(() => {
      if (!paint()) window.clearInterval(timer);
    }, FRAME_MS);
    return () => window.clearInterval(timer);
  }, [key]);

  return shown;
}

const LedTile = memo(function LedTile({ glyph, color }: { glyph: string; color: string }) {
  return (
    <svg viewBox={`0 0 ${CELL_W} ${CELL_H}`} className="block w-full" focusable="false" aria-hidden="true">
      {Array.from({ length: CELL_W * CELL_H }, (_, dot) => (
        <circle
          key={dot}
          cx={(dot % CELL_W) + 0.5}
          cy={Math.floor(dot / CELL_W) + 0.5}
          r={0.38}
          fill={glyph[dot] === "1" ? color : OFF}
        />
      ))}
    </svg>
  );
});

function LedRow({ text, colors }: { text: string; colors: string[] }) {
  return (
    <div className="grid gap-x-[0.35cqi]" style={{ gridTemplateColumns: `repeat(${SLOTS}, minmax(0, 1fr))` }}>
      {[...text].map((character, index) => (
        <LedTile key={index} glyph={FONT[character] ?? FONT[" "]} color={colors[index] ?? AMBER} />
      ))}
    </div>
  );
}

export function DeparturesBoard({ className = "" }: { className?: string }) {
  // Board time in whole minutes since 1970. Null until mounted, so the server renders a dark board.
  const [now, setNow] = useState<number | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    let minute = Math.floor(Date.now() / 60_000) - 1;
    const advance = () => {
      minute += 1;
      setNow(minute);
      setFlights((current) => schedule(current, minute));
    };
    const first = window.setTimeout(advance, 0);
    const timer = window.setInterval(advance, TICK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const title = now === null ? " ".repeat(SLOTS) : `DEPARTURES${clock(now).padStart(SLOTS - 10)}`;
  const rows = Array.from({ length: ROWS }, (_, index) => {
    const flight = flights[index];
    if (!flight || now === null) return " ".repeat(SLOTS);
    return line([clock(flight.minute), flight.destination, flight.flight, flight.gate, status(flight, now)]);
  });
  const shown = useFlap([title, ...rows]);

  // Colours follow the target text, not the shuffling letters, so a row's colour is stable.
  const remarksStart = SLOTS - COLUMNS[COLUMNS.length - 1].width;
  const titleColors = Array.from({ length: SLOTS }, (_, i) => (i < 10 ? "#f4f1ea" : AMBER));
  const rowColors = rows.map((row) => {
    const color = STATUS_COLOR[row.slice(remarksStart).trim()] ?? AMBER;
    return Array.from({ length: SLOTS }, (_, i) => (i >= remarksStart ? color : AMBER));
  });

  return (
    <div
      className={`relative w-full bg-[#0b0a09] text-[#a39d90] ${className}`}
      style={{ containerType: "inline-size" }}
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <LedRow text={shown[0]} colors={titleColors} />
        <div
          className="mt-[3cqi] mb-[1.2cqi] grid font-mono text-[clamp(8px,1.1cqi,13px)] tracking-[0.14em] uppercase"
          style={{ gridTemplateColumns: `repeat(${SLOTS}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {LABELS.map((column) => (
            <span key={column.label} style={{ gridColumn: `${column.start} / span ${column.width}` }}>
              {column.label}
            </span>
          ))}
        </div>
        <div className="grid gap-y-[1.4cqi]">
          {shown.slice(1).map((row, index) => (
            <div key={index} className="border-t border-white/[0.06] pt-[1.4cqi]">
              <LedRow text={row} colors={rowColors[index]} />
            </div>
          ))}
        </div>
      </div>

      {/* Screen readers get the same board as a plain table. */}
      <table className="sr-only">
        <caption>Departures{now === null ? "" : `, ${clock(now)}`}</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.label} scope="col">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {now === null
            ? null
            : flights.map((flight) => (
                <tr key={flight.id}>
                  <td>{clock(flight.minute)}</td>
                  <td>{flight.destination}</td>
                  <td>{flight.flight}</td>
                  <td>{flight.gate}</td>
                  <td>{status(flight, now)}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
