import type { CSSProperties, ReactNode } from "react";

export function CraftFrame({
  label,
  meta,
  leading,
  children,
}: {
  label: string;
  meta?: string;
  leading?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="not-prose my-6 overflow-hidden border border-[#181916]/15 bg-white">
      <div className="flex items-center justify-between border-b border-[#181916]/15 bg-[#eeeeeb] px-4 py-2.5">
        <span className="flex items-center gap-2.5">
          {leading}
          <span className="font-heading text-xs text-[#181916]">{label}</span>
        </span>
        {meta ? <span className="font-mono text-[10px] text-[#696b64]">{meta}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function RangeControl({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  decimals,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  onChange: (value: number) => void;
}) {
  const progress = ((value - min) / (max - min)) * 100;
  const display = decimals === undefined ? String(value) : value.toFixed(decimals);

  return (
    <label className="grid gap-3 border border-[#181916]/15 bg-white p-3.5">
      <span className="flex items-center justify-between gap-4 text-xs">
        <span className="font-heading text-[#595b55]">{label}</span>
        <output className="min-w-16 border border-[#181916]/15 bg-white px-2 py-1 text-right font-mono text-[11px] tabular-nums text-[#181916]">
          {display}{unit}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--range-progress": `${progress}%` } as CSSProperties}
        className="h-1.5 w-full cursor-pointer appearance-none bg-[linear-gradient(to_right,#181916_0_var(--range-progress),#d8d8d4_var(--range-progress)_100%)] outline-none [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#181916]/30 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#181916]/30 [&::-webkit-slider-thumb]:bg-white focus-visible:ring-2 focus-visible:ring-[#1736f5]/25"
      />
      <span className="flex justify-between font-mono text-[9px] tabular-nums text-[#696b64]">
        <span>
          {decimals === undefined ? min : min.toFixed(decimals)}
          {unit}
        </span>
        <span>
          {decimals === undefined ? max : max.toFixed(decimals)}
          {unit}
        </span>
      </span>
    </label>
  );
}
