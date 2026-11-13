import type { Metadata } from "next";

import { ScrollReelMorph } from "@/components/scroll-reel-morph";

export const metadata: Metadata = {
  title: "Scroll Reel Morph Demo",
  description: "A blog post whose cover video folds into a docked mini player as you scroll.",
  robots: { index: false, follow: false },
};

const paragraphs = [
  "Paint poured onto a still surface never settles where you expect. Heavier pigments sink and push the lighter ones outward, and for a few seconds the whole tray looks like weather seen from orbit.",
  "That is the clip at the top of this page. It is ten seconds of acrylic, water and a little silicone oil, filmed from above and looped. It is not much on its own, but it makes a good test for motion on the web, because every frame is busy and any jank shows immediately.",
  "Scroll a little and the video lets go of the cover. The corner nearest the bottom of the screen leaves first and the rest of the sheet follows, stretching on the way, until the whole thing lands in the small player in the corner. Scroll back up and it unfolds again.",
  "Nothing about the page layout changes while that happens. The cover is an empty box that keeps its space, and the mini player is another empty box pinned to the corner. A single WebGL plane reads both boxes every frame and is drawn between them.",
  "The bend comes from giving every point on the plane its own slightly delayed copy of the scroll position. Points near the leading corner are almost on time; points near the far corner run late. Because the delay changes smoothly across the surface, the edges curve instead of folding.",
  "Rounded corners are the part that is easy to get wrong. If the radius is worked out from the size the plane is heading towards, the corners smear while it is stretched. Measuring the distance to each edge in real screen pixels keeps every corner the same size the whole way down.",
  "The video itself is a plain muted element that never touches the page. Each frame it is uploaded as a texture and cropped like object-fit: cover, recalculated for whatever shape the plane happens to be at that moment, so the footage never squashes.",
  "If you have reduced motion turned on, the footage holds on a single frame. The fold still follows your scroll, because that movement is something you are doing yourself rather than something the page does to you.",
  "When the player is docked it becomes a button. Click it, or tab to it and press Enter, and the page scrolls back to the top so the video can open out into the cover again.",
  "That is the whole trick: two invisible boxes, one plane, and a delay that varies across the surface. The rest is choosing footage worth watching in a small window while someone reads.",
];

export default function Page() {
  return (
    <main className="min-h-screen bg-(--craft-page) text-foreground">
      {/* "Colours In Motion" from Pexels (pexels.com/video/5914207), Pexels License: free to use. */}
      <ScrollReelMorph src="/reel.mp4">
        <article className="mx-auto max-w-2xl px-6 pt-12 pb-40 sm:pt-16">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-(--craft-muted)">Motion notes · 4 min read</p>
          <h1 className="font-heading mt-5 text-balance text-4xl leading-[1.05] sm:text-6xl">
            Weather in a paint tray
          </h1>
          <p className="mt-6 text-pretty text-lg leading-8 text-(--craft-muted)">
            A cover video that folds itself into the corner while you read.
          </p>
          <div className="mt-10 space-y-6 text-pretty text-base leading-8 text-foreground/85 sm:text-[17px]">
            {paragraphs.map((text) => (
              <p key={text.slice(0, 24)}>{text}</p>
            ))}
          </div>
        </article>
      </ScrollReelMorph>
    </main>
  );
}
