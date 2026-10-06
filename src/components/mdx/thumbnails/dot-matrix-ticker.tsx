import { DotMatrixTicker } from "@/components/mdx/dot-matrix-ticker";

export function DotMatrixTickerThumbnail() {
  return (
    <DotMatrixTicker
      text="Dot matrix — Tailwind —"
      speed={1.1}
      color="#4ade80"
      className="pointer-events-none rounded-none"
    />
  );
}
