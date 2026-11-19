export function PullCordThumbnail() {
  return (
    <svg
      viewBox="0 0 500 250"
      className="w-full max-w-sm text-foreground"
      role="img"
      aria-label="A light-switch cord swinging from the ceiling, drawn as a chain of points"
    >
      <line x1="40" y1="20" x2="460" y2="20" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <rect x="236" y="14" width="28" height="10" rx="3" fill="currentColor" fillOpacity="0.3" />
      {/* The cord, swung a little to the right. */}
      <path
        d="M 250 20 Q 254 80 268 130 Q 280 170 300 196"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.75"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[
        [250, 20],
        [253, 58],
        [260, 96],
        [270, 132],
        [284, 166],
        [300, 196],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 5 : 4} fill={i === 0 ? "currentColor" : "#f97316"} />
      ))}
      <rect x="290" y="196" width="18" height="36" rx="9" fill="currentColor" transform="rotate(-38 300 196)" />
      {/* The rest position, dashed. */}
      <line x1="250" y1="20" x2="250" y2="200" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="4 6" strokeWidth="2" />
    </svg>
  );
}
