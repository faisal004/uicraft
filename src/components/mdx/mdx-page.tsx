import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";

import { CodeBlock } from "@/components/mdx/code-block";
import { CraftIndex } from "@/components/mdx/craft-index";
import { CraftBlock } from "@/components/mdx/craft-block";
import { PageToc } from "@/components/mdx/page-toc";
import { ShareButton } from "@/components/share-button";
import { SupportCta, SupportLinks } from "@/components/support-cta";
import { mdxComponents } from "@/components/mdx/registry";
import Link from "next/link";
import { getConcept } from "@/lib/concepts";
import type { ContentDocument } from "@/lib/content";
import { slugify, splitCraftSections, type TocItem } from "@/lib/craft-sections";

export type CraftView = "craft" | "how-it-works";

function mdxLinkTarget(href?: string) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return {};
  return { target: "_blank" as const, rel: "noopener noreferrer" };
}

const components = {
  ...mdxComponents,
  CraftIndex,
  h2: (props: React.ComponentProps<"h2">) => (
    <h2
      id={slugify(textOf(props.children))}
      className="mt-16 scroll-mt-20 text-balance text-2xl font-medium tracking-tight sm:mt-20"
      {...props}
    />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3
      id={slugify(textOf(props.children))}
      className="mt-12 scroll-mt-20 text-balance text-lg font-medium text-foreground"
      {...props}
    />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mt-4 text-pretty text-[15px] leading-7 text-(--craft-muted)" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="text-(--craft-accent) underline decoration-(--craft-accent)/25 underline-offset-4 hover:decoration-(--craft-accent)"
      {...props}
      {...mdxLinkTarget(props.href)}
    />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-(--craft-muted)" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-(--craft-muted)" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="text-pretty" {...props} />,
  pre: CodeBlock,
};

const prettyCodeOptions = {
  theme: "github-dark-default",
  keepBackground: false,
  defaultLang: "plaintext",
  grid: false,
};

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

function renderMdx(source: string) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
        },
      }}
    />
  );
}

export function MdxPage({ document, view = "craft" }: { document: ContentDocument; view?: CraftView }) {
  if (document.kind === "introduction") {
    return (
      <div className="min-w-0 px-5 py-16 sm:px-10 sm:py-20 lg:px-14 xl:px-20">
        <article className="mx-auto max-w-7xl pb-24">
          <header className="border-b border-foreground/10 pb-16 sm:pb-24">
            <p className="text-sm text-(--craft-accent)">A living archive of interface studies</p>
            <h1 className="font-heading mt-8 max-w-5xl text-balance text-5xl leading-[0.98] sm:text-7xl lg:text-8xl">
              Small interactions, studied closely.
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-(--craft-muted) sm:text-xl sm:leading-9">
              {document.description}
            </p>
          </header>
          {renderMdx(document.body)}
        </article>
      </div>
    );
  }

  const sections = splitCraftSections(document.body);

  // The craft page is the demo and nothing else: no title, no chips, no tabs.
  // The write-up, when there is one, is linked from the sidebar.
  if (view === "craft") {
    return (
      <section id="demo" aria-labelledby="craft-title" className="craft-stage">
        <h1 id="craft-title" className="sr-only">
          {document.title}
        </h1>
        {renderMdx(sections.preview)}
      </section>
    );
  }

  const toc: TocItem[] = [{ id: "demo", title: "Demo", depth: 2 }, ...sections.toc];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <CraftHeader document={document} />
      <div className="min-w-0 px-4 py-10 sm:px-8 sm:py-12 lg:px-12">
        <div className={BODY_GRID}>
          <article className="mx-auto w-full max-w-3xl min-w-0 pb-24 [&>:first-child]:mt-0">
            <CraftBlock
              preview={renderMdx(sections.preview)}
              code={sections.implementation ? renderMdx(sections.implementation) : undefined}
            />
            {sections.article ? renderMdx(sections.article) : null}
            <SupportCta />
          </article>

          <aside className="hidden xl:block">
            <div className="sticky top-14">
              <PageToc items={toc} />
              <SupportLinks />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// The How it works page: an article column and, on wide screens, the "On this page" rail.
const BODY_GRID = "mx-auto grid max-w-6xl gap-12 xl:grid-cols-[minmax(0,1fr)_13rem]";

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

function CraftHeader({ document }: { document: ContentDocument }) {
  const concept = document.concept ? getConcept(document.concept) : undefined;
  const updatedAt = document.updatedAt
    ? dateFormat.format(new Date(`${document.updatedAt}T00:00:00`))
    : undefined;

  return (
    <header className="border-b border-foreground/10 px-4 py-6 sm:px-8 lg:px-12">
      {/* Same grid as the body below, so the title lines up with the article column. */}
      <div className={BODY_GRID}>
        <div className="mx-auto flex w-full max-w-3xl min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/55">
            {concept ? (
              <Link href={`/craft/${concept.slug}`} className="hover:text-(--craft-accent)">
                {concept.title}
              </Link>
            ) : null}
            <span aria-hidden="true">/</span>
            <Link href={document.href} className="hover:text-(--craft-accent)">
              {document.title}
            </Link>
            {updatedAt ? (
              <time dateTime={document.updatedAt} className="font-mono tabular-nums">
                Updated {updatedAt}
              </time>
            ) : null}
          </div>
          <h1 className="font-heading mt-2 text-balance text-2xl leading-tight tracking-tight sm:text-3xl">
            How {document.title} works
          </h1>
          <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-6 text-(--craft-muted)">
            {document.description}
          </p>
        </div>
        <ShareButton path={document.howItWorksHref ?? document.href} />
        </div>
      </div>
    </header>
  );
}
