"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

// Mounts a preview only once it nears the viewport. Some previews render
// thousands of SVG dots, so leaving them out of the server HTML keeps the
// craft index small while the card text and links stay crawlable.
export function DeferredPreview({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "300px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid h-full w-full place-items-center">
      {visible ? children : null}
    </div>
  );
}
