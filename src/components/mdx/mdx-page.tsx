import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";

import { CodeBlock } from "@/components/mdx/code-block";
import { CraftIndex } from "@/components/mdx/craft-index";
import { CraftTabs } from "@/components/mdx/craft-tabs";
import { ShareButton } from "@/components/share-button";
import { mdxComponents } from "@/components/mdx/registry";
import type { ContentDocument } from "@/lib/content";

const components = {
  ...mdxComponents,
  CraftIndex,
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="mt-16 text-balance text-3xl font-medium sm:mt-24 sm:text-4xl" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="mt-10 text-balance text-lg font-medium text-foreground" {...props} />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mt-4 max-w-2xl text-pretty text-base leading-8 text-[var(--craft-muted)]" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a className="text-[var(--craft-accent)] underline decoration-[var(--craft-accent)]/25 underline-offset-4 hover:decoration-[var(--craft-accent)]" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mt-4 max-w-2xl list-disc space-y-2 pl-5 text-base leading-8 text-[var(--craft-muted)]" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="mt-4 max-w-2xl list-decimal space-y-2 pl-5 text-base leading-8 text-[var(--craft-muted)]" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="text-pretty" {...props} />,
  pre: CodeBlock,
};

const prettyCodeOptions = {
  theme: "github-dark-default",
  keepBackground: false,
  defaultLang: "plaintext",
};

function splitCraftSections(body: string) {
  const implementationMarker = /^##\s+Implementation\s*$/im.exec(body);
  const howItWorksMarker = /^##\s+How it works\s*$/im.exec(body);

  if (
    implementationMarker?.index === undefined ||
    howItWorksMarker?.index === undefined ||
    howItWorksMarker.index < implementationMarker.index
  ) {
    return undefined;
  }

  return {
    preview: body.slice(0, implementationMarker.index).trim(),
    implementation: body
      .slice(
        implementationMarker.index + implementationMarker[0].length,
        howItWorksMarker.index,
      )
      .trim(),
    howItWorks: body
      .slice(howItWorksMarker.index + howItWorksMarker[0].length)
      .trim(),
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
  const eyebrow =
    document.kind === "introduction"
      ? "Introduction"
      : `Craft / ${document.category ?? "Study"}`;
  const craftSections =
    document.kind === "craft" ? splitCraftSections(document.body) : undefined;

  if (document.kind === "introduction") {
    return (
      <div className="min-w-0 px-5 py-16 sm:px-10 sm:py-20 lg:px-14 xl:px-20">
        <article className="mx-auto max-w-7xl pb-24">
          <header className="border-b border-foreground/10 pb-16 sm:pb-24">
            <p className="text-sm text-[var(--craft-accent)]">A living archive of interface studies</p>
            <h1 className="font-heading mt-8 max-w-5xl text-balance text-5xl leading-[0.98] sm:text-7xl lg:text-8xl">
              Small interactions, studied closely.
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-[var(--craft-muted)] sm:text-xl sm:leading-9">
              {document.description}
            </p>
          </header>
          {renderMdx(document.body)}
        </article>
      </div>
    );
  }

  return (
    <div className="min-w-0 px-5 py-10 sm:px-10 sm:py-12 lg:px-14 xl:px-20">
      <article className="mx-auto max-w-6xl pb-24">
        <header className="grid grid-cols-2 border-l border-t border-foreground/10 sm:grid-cols-12 bg-[var(--craft-surface)]">
          <div className="flex min-h-16 items-center border-r border-b border-foreground/10 px-4 py-3 sm:col-span-4">
            <p className="text-sm text-[var(--craft-accent)]">{eyebrow}</p>
          </div>
          <div className="flex min-h-16 items-center justify-end gap-4 border-r border-b border-foreground/10 px-4 py-3 sm:col-span-8">
            {document.publishedAt ? (
              <time
                dateTime={document.publishedAt}
                className="font-mono text-xs tabular-nums text-foreground/45"
              >
                {new Intl.DateTimeFormat("en", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(`${document.publishedAt}T00:00:00`))}
              </time>
            ) : null}
            <ShareButton path={`/craft/${document.slug}`} />
          </div>
          <div className="col-span-2 border-r border-b border-foreground/10 px-5 py-8 sm:col-span-12 sm:px-6 sm:py-10">
            <h1 className="font-heading w-full text-balance text-5xl leading-[0.98] sm:text-5xl lg:text-5xl">
              {document.title}
            </h1>
          </div>
          <div className="col-span-2 flex border-r border-b border-foreground/10 p-5 sm:col-span-12 sm:p-6">
            <p className="max-w-2xl text-pretty text-base leading-7 text-[var(--craft-muted)]">
              {document.description}
            </p>
          </div>
        </header>

        {craftSections ? (
          <>
            <section className="pt-14 sm:pt-20">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-balance text-2xl font-medium sm:text-3xl">Demo</h2>
                <span className="font-mono text-[10px] uppercase text-foreground/40">Interactive</span>
              </div>
              {craftSections.preview ? renderMdx(craftSections.preview) : null}
            </section>
            <CraftTabs
              implementation={renderMdx(craftSections.implementation)}
              howItWorks={renderMdx(craftSections.howItWorks)}
            />
          </>
        ) : (
          renderMdx(document.body)
        )}
      </article>
    </div>
  );
}
