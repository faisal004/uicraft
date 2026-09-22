import type { MetadataRoute } from "next";

import { getCraftContent } from "@/lib/content";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const crafts = getCraftContent();
  const publishedDates = crafts
    .map((craft) => craft.publishedAt)
    .filter((date): date is string => Boolean(date));
  const latestPublishedAt = publishedDates.sort().at(-1);

  return [
    {
      url: siteUrl.href,
      lastModified: latestPublishedAt,
      changeFrequency: "monthly",
      priority: 1,
      images: [new URL("/og.png", siteUrl).href],
    },
    {
      url: new URL("/craft", siteUrl).href,
      lastModified: latestPublishedAt,
      changeFrequency: "weekly",
      priority: 0.9,
      images: [new URL("/og.png", siteUrl).href],
    },
    ...crafts.map((craft) => ({
      url: new URL(`/craft/${craft.slug}`, siteUrl).href,
      lastModified: craft.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [new URL(`/craft/${craft.slug}/opengraph-image`, siteUrl).href],
    })),
  ];
}
