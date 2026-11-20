import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { CellBar } from "@/components/landing/cell-bar";
import { MainCharacterPlate } from "@/components/landing/main-character-plate";
import { LandingPlates } from "@/components/landing-plates";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCraftContent } from "@/lib/content";
import { author, links, siteConfig, siteUrl } from "@/lib/site";

const cellClassName = "relative flex min-w-0 flex-col border-foreground/10";
const bodyClassName = "flex min-h-0 flex-1 flex-col justify-center p-5 sm:p-8";
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
        <div className="grid h-dvh grid-cols-1 grid-rows-1 sm:h-auto sm:min-h-dvh sm:grid-rows-none lg:h-full lg:grid-cols-2 lg:grid-rows-2">
          <section className={`${cellClassName} border-b max-sm:pointer-events-none max-sm:col-start-1 max-sm:row-start-1 max-sm:z-10 max-sm:self-start max-sm:border-0 max-sm:bg-linear-to-b max-sm:from-black/70 max-sm:to-transparent max-sm:text-white lg:border-r`}>
            <CellBar className="hidden sm:flex sm:pr-1.5 lg:pr-10">
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
                <a href={links.repo} target="_blank" rel="noreferrer" className={barLinkClassName}>
                  Star on GitHub
                </a>{" "}
                ·{" "}
                <a href={links.contact} target="_blank" rel="noreferrer" className={barLinkClassName}>
                  Say hi
                </a>
              </span>
              {/* On phones this bar is the only one at the top, so the toggle lives here. */}
              <ThemeToggle className={`${toggleClassName} lg:hidden`} />
            </CellBar>
            <div className={`${bodyClassName} max-sm:flex-none max-sm:justify-start max-sm:pt-10 max-sm:pb-16`}>
              <div className="mb-5 hidden w-fit sm:block">
                <p className="text-sm text-foreground/60">A place to remake what catches my eye.</p>
              </div>
              <div>
                <h1 className="hero-title font-heading text-balance max-sm:drop-shadow-md">
                  <span className="sm:block">Saw something cool.</span>{" "}
                  <span className="sm:block">Had to know how it worked.</span>
                </h1>
              </div>
            </div>
          </section>

          <section className={`${cellClassName} border-b max-sm:col-start-1 max-sm:row-start-1 max-sm:border-0`}>
            <CellBar className="hidden lg:flex lg:pr-1.5">
              <span>Personal experiments, ongoing</span>
              <ThemeToggle className={toggleClassName} />
            </CellBar>
            <div className="relative min-h-0 flex-1 overflow-hidden sm:min-h-96 lg:min-h-0">
              <MainCharacterPlate />
              <Link
                href="/craft"
                className="font-heading group absolute right-5 bottom-5 inline-flex items-center gap-2 border border-foreground/20 bg-(--craft-page)/95 px-4 py-3 text-base transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 sm:right-8 sm:bottom-8 lg:right-10 lg:bottom-10"
              >
                Enter the playground
                <ArrowUpRight
                  className="size-4 text-(--craft-accent) transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </section>

          <section className="relative hidden min-w-0 sm:block lg:col-span-2 lg:min-h-0">
            <LandingPlates crafts={crafts} />
          </section>

        </div>
      </main>
    </>
  );
}
