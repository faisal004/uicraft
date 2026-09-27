import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";

import { CanvasBasicsStep } from "@/components/course/canvas-basics";
import { CanvasPointerDemo, CanvasSizeDemo } from "@/components/course/canvas-course-demos";

export const metadata: Metadata = {
  title: "HTML Canvas Crash Course",
  description: "A hands-on path from a blank canvas to animation and pixel effects.",
  robots: { index: false, follow: false },
};

const lessons = [
  "The drawing surface",
  "Canvas size",
  "Coordinates",
  "Rectangles and color",
  "Paths and circles",
  "Text",
  "State and clearing",
  "Animation",
  "Pointer coordinates",
  "Pixels and particles",
];

const components = {
  CanvasBasicsStep,
  CanvasPointerDemo,
  CanvasSizeDemo,
  h2: (props: React.ComponentProps<"h2">) => <h2 className="mt-20 border-t border-foreground/15 pt-10 font-heading text-3xl font-semibold tracking-tight" {...props} />,
  h3: (props: React.ComponentProps<"h3">) => <h3 className="mt-8 font-heading text-xl font-medium" {...props} />,
  p: (props: React.ComponentProps<"p">) => <p className="mt-4 max-w-3xl text-base leading-8 text-foreground/75" {...props} />,
  ul: (props: React.ComponentProps<"ul">) => <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-6 leading-8 text-foreground/75" {...props} />,
  a: (props: React.ComponentProps<"a">) => <a className="text-blue-600 underline underline-offset-4" {...props} />,
  pre: (props: React.ComponentProps<"pre">) => <pre className="overflow-x-auto bg-[#0c0d10] px-5 py-5 text-sm leading-6 text-[#e6e6e2]" {...props} />,
};

export default function CanvasBasicsCoursePage() {
  const source = fs.readFileSync(path.join(process.cwd(), "src/content/courses/canvas-basics.mdx"), "utf8");

  return (
    <main className="min-h-dvh bg-(--craft-page) px-5 py-10 text-foreground sm:px-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="font-mono text-xs text-foreground/50 hover:text-foreground">UIcraft</Link>
        <header className="mt-16 border-b border-foreground/15 pb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-blue-600">Personal crash course · 10 short lessons</p>
          <h1 className="mt-5 font-heading text-5xl leading-tight sm:text-6xl">HTML Canvas, from zero</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-foreground/70">Start with one blank rectangle. Learn how its size, coordinates, drawing commands, animation loop, and pixels fit together. Then particle effects will make sense.</p>
        </header>
        <nav aria-label="Course lessons" className="mt-10 border border-foreground/15 p-5 sm:p-7">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-foreground/50">Your path</p>
          <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {lessons.map((lesson, index) => (
              <li key={lesson}><a href={`#lesson-${index + 1}`} className="text-sm text-foreground/75 hover:text-blue-600"><span className="mr-3 font-mono text-blue-600">{String(index + 1).padStart(2, "0")}</span>{lesson}</a></li>
            ))}
          </ol>
        </nav>
        <article className="pb-24">
          <MDXRemote
            source={source}
            components={components}
            options={{ mdxOptions: { rehypePlugins: [[rehypePrettyCode, { theme: "github-dark-default", keepBackground: false, defaultLang: "plaintext" }]] } }}
          />
        </article>
      </div>
    </main>
  );
}
