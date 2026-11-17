import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { NextConfig } from "next";

const craftDirectory = path.join(process.cwd(), "src/content/craft");

/**
 * Crafts used to live at `/craft/<slug>`. They now live at
 * `/craft/<concept>/<slug>`. Old links, search results, and social cards keep
 * working through a permanent (308) redirect per craft, built from each
 * craft's frontmatter so a new craft never needs a manual entry.
 */
function legacyCraftRedirects() {
  return fs
    .readdirSync(craftDirectory)
    .filter((filename) => filename.endsWith(".mdx"))
    .flatMap((filename) => {
      const { data } = matter(fs.readFileSync(path.join(craftDirectory, filename), "utf8"));
      if (data.kind !== "craft" || !data.concept) return [];

      const slug = filename.replace(/\.mdx$/, "");
      return [
        {
          // `:rest*` also matches nothing, so this covers the page and its
          // opengraph-image / twitter-image routes.
          source: `/craft/${slug}/:rest*`,
          destination: `/craft/${data.concept}/${slug}/:rest*`,
          permanent: true,
        },
      ];
    });
}

const nextConfig: NextConfig = {
  async redirects() {
    return legacyCraftRedirects();
  },
};

export default nextConfig;
