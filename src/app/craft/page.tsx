import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { MdxPage } from "@/components/mdx/mdx-page";
import { getContentBySlug, getCraftContent } from "@/lib/content";
import { author, siteConfig, siteUrl } from "@/lib/site";

const description =
  "Every UI animation and interaction rebuilt on UICraft, grouped by technique: design engineering, CSS, SVG, Canvas, and WebGL. Each one has source code and a tutorial.";

export const metadata: Metadata = {
  title: "UI Animation & Interaction Experiments",
  description,
  alternates: { canonical: "/craft" },
  openGraph: {
    type: "website",
    url: "/craft",
    siteName: siteConfig.name,
    title: "UI Animation & Interaction Experiments | UICraft",
    description,
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "UI Animation & Interaction Experiments | UICraft",
    description,
    images: ["/twitter-image"],
  },
};

export default function CraftPage() {
  const document = getContentBySlug("introduction");
  const crafts = getCraftContent();

  if (!document) {
    throw new Error("Introduction content is missing.");
  }

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Craft",
          url: new URL("/craft", siteUrl).href,
          description: document.description,
          isPartOf: {
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteUrl.href,
          },
          hasPart: crafts.map((craft) => ({
            "@type": "TechArticle",
            headline: craft.seoTitle ?? craft.title,
            description: craft.description,
            url: new URL(craft.href, siteUrl).href,
            image: new URL(`${craft.href}/opengraph-image`, siteUrl).href,
            datePublished: craft.publishedAt,
            dateModified: craft.updatedAt,
            author,
          })),
        }}
      />
      <MdxPage document={document} />
    </>
  );
}
