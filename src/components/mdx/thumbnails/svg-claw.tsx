export function SvgClawThumbnail() {
  return (
    <svg viewBox="0 0 500 250" className="w-full max-w-sm text-foreground" role="img" aria-label="Claw placing the dot in build it">
      <g fill="currentColor" fontFamily="var(--font-geist-sans), Arial, sans-serif" fontSize="72" fontWeight="800" letterSpacing="-2.5">
        <text x="115" y="162">bu</text><rect x="205" y="126" width="10" height="36" /><text x="221" y="162">ld it</text>
      </g>
      <circle cx="210" cy="107" r="5" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -50 107 H 179 M 179 107 L 193 94 L 205 99 M 179 107 L 193 120 L 205 115" />
        <circle cx="179" cy="107" r="5" fill="var(--craft-muted-surface)" />
      </g>
    </svg>
  );
}
