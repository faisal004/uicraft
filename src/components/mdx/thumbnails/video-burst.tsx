// A grid of video tiles on the left breaking apart into scattered dots on the right.
const TILES = (() => {
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tiles: { x: number; y: number; size: number; round: boolean; opacity: number; tone: number }[] = [];
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 22; col++) {
      // Burst grows from left (whole) to right (scattered).
      const t = Math.max(0, (col - 8) / 14);
      const angle = random() * Math.PI * 2;
      const reach = t * t * (20 + random() * 70);
      tiles.push({
        x: 60 + col * 14 + Math.cos(angle) * reach + t * 40,
        y: 41 + row * 14 + Math.sin(angle) * reach - t * t * 20,
        size: 14 - t * (6 + random() * 5),
        round: t > 0.15,
        opacity: 1 - t * 0.5 * random(),
        tone: row < 4 ? 0 : row < 6 ? 1 : 2,
      });
    }
  }
  return tiles;
})();

const COLORS = ["#8f8f94", "#4c5a3e", "#2f5a86"]; // mountain, trees, lake

export function VideoBurstThumbnail() {
  return (
    <svg viewBox="0 0 500 250" className="w-full max-w-sm" role="img" aria-label="A video breaking into tiles and scattering as particles">
      {TILES.map((tile, i) =>
        tile.round ? (
          <circle key={i} cx={tile.x} cy={tile.y} r={tile.size / 2} fill={COLORS[tile.tone]} fillOpacity={tile.opacity} />
        ) : (
          <rect
            key={i}
            x={tile.x - 7}
            y={tile.y - 7}
            width="14.5"
            height="14.5"
            fill={COLORS[tile.tone]}
            fillOpacity={tile.opacity}
          />
        ),
      )}
    </svg>
  );
}
