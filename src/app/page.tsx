import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { CellBar } from "@/components/landing/cell-bar";
import { LandingPlates } from "@/components/landing-plates";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCraftContent } from "@/lib/content";
import { author, siteConfig, siteUrl } from "@/lib/site";

const cellClassName = "relative flex min-w-0 flex-col border-foreground/10";
const bodyClassName = "flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8 lg:p-10";
const toggleClassName =
  "size-7 border border-foreground/15 text-foreground/70 hover:bg-foreground/10 hover:text-foreground";
const barLinkClassName =
  "underline decoration-current/30 underline-offset-4 transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

export default function Home() {
  const crafts = getCraftContent();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: siteUrl.href,
          description: siteConfig.description,
          inLanguage: "en",
          author,
          publisher: author,
        }}
      />
      <main className="relative isolate min-h-dvh overflow-hidden bg-(--craft-page) text-foreground lg:h-dvh">
        <div className="grid min-h-dvh grid-cols-1 lg:h-full lg:grid-cols-2 lg:grid-rows-2">
          <section className={`${cellClassName} border-b lg:border-r`}>
            <CellBar>
              <div>
                <Link
                  href="/"
                  className="font-heading text-sm normal-case text-foreground transition-opacity duration-150 hover:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  UICraft
                </Link>
              </div>
              <span className="hidden truncate lg:inline">
                Made by{" "}
                <a href="https://faisalhusa.in" target="_blank" rel="noreferrer" className={barLinkClassName}>
                  Faisal Husain
                </a>{" "}
                ·{" "}
                <a
                  href="https://github.com/faisal004/uicraft"
                  target="_blank"
                  rel="noreferrer"
                  className={barLinkClassName}
                >
                  Source on GitHub
                </a>
              </span>
              {/* On phones this bar is the only one at the top, so the toggle lives here. */}
              <ThemeToggle className={`${toggleClassName} lg:hidden`} />
            </CellBar>
            <div className={bodyClassName}>
              <div className="mb-5 w-fit sm:mb-7">
                <p className="text-sm text-foreground/60">A place to remake what catches my eye.</p>
              </div>
              <div>
                <h1 className="hero-title font-heading text-balance">
                  Saw something cool. Had to know how it worked.
                </h1>
              </div>
            </div>
          </section>

          <section className={`${cellClassName} border-b`}>
            <CellBar className="hidden lg:flex">
              <span>Personal experiments, ongoing</span>
              <ThemeToggle className={toggleClassName} />
            </CellBar>
            <div className={bodyClassName}>
              <div className="max-w-lg">
                <p className="text-pretty text-base leading-7 text-foreground/70 sm:text-lg sm:leading-8">
                  Not a UI library. Just a growing collection of animations and
                  interactions I’ve rebuilt from things I find online, each with
                  the full source and a step-by-step tutorial.
                </p>
              </div>
              <div className="mt-7 w-fit sm:mt-9">
                <Link
                  href="/craft"
                  className="font-heading group inline-flex items-center gap-2 border-b border-current pb-1 text-base transition-opacity duration-150 hover:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  Enter the playground
                  <ArrowUpRight
                    className="size-4 text-(--craft-accent) transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </section>

          <section className="relative min-w-0 lg:col-span-2 lg:min-h-0">
            <LandingPlates crafts={crafts} />
          </section>

        </div>
      </main>
    </>
  );
}
