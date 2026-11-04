"use client";

import { Bell, X } from "lucide-react";
import { useRef, useState } from "react";

const LAYERS = 12;
const BLOCK = 2;

/** Split an element into masked copies and blow each one away. */
function dissolve(card: HTMLElement) {
  const stage = card.parentElement;
  const width = card.offsetWidth;
  const height = card.offsetHeight;
  if (!stage || !width || !height) return Promise.resolve();

  // Every 2px block goes to one layer, biased so the left edge leaves first.
  const masks = Array.from({ length: LAYERS }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context) context.fillStyle = "#fff";
    return { canvas, context };
  });
  for (let y = 0; y < height; y += BLOCK) {
    for (let x = 0; x < width; x += BLOCK) {
      const bias = (x / width) * 0.85 + Math.random() * 0.3;
      const layer = Math.min(LAYERS - 1, Math.floor(bias * LAYERS));
      masks[layer].context?.fillRect(x, y, BLOCK, BLOCK);
    }
  }

  const runs = masks.map(({ canvas }, index) => {
    const copy = card.cloneNode(true) as HTMLElement;
    const url = `url(${canvas.toDataURL()})`;
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("button").forEach((button) => button.setAttribute("tabindex", "-1"));
    Object.assign(copy.style, {
      position: "absolute",
      left: `${card.offsetLeft}px`,
      top: `${card.offsetTop}px`,
      width: `${width}px`,
      pointerEvents: "none",
      maskImage: url,
      maskSize: `${width}px ${height}px`,
    });
    copy.style.setProperty("-webkit-mask-image", url);
    copy.style.setProperty("-webkit-mask-size", `${width}px ${height}px`);
    stage.appendChild(copy);

    // Drift up and to the right, like dust caught in a breeze.
    const angle = -Math.PI / 4 + (Math.random() - 0.5) * 1.4;
    const distance = 40 + Math.random() * 50;
    const animation = copy.animate(
      [
        { opacity: 1, transform: "translate(0, 0) rotate(0deg)" },
        {
          opacity: 0,
          transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(${(Math.random() - 0.5) * 20}deg)`,
        },
      ],
      { duration: 900, delay: (index / LAYERS) * 700, easing: "ease-out", fill: "forwards" },
    );
    return animation.finished.finally(() => copy.remove());
  });

  return Promise.all(runs).then(() => undefined);
}

/**
 * Thanos Snap, used to dismiss a notification: closing it turns the card into
 * dust instead of just removing it. It comes back so you can snap it again.
 */
export function SnapDismiss() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"shown" | "gone">("shown");

  const dismiss = async () => {
    const card = cardRef.current;
    if (!card || state !== "shown") return;
    setState("gone");

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const run = dissolve(card);
      card.style.visibility = "hidden";
      await run;
    }
    card.style.visibility = "hidden";
    window.setTimeout(() => {
      card.style.visibility = "";
      card.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
        duration: 300,
        easing: "ease-out",
      });
      setState("shown");
    }, 900);
  };

  return (
    <div className="relative w-full max-w-64">
      <div
        ref={cardRef}
        className="flex items-start gap-2.5 rounded-xl border border-foreground/10 bg-(--craft-page) p-3 shadow-[0_2px_10px_rgb(0_0_0/0.08)]"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-(--craft-accent) text-white">
          <Bell className="size-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">Deploy finished</p>
          <p className="truncate text-[11px] text-foreground/50">uicraft.in is live · 2s ago</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notification"
          className="grid size-6 shrink-0 place-items-center rounded-md text-foreground/45 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-(--craft-accent)"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/40">
        {state === "shown" ? "Press × to snap it" : "Poof"}
      </p>
    </div>
  );
}
