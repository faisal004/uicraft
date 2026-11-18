import type { Metadata } from "next";
import Link from "next/link";

import { VideoBurst } from "@/components/mdx/video-burst";

export const metadata: Metadata = {
  title: "Video Burst Demo",
  description: "A full-screen hero video that bursts into particles as you scroll down the page.",
  robots: { index: false, follow: false },
};

const sections = [
  {
    title: "First light",
    text: "Before the sun clears the ridge, the lake holds a perfect copy of the cliffs above it. Nothing moves except the cloud shadows sliding down the scree.",
  },
  {
    title: "The long way round",
    text: "A flat path circles the shore through larch and spruce. It takes about an hour if you stop for the views, and you will stop for the views.",
  },
  {
    title: "When the wind picks up",
    text: "By mid-morning the surface breaks into ripples and the reflection comes apart, a lot like the video at the top of this page did as you scrolled past it.",
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-[#07080b] text-white">
      <VideoBurst src="/burst-video-720.mp4" poster="/burst-video-poster.jpg" scroll="page" controls="full">
        <p className="font-mono text-xs tracking-[0.35em] text-white/75 uppercase">Above the treeline</p>
        <h1 className="mt-4 font-heading text-5xl text-balance sm:text-7xl md:text-8xl">Still water</h1>
        <p className="mt-5 max-w-md text-pretty text-base text-white/80 sm:text-lg">
          A mountain lake at dawn. Scroll and let the picture come apart.
        </p>
      </VideoBurst>

      <section className="relative mx-auto max-w-3xl px-6 pt-8 pb-32">
        <div className="grid gap-14">
          {sections.map((section, index) => (
            <article key={section.title} className="grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-[6rem_1fr]">
              <span className="font-mono text-xs text-white/40">0{index + 1}</span>
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl">{section.title}</h2>
                <p className="mt-3 text-pretty text-base leading-7 text-white/70 sm:text-lg sm:leading-8">{section.text}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-20 text-sm text-white/50">
          Scroll back up to put it together again, or{" "}
          <Link href="/craft/webgl/video-burst" className="text-white underline underline-offset-4">
            read how it works
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
