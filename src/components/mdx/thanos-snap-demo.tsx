"use client";

import { useEffect, useRef, useState } from "react";

type DustOptions = {
  duration: number;
  layers?: number;
  delay?: number;
  restore?: boolean;
};

// This function also powers the full-page search results example.
export function animateDust(
  content: HTMLElement,
  { duration, layers = 24, delay = 0, restore = false }: DustOptions,
) {
  const parent = content.parentElement;
  const width = Math.ceil(content.offsetWidth);
  const height = Math.ceil(content.offsetHeight);
  if (!parent || !width || !height) {
    return { animations: [] as Animation[], copies: [] as HTMLElement[] };
  }

  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.ceil(width * scale);
  const pixelHeight = Math.ceil(height * scale);
  const masks = Array.from({ length: layers }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    return canvas;
  });
  const contexts = masks.map((mask) => mask.getContext("2d"));
  contexts.forEach((context) => { if (context) context.fillStyle = "white"; });

  for (let y = 0; y < pixelHeight; y++) {
    for (let x = 0; x < pixelWidth; x++) {
      const index = Math.max(0, Math.min(layers - 1, Math.floor(
        layers * (0.1 + 0.8 * x / pixelWidth) + (Math.random() - 0.5) * layers / 6,
      )));
      contexts[index]?.fillRect(x, y, 1, 1);
    }
  }

  const copies: HTMLElement[] = [];
  const animations: Animation[] = [];
  masks.forEach((mask, index) => {
    const copy = content.cloneNode(true) as HTMLElement;
    const url = `url(${mask.toDataURL()})`;
    copy.dataset.dustLayer = "";
    copy.removeAttribute("data-snap-target");
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("a, button, input").forEach((item) => item.setAttribute("tabindex", "-1"));
    Object.assign(copy.style, {
      position: "absolute",
      inset: "0",
      width: `${width}px`,
      height: `${height}px`,
      visibility: "visible",
      pointerEvents: "none",
      maskImage: url,
      maskSize: `${width}px ${height}px`,
    });
    copy.style.setProperty("-webkit-mask-image", url);
    copy.style.setProperty("-webkit-mask-size", `${width}px ${height}px`);
    parent.appendChild(copy);

    const angle = (Math.random() - 0.5) * Math.PI * 2;
    const distance = 50 + Math.random() * 40;
    const scattered = {
      opacity: 0,
      transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(${(Math.random() - 0.5) * 15}deg)`,
    };
    const whole = { opacity: 1, transform: "translate(0, 0) rotate(0deg)" };
    animations.push(copy.animate(restore ? [scattered, whole] : [whole, scattered], {
      duration: 1_100,
      delay: delay + index / layers * duration,
      easing: "ease-out",
      fill: "both",
    }));
    copies.push(copy);
  });

  return { animations, copies };
}

export function ThanosSnapDemo() {
  const contentRef = useRef<HTMLDivElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"ready" | "dissolving" | "gone">("ready");

  useEffect(() => {
    const content = contentRef.current;
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      animationsRef.current.forEach((animation) => animation.cancel());
      content?.parentElement?.querySelectorAll("[data-dust-layer]").forEach((copy) => copy.remove());
    };
  }, []);

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
    contentRef.current?.parentElement?.querySelectorAll("[data-dust-layer]").forEach((copy) => copy.remove());
    if (contentRef.current) contentRef.current.style.visibility = "visible";
    setStatus("ready");
  };

  const snap = () => {
    const content = contentRef.current;
    if (!content || status !== "ready") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      content.style.visibility = "hidden";
      setStatus("gone");
      return;
    }
    const { animations, copies } = animateDust(content, { duration: 1_200 });
    if (!animations.length) return;
    animationsRef.current = animations;
    content.style.visibility = "hidden";
    setStatus("dissolving");
    timeoutRef.current = setTimeout(() => {
      copies.forEach((copy) => copy.remove());
      animationsRef.current = [];
      setStatus("gone");
    }, 1_200 + 1_100);
  };

  const gone = status === "gone";

  // No box of its own: the text inherits the page's colour, so it works on light and dark pages.
  return (
    <div style={{ width: "100%", maxWidth: 640, padding: 32, fontFamily: "Arial, sans-serif", color: "inherit" }}>
      <div style={{ position: "relative" }}>
        <div ref={contentRef}>
          <h3 style={{ margin: 0, fontSize: "clamp(2.25rem, 7vw, 4rem)", letterSpacing: "-0.04em", whiteSpace: "nowrap" }}>Thanos Snap</h3>
          <p style={{ margin: "20px 0 0", maxWidth: 560, fontSize: 17, lineHeight: 1.7, opacity: 0.7 }}>A single line and paragraph become tiny pieces of dust, then drift away from left to right.</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 32 }}>
        <button
          type="button"
          onClick={gone ? reset : snap}
          disabled={status === "dissolving"}
          style={{ border: "1px solid currentColor", borderRadius: 999, padding: "9px 18px", background: "transparent", color: "inherit", font: "inherit", fontSize: 14, cursor: "pointer", opacity: status === "dissolving" ? 0.4 : 1 }}
        >
          {gone ? "Bring it back" : "Snap"}
        </button>
        <span role="status" style={{ fontSize: 12, opacity: 0.55 }}>{gone ? "Gone." : status === "dissolving" ? "Dissolving…" : ""}</span>
      </div>
    </div>
  );
}
