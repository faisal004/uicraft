import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { MdxPage } from "@/components/mdx/mdx-page";
import { getContentBySlug, getCraftContent } from "@/lib/content";
import { getConcept } from "@/lib/concepts";
import { author, siteConfig, siteUrl } from "@/lib/site";

type Props = {
  params: Promise<{ concept: string; slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getCraftContent().map(({ concept, slug }) => ({ concept: concept!, slug }));
}

async function getCraft(params: Props["params"]) {
  const { concept, slug } = await params;
  const document = getContentBySlug(slug);

  if (!document || document.kind !== "craft" || document.concept !== concept) {
    return undefined;
  }

  return document;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const document = await getCraft(params);

  if (!document) {
    return {};
  }

  const title = document.seoTitle ?? document.title;

  return {
    title,
    description: document.description,
    keywords: [
      getConcept(document.concept!)?.title,
      document.category,
      "interaction design",
      "UI animation",
      "frontend craft",
    ].filter((keyword): keyword is string => Boolean(keyword)),
    alternates: {
      canonical: document.href,
    },
    openGraph: {
      type: "article",
      url: document.href,
      siteName: siteConfig.name,
      title: `${title} | UICraft`,
      description: document.description,
      publishedTime: document.publishedAt,
      modifiedTime: document.updatedAt,
      authors: [author.url],
      tags: document.category ? [document.category, "Interaction design"] : ["Interaction design"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | UICraft`,
      description: document.description,
    },
  };
}

export default async function CraftPage({ params }: Props) {
  const document = await getCraft(params);

  if (!document) {
    notFound();
  }

  const concept = getConcept(document.concept!)!;
  const conceptUrl = new URL(`/craft/${concept.slug}`, siteUrl).href;
  const url = new URL(document.href, siteUrl).href;

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: document.seoTitle ?? document.title,
            name: document.title,
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
            articleSection: document.category ?? "Interaction study",
            keywords: [document.category, "interaction design", "UI animation"].filter(Boolean),
            isPartOf: {
              "@type": "CollectionPage",
              name: concept.title,
              url: conceptUrl,
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "UICraft",
                item: siteUrl.href,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Craft",
                item: new URL("/craft", siteUrl).href,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: concept.title,
                item: conceptUrl,
              },
              {
                "@type": "ListItem",
                position: 4,
                name: document.title,
                item: url,
              },
            ],
          },
        ]}
      />
      <MdxPage document={document} />
    </>
  );
}
