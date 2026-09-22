"use client";

import { useEffect, useRef } from "react";

const GLYPHS = " .,:;+=xX#@";

function makeField(width: number, height: number) {
  const columns = Math.ceil(width / 7);
  const rows = Math.ceil(height / 12);

  return Array.from({ length: rows }, () =>
    Array.from(
      { length: columns },
      () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    ).join(""),
  ).join("\n");
}

export function AsciiField() {
  const fieldRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    let frame = 0;
    const draw = () => {
      field.textContent = makeField(window.innerWidth, window.innerHeight);
    };
    const focus = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        field.style.setProperty("--ascii-x", `${event.clientX}px`);
        field.style.setProperty("--ascii-y", `${event.clientY}px`);
      });
    };

    draw();
    window.addEventListener("resize", draw);
    window.addEventListener("pointermove", focus, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", draw);
      window.removeEventListener("pointermove", focus);
    };
  }, []);

  return <pre ref={fieldRef} aria-hidden="true" className="ascii-field" />;
}
