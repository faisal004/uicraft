export function WordSwapClawThumbnail() {
  return (
    <svg viewBox="0 0 500 250" className="w-full max-w-sm text-foreground" role="img" aria-label="Claws lift a b out of the word and lower an s in">
      <g fill="currentColor" fontFamily="var(--font-geist-sans), Arial, sans-serif" fontSize="72" fontWeight="800" letterSpacing="-2.5">
        <text x="196" y="182">hip it</text>
        <text x="96" y="92" opacity="0.35">b</text>
        <text x="150" y="132">s</text>
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 116 -30 V 40 M 116 40 L 92 53 L 97 70 M 116 40 L 140 53 L 135 70" opacity="0.35" />
        <circle cx="116" cy="40" r="5" fill="var(--craft-muted-surface)" opacity="0.35" />
        <path d="M 169 -30 V 82 M 169 82 L 145 95 L 149 112 M 169 82 L 193 95 L 189 112" />
        <circle cx="169" cy="82" r="5" fill="var(--craft-muted-surface)" />
      </g>
    </svg>
  );
}
