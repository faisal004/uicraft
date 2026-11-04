import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { MdxPage } from "@/components/mdx/mdx-page";
import { getContentBySlug, getCraftContent } from "@/lib/content";
import { author, siteConfig, siteUrl } from "@/lib/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getCraftContent().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const document = getContentBySlug(slug);

  if (!document || document.kind !== "craft") {
    return {};
  }

  const title = document.seoTitle ?? document.title;

  return {
    title,
    description: document.description,
    keywords: [
      document.category,
      "interaction design",
      "UI animation",
      "frontend craft",
    ].filter((keyword): keyword is string => Boolean(keyword)),
    alternates: {
      canonical: `/craft/${document.slug}`,
    },
    openGraph: {
      type: "article",
      url: `/craft/${document.slug}`,
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
  const { slug } = await params;
  const document = getContentBySlug(slug);

  if (!document || document.kind !== "craft") {
    notFound();
  }

  const url = new URL(`/craft/${document.slug}`, siteUrl).href;

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
            image: new URL(`/craft/${document.slug}/opengraph-image`, siteUrl).href,
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
              name: "Craft",
              url: new URL("/craft", siteUrl).href,
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
