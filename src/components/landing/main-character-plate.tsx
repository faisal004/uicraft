"use client";

import dynamic from "next/dynamic";

// Three.js is heavy, so the scene loads after the rest of the landing page.
const MainCharacter = dynamic(() => import("@/components/mdx/main-character").then((m) => m.MainCharacter), {
  ssr: false,
});

/** The Main Character scene as a landing tile: no controls, zoomed in on the hero. */
export function MainCharacterPlate() {
  return (
    <div className="absolute inset-0 bg-[#050505]">
      <MainCharacter controls={false} zoom={1.6} />
    </div>
  );
}
