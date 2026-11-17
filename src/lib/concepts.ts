export type Concept = {
  slug: string;
  title: string;
  description: string;
  order: number;
};

/**
 * A concept is the main technique a craft is built with. A craft's URL is
 * `/craft/<concept>/<slug>`, so changing a craft's concept or a concept slug
 * changes URLs: add a redirect in next.config.ts when that happens.
 */
export const concepts: Concept[] = [
  {
    slug: "design-engineering",
    title: "Design engineering",
    description: "The small details that make an interface feel finished: shadows, easing, and feedback.",
    order: 1,
  },
  {
    slug: "css",
    title: "CSS",
    description: "Effects built from plain HTML elements, CSS animation, and browser transitions.",
    order: 2,
  },
  {
    slug: "svg",
    title: "SVG",
    description: "Vector shapes and paths animated on the page.",
    order: 3,
  },
  {
    slug: "canvas",
    title: "Canvas",
    description: "Pixels drawn by hand with the 2D canvas API: particles, bitmaps, and noise.",
    order: 4,
  },
  {
    slug: "webgl",
    title: "WebGL",
    description: "Shaders on the GPU for effects that bend and warp whole surfaces.",
    order: 5,
  },
];

export function getConcept(slug: string) {
  return concepts.find((concept) => concept.slug === slug);
}
