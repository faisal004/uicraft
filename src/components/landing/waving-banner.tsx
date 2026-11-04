import type { CSSProperties } from "react";

const COLUMNS = 20;
const WIDTH = 180;
const HEIGHT = 64;
const STAGGER = 55;

function BannerFace({ text }: { text: string }) {
  return (
    <span
      className="font-heading flex items-center justify-center bg-(--craft-accent) text-[22px] text-white"
      style={{ width: WIDTH, height: HEIGHT }}
    >
      {text}
    </span>
  );
}

/**
 * Waving Flag, used as a banner: the same label is sliced into columns and
 * each column bobs a little later than the one before, so it reads as cloth.
 */
export function WavingBanner({ text = "SHIP IT" }: { text?: string }) {
  const columnWidth = WIDTH / COLUMNS;

  return (
    <div className="flex items-start" role="img" aria-label={`A banner reading ${text}, waving`}>
      <span className="mt-[-10px] h-28 w-[3px] rounded-full bg-foreground/70" aria-hidden="true" />
      <span className="flex" style={{ width: WIDTH, height: HEIGHT }} aria-hidden="true">
        {Array.from({ length: COLUMNS }, (_, index) => (
          <span
            key={index}
            className="landing-wave__column relative h-full shrink-0 overflow-hidden"
            style={
              {
                width: columnWidth,
                // Columns further from the pole swing wider.
                "--wave": `${(index / COLUMNS) * 5}px`,
                animationDelay: `${-index * STAGGER}ms`,
                filter: `brightness(${1 - Math.sin((index / COLUMNS) * Math.PI * 2) * 0.08})`,
              } as CSSProperties
            }
          >
            <span className="absolute top-0" style={{ left: -index * columnWidth }}>
              <BannerFace text={text} />
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}
