export function LiquidGlassThumbnail() {
  return (
    <svg
      viewBox="0 0 500 250"
      className="w-full max-w-sm text-foreground"
      role="img"
      aria-label="A pill-shaped glass lens bending a striped page and splitting colour at its edge"
    >
      <defs>
        <clipPath id="liquid-glass-thumb-lens">
          <rect x="150" y="80" width="200" height="90" rx="45" />
        </clipPath>
      </defs>
      {/* The page: straight stripes. */}
      <g stroke="currentColor" strokeOpacity="0.22" strokeWidth="6">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={40 + i * 38} y1="30" x2={40 + i * 38} y2="220" />
        ))}
      </g>
      {/* Inside the lens: the same stripes, magnified and bowed near the rim, with colour fringes. */}
      <g clipPath="url(#liquid-glass-thumb-lens)">
        <rect x="150" y="80" width="200" height="90" fill="var(--craft-muted-surface, #f4f4f2)" />
        {Array.from({ length: 6 }, (_, i) => {
          const x = 165 + i * 34;
          const bow = (x - 250) * 0.18;
          return (
            <g key={i} strokeWidth="7" fill="none">
              <path d={`M ${x - 3} 75 Q ${x + bow - 3} 125 ${x - 3} 175`} stroke="#e0457b" strokeOpacity="0.55" />
              <path d={`M ${x + 3} 75 Q ${x + bow + 3} 125 ${x + 3} 175`} stroke="#118ab2" strokeOpacity="0.55" />
              <path d={`M ${x} 75 Q ${x + bow} 125 ${x} 175`} stroke="currentColor" strokeOpacity="0.4" />
            </g>
          );
        })}
      </g>
      <rect x="150" y="80" width="200" height="90" rx="45" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M 180 92 Q 200 86 240 86" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
