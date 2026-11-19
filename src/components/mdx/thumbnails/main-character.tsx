// An isometric strip of path with a crowd of grey figures streaking past and
// one warm figure (yellow cap, orange hoodie) walking along the near edge.

// The path runs from (40, 215) to (400, 40); "across" steps toward the near edge.
const ALONG = { x: 360, y: -175 };
const ACROSS = { x: 70, y: 35 };
const at = (along: number, across: number) => ({
  x: 40 + along * ALONG.x + across * ACROSS.x,
  y: 215 + along * ALONG.y + across * ACROSS.y,
});

const CROWD = (() => {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 22 }, () => ({
    ...at(0.05 + random() * 0.9, 0.12 + random() * 0.5),
    dir: random() < 0.5 ? 1 : -1,
  })).sort((a, b) => a.y - b.y); // draw back to front
})();

const HERO = at(0.55, 0.78);

function Figure({ x, y, body, head, opacity = 1 }: { x: number; y: number; body: string; head: string; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <rect x="-3.5" y="-22" width="7" height="22" rx="3.5" fill={body} />
      <circle cx="0" cy="-25" r="4" fill={head} />
    </g>
  );
}

export function MainCharacterThumbnail() {
  // A step back along the path, used to trail ghost copies behind each walker.
  const step = { x: ALONG.x / 40, y: ALONG.y / 40 };
  return (
    <svg
      viewBox="0 0 500 250"
      className="w-full max-w-sm text-foreground"
      role="img"
      aria-label="One person walking slowly along a path while a crowd streaks past"
    >
      <path d="M 40 215 L 400 40 L 470 75 L 110 250 Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.25" />
      {CROWD.map((p, i) => (
        <g key={i} className="text-foreground">
          {[3, 2, 1].map((g) => (
            <Figure
              key={g}
              x={p.x - p.dir * g * step.x}
              y={p.y - p.dir * g * step.y}
              body="currentColor"
              head="currentColor"
              opacity={0.1 / g}
            />
          ))}
          <Figure x={p.x} y={p.y} body="currentColor" head="currentColor" opacity={0.45} />
        </g>
      ))}
      <Figure x={HERO.x} y={HERO.y} body="#f08a3c" head="#f2c94c" />
    </svg>
  );
}
