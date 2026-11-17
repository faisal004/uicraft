import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { CraftGrid } from "@/components/mdx/craft-index";
import { concepts, getConcept } from "@/lib/concepts";
import { getCraftsByConcept } from "@/lib/content";
import { siteConfig, siteUrl } from "@/lib/site";

type Props = {
  params: Promise<{ concept: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return concepts.map(({ slug }) => ({ concept: slug }));
}

function getGroup(slug: string) {
  return getCraftsByConcept().find((group) => group.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { concept: slug } = await params;
  const concept = getConcept(slug);

  if (!concept) {
    return {};
  }

  const title = `${concept.title} experiments`;

  return {
    title,
    description: concept.description,
    alternates: { canonical: `/craft/${concept.slug}` },
    openGraph: {
      type: "website",
      url: `/craft/${concept.slug}`,
      siteName: siteConfig.name,
      title: `${title} | UICraft`,
      description: concept.description,
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | UICraft`,
      description: concept.description,
      images: ["/twitter-image"],
    },
  };
}

export default async function ConceptPage({ params }: Props) {
  const { concept: slug } = await params;
  const concept = getConcept(slug);

  if (!concept) {
    notFound();
  }

  const crafts = getGroup(slug)?.crafts ?? [];
  const url = new URL(`/craft/${concept.slug}`, siteUrl).href;

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${concept.title} experiments`,
            description: concept.description,
            url,
            isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteUrl.href },
            hasPart: crafts.map((craft) => ({
              "@type": "TechArticle",
              headline: craft.seoTitle ?? craft.title,
              url: new URL(craft.href, siteUrl).href,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "UICraft", item: siteUrl.href },
              {
                "@type": "ListItem",
                position: 2,
                name: "Craft",
                item: new URL("/craft", siteUrl).href,
              },
              { "@type": "ListItem", position: 3, name: concept.title, item: url },
            ],
          },
        ]}
      />
      <div className="min-w-0 px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mx-auto max-w-6xl pb-24">
          <header className="max-w-3xl">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-foreground/50">
              <Link href="/craft" className="hover:text-(--craft-accent)">
                Craft
              </Link>
              <span aria-hidden="true"> / </span>
              <span>{concept.title}</span>
            </nav>
            <h1 className="font-heading text-balance text-4xl leading-tight tracking-tight sm:text-[2.75rem]">
              {concept.title}
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-(--craft-muted)">
              {concept.description}
            </p>
            <p className="mt-5 font-mono text-xs tabular-nums text-foreground/40">
              {String(crafts.length).padStart(2, "0")} studies
            </p>
          </header>
          <div className="mt-12">
            {crafts.length > 0 ? (
              <CraftGrid crafts={crafts} headingLevel="h2" />
            ) : (
              <p className="text-sm text-(--craft-muted)">New {concept.title} studies are on the way.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
