import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { MdxPage } from "@/components/mdx/mdx-page";
import { getContentBySlug } from "@/lib/content";
import { author, siteConfig, siteUrl } from "@/lib/site";

type Props = {
  params: Promise<{ concept: string; slug: string }>;
};

// The parent segment lists every craft; crafts without a write-up 404 here.
async function getWriteUp(params: Props["params"]) {
  const { concept, slug } = await params;
  const document = getContentBySlug(slug);

  if (!document || document.kind !== "craft" || document.concept !== concept || !document.howItWorksHref) {
    return undefined;
  }

  return document as typeof document & { howItWorksHref: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const document = await getWriteUp(params);

  if (!document) {
    return {};
  }

  const title = `How ${document.title} works`;
  const image = `${document.href}/opengraph-image`;

  return {
    title,
    description: document.description,
    alternates: {
      canonical: document.howItWorksHref,
    },
    openGraph: {
      type: "article",
      url: document.howItWorksHref,
      siteName: siteConfig.name,
      title: `${title} | UICraft`,
      description: document.description,
      modifiedTime: document.updatedAt,
      authors: [author.url],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | UICraft`,
      description: document.description,
      images: [image],
    },
  };
}

export default async function HowItWorksPage({ params }: Props) {
  const document = await getWriteUp(params);

  if (!document) {
    notFound();
  }

  const url = new URL(document.howItWorksHref, siteUrl).href;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: `How ${document.title} works`,
          description: document.description,
          url,
          mainEntityOfPage: url,
          image: new URL(`${document.href}/opengraph-image`, siteUrl).href,
          datePublished: document.publishedAt,
          dateModified: document.updatedAt,
          author,
          publisher: {
            "@type": "Organization",
            name: siteConfig.name,
            url: siteUrl.href,
          },
          about: { "@type": "CreativeWork", name: document.title, url: new URL(document.href, siteUrl).href },
        }}
      />
      <MdxPage document={document} view="how-it-works" />
    </>
  );
}
