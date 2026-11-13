import type { Metadata } from "next";

import { ScrollReelMorph } from "@/components/scroll-reel-morph";

export const metadata: Metadata = {
  title: "Scroll Reel Morph Demo",
  description: "A WebGL plane that bends from a small card into a full-screen frame as you scroll.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ScrollReelMorph />;
}
