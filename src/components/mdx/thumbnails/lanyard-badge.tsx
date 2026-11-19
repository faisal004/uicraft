export function LanyardBadgeThumbnail() {
  return (
    <svg
      viewBox="0 0 500 250"
      className="w-full max-w-sm text-foreground"
      role="img"
      aria-label="An ID badge swinging from a lanyard strap"
    >
      <path d="M 250 -10 Q 252 40 262 78" fill="none" stroke="currentColor" strokeWidth="12" />
      <path d="M 250 -10 Q 252 40 262 78" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 4" />
      <g transform="rotate(-9 262 78)">
        <rect x="214" y="66" width="96" height="140" rx="9" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
        <rect x="255" y="60" width="14" height="22" rx="3" fill="currentColor" fillOpacity="0.45" />
        <rect x="226" y="94" width="72" height="62" rx="5" fill="currentColor" fillOpacity="0.2" />
        <rect x="226" y="166" width="50" height="7" rx="2" fill="currentColor" fillOpacity="0.55" />
        <rect x="226" y="179" width="36" height="5" rx="2" fill="currentColor" fillOpacity="0.3" />
      </g>
    </svg>
  );
}
