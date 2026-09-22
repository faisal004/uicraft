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
  name: "UIcraft",
  title: "UIcraft — Interface interaction studies",
  description:
    "A personal playground for rebuilding memorable interface animations and interactions to understand what makes them feel right.",
  shortDescription:
    "Interface animation and interaction studies, rebuilt from scratch.",
  locale: "en_US",
} as const;
