import type { MetadataRoute } from "next";

import { getCraftContent, getCraftsByConcept } from "@/lib/content";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const crafts = getCraftContent();
  const publishedDates = crafts
    .map((craft) => craft.updatedAt)
    .filter((date): date is string => Boolean(date));
  const latestPublishedAt = publishedDates.sort().at(-1);

  return [
    {
      url: siteUrl.href,
      lastModified: latestPublishedAt,
      changeFrequency: "monthly",
      priority: 1,
      images: [new URL("/opengraph-image", siteUrl).href],
    },
    {
      url: new URL("/craft", siteUrl).href,
      lastModified: latestPublishedAt,
      changeFrequency: "weekly",
      priority: 0.9,
      images: [new URL("/opengraph-image", siteUrl).href],
    },
    ...getCraftsByConcept().map((group) => ({
      url: new URL(`/craft/${group.slug}`, siteUrl).href,
      lastModified: group.crafts
        .map((craft) => craft.updatedAt)
        .filter((date): date is string => Boolean(date))
        .sort()
        .at(-1),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...crafts.map((craft) => ({
      url: new URL(craft.href, siteUrl).href,
      lastModified: craft.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [new URL(`${craft.href}/opengraph-image`, siteUrl).href],
    })),
    ...crafts.flatMap((craft) =>
      craft.howItWorksHref
        ? [
            {
              url: new URL(craft.howItWorksHref, siteUrl).href,
              lastModified: craft.updatedAt,
              changeFrequency: "monthly" as const,
              priority: 0.7,
            },
          ]
        : [],
    ),
  ];
}
