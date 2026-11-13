export function GenieVideoThumbnail() {
  return (
    <svg viewBox="0 0 500 250" className="w-full max-w-sm text-foreground" role="img" aria-label="A video sheet bending out of a blog cover into a small docked player">
      <defs>
        <linearGradient id="genie-video-thumb-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9563a" />
          <stop offset="0.5" stopColor="#3d2a6b" />
          <stop offset="1" stopColor="#2f9e6a" />
        </linearGradient>
      </defs>
      {/* Where the cover was, and the article lines below it. */}
      <rect x="110" y="22" width="200" height="112" rx="10" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 5" />
      <g fill="currentColor" opacity="0.18">
        <rect x="110" y="150" width="150" height="10" rx="3" />
        <rect x="110" y="172" width="200" height="6" rx="3" />
        <rect x="110" y="186" width="185" height="6" rx="3" />
        <rect x="110" y="200" width="196" height="6" rx="3" />
        <rect x="110" y="214" width="120" height="6" rx="3" />
      </g>
      {/* The sheet mid-fold: the trailing top-left still near the cover, the leading corner in the dock. */}
      <path
        d="M 130 40 Q 120 36 128 34 C 220 50 330 120 452 168 Q 462 172 460 182 L 458 220 Q 457 230 447 230 L 378 230 Q 370 230 364 226 C 280 190 190 150 128 118 Q 120 114 121 106 Z"
        fill="url(#genie-video-thumb-fill)"
      />
      <rect x="372" y="168" width="90" height="62" rx="10" fill="none" stroke="currentColor" strokeOpacity="0.45" />
    </svg>
  );
}
