import type { Metadata } from "next";

import { MainCharacter } from "@/components/mdx/main-character";

export const metadata: Metadata = {
  title: "Main Character Demo",
  description: "One figure walks slowly while the crowd rushes past.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <MainCharacter />
    </main>
  );
}
