import { CanvasBasicsStep } from "@/components/course/canvas-basics";
import { CanvasPointerDemo, CanvasSizeDemo } from "@/components/course/canvas-course-demos";

function mdxLinkTarget(href?: string) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return {};
  return { target: "_blank" as const, rel: "noopener noreferrer" };
}

// Register interactive lesson demos here when a new course needs them.
export const courseComponents = {
  CanvasBasicsStep,
  CanvasPointerDemo,
  CanvasSizeDemo,
  h2: (props: React.ComponentProps<"h2">) => <h2 className="mt-12 border-t border-foreground/15 pt-8 font-heading text-2xl font-semibold" {...props} />,
  h3: (props: React.ComponentProps<"h3">) => <h3 className="mt-8 font-heading text-xl font-medium" {...props} />,
  p: (props: React.ComponentProps<"p">) => <p className="mt-4 max-w-3xl text-base leading-8 text-foreground/75" {...props} />,
  ul: (props: React.ComponentProps<"ul">) => <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-6 leading-8 text-foreground/75" {...props} />,
  a: (props: React.ComponentProps<"a">) => (
    <a className="text-blue-600 underline underline-offset-4" {...props} {...mdxLinkTarget(props.href)} />
  ),
  pre: (props: React.ComponentProps<"pre">) => <pre className="overflow-x-auto bg-[#0c0d10] px-5 py-5 text-sm leading-6 text-[#e6e6e2]" {...props} />,
};
