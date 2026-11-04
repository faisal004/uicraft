import { AsciiWaveField } from "@/components/mdx/ascii-wave-field";

/**
 * Landing background — same core as the ASCII wave field craft.
 * The craft paints white glyphs on black; light mode inverts the canvas
 * (and rotates the hue back) so it reads as dark glyphs on white.
 */
export function DotField() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 invert hue-rotate-180 dark:opacity-100 dark:invert-0 dark:hue-rotate-0">
      <AsciiWaveField cellSize={13} speed={1} className="size-full" />
    </div>
  );
}
