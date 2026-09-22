import { getCraftContent } from "@/lib/content";
import { siteConfig, siteUrl } from "@/lib/site";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function GET() {
  const crafts = getCraftContent();
  const latestDate = crafts
    .map((craft) => craft.publishedAt)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);

  const items = crafts
    .map((craft) => {
      const url = new URL(`/craft/${craft.slug}`, siteUrl).href;
      const publicationDate = craft.publishedAt
        ? new Date(`${craft.publishedAt}T00:00:00Z`).toUTCString()
        : undefined;

      return [
        "<item>",
        `<title>${escapeXml(craft.title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `<description>${escapeXml(craft.description)}</description>`,
        publicationDate ? `<pubDate>${publicationDate}</pubDate>` : "",
        craft.category ? `<category>${escapeXml(craft.category)}</category>` : "",
        "</item>",
      ].join("");
    })
    .join("");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `<title>${escapeXml(siteConfig.name)}</title>`,
    `<link>${escapeXml(siteUrl.href)}</link>`,
    `<description>${escapeXml(siteConfig.description)}</description>`,
    '<language>en</language>',
    `<atom:link href="${escapeXml(new URL("/feed.xml", siteUrl).href)}" rel="self" type="application/rss+xml" />`,
    latestDate
      ? `<lastBuildDate>${new Date(`${latestDate}T00:00:00Z`).toUTCString()}</lastBuildDate>`
      : "",
    items,
    "</channel>",
    "</rss>",
  ].join("");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
