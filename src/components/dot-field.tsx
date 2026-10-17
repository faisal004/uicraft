"use client";

import { useEffect, useState } from "react";

import { AsciiWaveField } from "@/components/mdx/ascii-wave-field";

function isDark() {
  return document.documentElement.classList.contains("dark");
}

/** Dark-mode landing background — same core as the ASCII wave field craft. */
export function DotField() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(isDark());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 hidden dark:block">
      {dark ? <AsciiWaveField cellSize={13} speed={1} className="size-full" /> : null}
    </div>
  );
}
