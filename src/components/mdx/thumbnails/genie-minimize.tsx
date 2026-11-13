export function GenieMinimizeThumbnail() {
  return (
    <svg viewBox="0 0 500 250" className="w-full max-w-sm text-foreground" role="img" aria-label="A window funnelling down into a slot in the dock">
      <defs>
        <linearGradient id="genie-minimize-thumb-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a5c" />
          <stop offset="0.5" stopColor="#8b5cff" />
          <stop offset="1" stopColor="#1e4fd6" />
        </linearGradient>
      </defs>
      {/* The window mid-minimise: full width at the top, pinched into the dock slot below. */}
      <path
        d="M 120 26 Q 120 18 128 18 L 312 18 Q 320 18 320 26 L 320 70 C 320 120 268 150 262 196 L 238 196 C 232 150 120 120 120 70 Z"
        fill="url(#genie-minimize-thumb-fill)"
      />
      <g fill="#fff" opacity="0.85">
        <circle cx="134" cy="30" r="4" />
        <circle cx="148" cy="30" r="4" />
        <circle cx="162" cy="30" r="4" />
      </g>
      {/* The dock with its icons. */}
      <rect x="110" y="200" width="280" height="38" rx="12" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <g fill="currentColor" opacity="0.2">
        <rect x="122" y="208" width="22" height="22" rx="6" />
        <rect x="152" y="208" width="22" height="22" rx="6" />
        <rect x="182" y="208" width="22" height="22" rx="6" />
        <rect x="296" y="208" width="22" height="22" rx="6" />
        <rect x="326" y="208" width="22" height="22" rx="6" />
        <rect x="356" y="208" width="22" height="22" rx="6" />
      </g>
      <rect x="236" y="206" width="28" height="26" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeDasharray="3 3" />
    </svg>
  );
}
