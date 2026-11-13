import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";

import { CodeBlock } from "@/components/mdx/code-block";
import { CraftIndex } from "@/components/mdx/craft-index";
import { CraftBlock } from "@/components/mdx/craft-block";
import { PageToc, type TocItem } from "@/components/mdx/page-toc";
import { ShareButton } from "@/components/share-button";
import { mdxComponents } from "@/components/mdx/registry";
import type { ContentDocument } from "@/lib/content";

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
};

function stripMarkdown(text: string) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
}

function slugify(text: string) {
  return stripMarkdown(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

// Splits a craft body into the live demo (everything before the first h2),
// the optional `## Implementation` source, and the article that follows.
// Headings inside fenced code are ignored.
function splitCraftSections(body: string) {
  const lines = body.split("\n");
  const sections: { title: string; lines: string[] }[] = [];
  const preview: string[] = [];
  const toc: TocItem[] = [];
  let fence: string | undefined;

  for (const line of lines) {
    const fenceMatch = /^\s*(```|~~~)/.exec(line);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (line.trim().startsWith(fence)) fence = undefined;
    }

    const heading = fence ? null : /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (heading?.[1] === "##") sections.push({ title: heading[2], lines: [] });
    (sections.at(-1)?.lines ?? preview).push(line);

    const inImplementation = sections.at(-1)?.title.toLowerCase() === "implementation";
    if (heading && !inImplementation) {
      const title = stripMarkdown(heading[2]);
      toc.push({ id: slugify(title), title, depth: heading[1].length as 2 | 3 });
    }
  }

  const implementation = sections.find((section) => section.title.toLowerCase() === "implementation");
  const article = sections
    .filter((section) => section !== implementation)
    .map((section) => section.lines.join("\n"))
    .join("\n\n");

  return {
    preview: preview.join("\n").trim(),
    implementation: implementation?.lines.slice(1).join("\n").trim(),
    article: article.trim(),
    toc,
  };
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

export function MdxPage({ document }: { document: ContentDocument }) {
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
  const toc: TocItem[] = [{ id: "demo", title: "Demo", depth: 2 }, ...sections.toc];
  const publishedAt = document.publishedAt
    ? new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(`${document.publishedAt}T00:00:00`),
      )
    : undefined;

  return (
    <div className="min-w-0 px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
      <div className="mx-auto grid max-w-6xl gap-12 xl:grid-cols-[minmax(0,1fr)_13rem]">
        <article className="mx-auto w-full max-w-3xl min-w-0 pb-24">
          <header>
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-heading text-balance text-4xl leading-tight tracking-tight sm:text-[2.75rem]">
                {document.title}
              </h1>
              <ShareButton path={`/craft/${document.slug}`} />
            </div>
            <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-(--craft-muted)">
              {document.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
              <span className="border border-foreground/10 bg-(--craft-muted-surface) px-2 py-1">
                {document.category ?? "Study"}
              </span>
              {publishedAt ? (
                <time
                  dateTime={document.publishedAt}
                  className="border border-foreground/10 bg-(--craft-muted-surface) px-2 py-1 font-mono tabular-nums"
                >
                  {publishedAt}
                </time>
              ) : null}
            </div>
          </header>

          <CraftBlock
            preview={renderMdx(sections.preview)}
            code={sections.implementation ? renderMdx(sections.implementation) : undefined}
          />

          {sections.article ? renderMdx(sections.article) : null}
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-14">
            <PageToc items={toc} />
          </div>
        </aside>
      </div>
    </div>
  );
}
