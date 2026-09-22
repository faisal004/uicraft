"use client";

import { RotateCcw } from "lucide-react";
import { type CSSProperties, useState } from "react";

import { CraftFrame, RangeControl } from "@/components/mdx/craft-controls";

const FLAG_SRC = "/india-flag.svg";

function Flag({
  columns = 24,
  billow = 0.8,
  stagger = 50,
  animated = true,
  uniform = false,
  showCuts = false,
  width = 192,
  height = 128,
}: {
  columns?: number;
  billow?: number;
  stagger?: number;
  animated?: boolean;
  uniform?: boolean;
  showCuts?: boolean;
  width?: number;
  height?: number;
}) {
  const friendlyWidth = Math.round(width / columns) * columns;
  const firstDelay = -columns * stagger;

  return (
    <span
      className="waving-flag"
      style={{ width: friendlyWidth, height, "--columns": columns } as CSSProperties}
      aria-hidden="true"
    >
      {Array.from({ length: columns }, (_, index) => (
        <span
          key={index}
          className={`waving-flag__column ${animated ? "is-waving" : ""} ${showCuts ? "border-r border-[#181916]/25 last:border-r-0" : ""}`}
          style={
            {
              "--billow": `${uniform ? billow : index * billow}px`,
              animationDelay: `${firstDelay + index * stagger}ms`,
            } as CSSProperties
          }
        >
          {/* The repeated image is clipped into one narrow vertical slice. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FLAG_SRC}
            alt=""
            className="waving-flag__slice"
            style={{ left: `${-index * 100}%` }}
          />
        </span>
      ))}
    </span>
  );
}

export function WavingFlagDemo() {
  return (
    <CraftFrame label="Waving flag" meta="24 columns">
      <div className="surface-grid grid min-h-72 place-items-center p-8">
        <Flag />
      </div>
    </CraftFrame>
  );
}

export function WavingFlagPlayground() {
  const [columns, setColumns] = useState(24);
  const [stagger, setStagger] = useState(50);
  const [billow, setBillow] = useState(0.8);

  const reset = () => {
    setColumns(24);
    setStagger(50);
    setBillow(0.8);
  };

  return (
    <CraftFrame label="Playground" meta="Cloth controls">
      <div className="surface-grid grid min-h-60 place-items-center border-b border-[#181916]/15 p-8">
        <Flag columns={columns} stagger={stagger} billow={billow} />
      </div>
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#595b55]">Break the wave on purpose. It is only three numbers.</p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-8 items-center gap-1.5 border border-[#181916]/15 bg-white px-2.5 text-xs text-[#595b55] hover:bg-[#eeeeeb]"
          >
            <RotateCcw className="size-3" aria-hidden="true" /> Reset
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <RangeControl label="Columns" value={columns} min={4} max={64} step={1} onChange={setColumns} />
          <RangeControl label="Stagger" value={stagger} min={0} max={120} step={5} unit="ms" onChange={setStagger} />
          <RangeControl label="Billow" value={billow} min={0} max={2} step={0.1} unit="px" onChange={setBillow} />
        </div>
      </div>
    </CraftFrame>
  );
}

export function WavingFlagStep({ step }: { step: number | string }) {
  const current = Number(step);
  const labels = ["One image", "Cut into columns", "Oscillate", "Stagger", "Billow"];

  return (
    <CraftFrame label={`Step ${current + 1} · ${labels[current] ?? "Flag"}`}>
      <div className="surface-grid grid min-h-48 place-items-center p-8">
        {current === 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={FLAG_SRC} alt="Flag of India" className="h-32 w-48" />
        ) : (
          <Flag
            animated={current >= 2}
            showCuts={current === 1}
            stagger={current >= 3 ? 50 : 0}
            billow={current >= 4 ? 0.8 : 10}
            uniform={current < 4}
          />
        )}
      </div>
    </CraftFrame>
  );
}

export function WavingFlagThumbnail() {
  return <Flag width={144} height={96} billow={0.55} stagger={45} />;
}
