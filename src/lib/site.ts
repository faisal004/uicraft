const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL ??
  "http://localhost:3000";

const normalizedUrl = configuredUrl.startsWith("http")
  ? configuredUrl
  : `https://${configuredUrl}`;

export const siteUrl = new URL(normalizedUrl);

export const siteConfig = {
  name: "UICraft",
  title: "UICraft | UI Animations & Interactions Rebuilt from Scratch",
  description:
    "Memorable UI animations and interactions rebuilt from scratch in React, CSS, and Canvas, each with a copy/paste component and a step-by-step tutorial.",
  shortDescription:
    "Interface animation and interaction studies, rebuilt from scratch.",
  locale: "en_US",
} as const;

export const author = {
  "@type": "Person",
  "@id": "https://faisalhusa.in/#person",
  name: "Faisal Husain",
  url: "https://faisalhusa.in",
  sameAs: ["https://github.com/faisal004"],
} as const;
