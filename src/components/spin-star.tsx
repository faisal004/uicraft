import type { CSSProperties } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

// One ray per band of the spectrum, so the burst reads as light split by a prism.
const RAYS = ["#ff5f6d", "#ff9f43", "#ffd93d", "#4ade80", "#38bdf8", "#a78bfa"];

/**
 * A star that spins and throws a prism burst when a parent with `star-trigger`
 * is hovered or keyboard-focused. Animations live in globals.css (`.spin-star`).
 */
export function SpinStar({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("spin-star", className)}
      style={{ "--star-size": `${size}px` } as CSSProperties}
    >
      {RAYS.map((color, index) => (
        <span
          key={color}
          className="spin-star__ray"
          style={{ "--ray-angle": `${index * 60 + 30}deg`, "--ray-color": color } as CSSProperties}
        />
      ))}
      <Star className="spin-star__icon" size={size} />
    </span>
  );
}
