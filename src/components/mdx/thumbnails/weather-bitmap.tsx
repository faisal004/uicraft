"use client";

import { useEffect, useState } from "react";

import { Bitmap, CONDITIONS, Shell, wellStyle } from "@/components/mdx/weather-bitmap";

const STEP_MS = 2600;

export function WeatherBitmapThumbnail() {
  const [index, setIndex] = useState(0);
  const weather = CONDITIONS[index] ?? CONDITIONS[0];
  const chars = [...`${weather.temperature}°C`];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % CONDITIONS.length);
    }, STEP_MS);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div aria-hidden="true" style={{ containerType: "size" }} className="flex h-full w-full text-white">
      <Shell className="h-full w-full rounded-[1.35rem] p-[2.4cqh]">
        <div style={wellStyle} className="h-full rounded-[1rem] p-[0.7cqh]">
          <div className="flex h-full items-center rounded-[0.85rem] border border-black/70 bg-[radial-gradient(circle_at_78%_18%,#244360_0%,#12283b_42%,#091522_85%)] px-[5cqw] shadow-[inset_0_0_18px_rgba(0,0,0,0.5)]">
            <div className="flex w-full items-center justify-between gap-[5cqw]">
              <div className="min-w-0">
                <p className="mb-[2.6cqh] font-mono text-[clamp(8px,2.3cqh,10px)] uppercase tracking-[0.16em] text-white/50">
                  Current conditions
                </p>
                <div className="flex gap-[0.8cqw]">
                  {chars.map((character, glyphIndex) => (
                    <Bitmap key={glyphIndex} glyph={character} className="w-[clamp(18px,11cqh,46px)]" />
                  ))}
                </div>
                <p className="mt-[3cqh] text-[clamp(20px,8cqh,36px)] font-medium leading-none tracking-tight">
                  {weather.name}
                </p>
              </div>
              <div
                className={`${weather.color} shrink-0 transition-colors duration-300 motion-reduce:transition-none`}
              >
                <Bitmap glyph={weather.icon} className="w-[clamp(72px,46cqh,168px)]" />
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}
