import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { MdxPage } from "@/components/mdx/mdx-page";
import { getContentBySlug, getCraftContent } from "@/lib/content";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Craft",
  description: "A growing collection of rebuilt interface interactions and animations.",
  alternates: { canonical: "/craft" },
  openGraph: {
    type: "website",
    url: "/craft",
    siteName: siteConfig.name,
    title: "Craft | UIcraft",
    description: "A growing collection of rebuilt interface interactions and animations.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "UIcraft — interface interaction studies rebuilt from scratch",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Craft | UIcraft",
    description: "A growing collection of rebuilt interface interactions and animations.",
    images: ["/og.png"],
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
            "@type": "Article",
            headline: craft.title,
            description: craft.description,
            url: new URL(`/craft/${craft.slug}`, siteUrl).href,
          })),
        }}
      />
      <MdxPage document={document} />
    </>
  );
}
