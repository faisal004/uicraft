"use client";

import dynamic from "next/dynamic";

// Three.js is heavy, so the scene loads after the rest of the landing page.
const MainCharacter = dynamic(() => import("@/components/mdx/main-character").then((m) => m.MainCharacter), {
  ssr: false,
});

/** The landing artwork, without the craft's controls. */
export function MainCharacterPlate() {
  return (
    <div className="absolute inset-0 bg-[#050505]" role="img" aria-label="A walker in a yellow cap moving through a busy park">
      <MainCharacter controls={false} zoom={1.6} />
    </div>
  );
}
