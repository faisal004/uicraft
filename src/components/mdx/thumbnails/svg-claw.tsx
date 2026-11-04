export function SvgClawThumbnail() {
  return (
    <svg viewBox="0 0 500 250" className="w-full max-w-sm text-foreground" role="img" aria-label="Two claws complete the i and t in build it">
      <g fill="currentColor" fontFamily="var(--font-geist-sans), Arial, sans-serif" fontSize="72" fontWeight="800" letterSpacing="-2.5">
        <text x="115" y="162">bu</text><rect x="205" y="126" width="10" height="36" /><text x="221" y="162">ld it</text>
      </g>
      <rect x="205" y="101" width="10" height="10" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 210 -30 V 68 M 210 68 L 194 84 L 204 101 M 210 68 L 226 84 L 216 101" />
        <circle cx="210" cy="68" r="5" fill="var(--craft-muted-surface)" />
        <path d="M 530 123 H 365 M 365 123 L 350 110 L 337 117 M 365 123 L 350 136 L 337 129" />
        <circle cx="365" cy="123" r="5" fill="var(--craft-muted-surface)" />
      </g>
    </svg>
  );
}
