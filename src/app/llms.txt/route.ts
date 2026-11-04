import { getCraftContent } from "@/lib/content";
import { author, siteConfig, siteUrl } from "@/lib/site";

export function GET() {
  const crafts = getCraftContent();

  const text = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description}`,
    "",
    `Made by ${author.name} (${author.url}). Each craft page has a live demo, one copy/paste component, and a beginner tutorial.`,
    "",
    "## Crafts",
    "",
    ...crafts.map(
      (craft) =>
        `- [${craft.seoTitle ?? craft.title}](${new URL(`/craft/${craft.slug}`, siteUrl).href}): ${craft.description}`,
    ),
    "",
    "## Optional",
    "",
    `- [RSS feed](${new URL("/feed.xml", siteUrl).href})`,
    `- [Sitemap](${new URL("/sitemap.xml", siteUrl).href})`,
    "",
  ].join("\n");

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
