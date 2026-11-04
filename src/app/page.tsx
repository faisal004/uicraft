import Link from "next/link";

import { BlueprintBlock, BlueprintGuides } from "@/components/blueprint";
import { DotField } from "@/components/dot-field";
import { JsonLd } from "@/components/json-ld";
import { LandingPlates } from "@/components/landing-plates";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCraftContent } from "@/lib/content";
import { author, siteConfig, siteUrl } from "@/lib/site";

/** Crafts shown on the landing plates, in order. */
const HANDPICKED = ["text-to-particles", "dot-matrix-ticker", "bitmap-device", "waving-flag"];

const cellClassName = "relative flex min-w-0 flex-col border-foreground/10 p-5 sm:p-8 lg:p-10";

export default function Home() {
  const crafts = getCraftContent();
  const handpicked = HANDPICKED.flatMap((slug) => crafts.filter((craft) => craft.slug === slug));

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
        <div className="bp-late">
          <DotField />
        </div>
        <BlueprintGuides />

        <div className="grid min-h-dvh grid-cols-1 lg:h-full lg:grid-cols-2 lg:grid-rows-2">
          <div className={`${cellClassName} justify-between gap-10 border-b lg:border-r`}>
            <div className="flex items-center justify-between gap-4">
              <BlueprintBlock label="MARK" delay={350}>
                <Link
                  href="/"
                  className="font-heading text-base transition-opacity duration-150 hover:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  UICraft
                </Link>
              </BlueprintBlock>
              <ThemeToggle className="size-9 border border-current/20 text-current hover:bg-current/10 lg:hidden" />
            </div>
            <div>
              <BlueprintBlock label="COPY 01" delay={500} className="mb-5 w-fit sm:mb-7">
                <p className="text-sm text-foreground/60">A place to remake what catches my eye.</p>
              </BlueprintBlock>
              <BlueprintBlock label="TITLE" delay={600}>
                <h1 className="hero-title font-heading text-balance">
                  Saw something cool. Had to know how it worked.
                </h1>
              </BlueprintBlock>
            </div>
          </div>

          <div className={`${cellClassName} justify-between gap-10 border-b`}>
            <BlueprintBlock label="NAV" delay={420} className="hidden self-end lg:block">
              <div className="flex items-center gap-4">
                <p className="text-sm text-foreground/60">Personal experiments, ongoing</p>
                <ThemeToggle />
              </div>
            </BlueprintBlock>
            <div className="max-w-lg lg:ml-auto">
              <BlueprintBlock label="COPY 02" delay={720}>
                <p className="text-pretty text-base leading-7 text-foreground/70 sm:text-lg sm:leading-8">
                  Not a UI library. Just a growing collection of animations and
                  interactions I’ve rebuilt from things I find online, each with
                  the full source and a step-by-step tutorial.
                </p>
              </BlueprintBlock>
              <BlueprintBlock label="CTA" delay={820} className="mt-7 w-fit sm:mt-9">
                <Link
                  href="/craft"
                  className="font-heading inline-flex border-b border-current pb-1 text-base transition-opacity duration-150 hover:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  Enter the playground
                </Link>
              </BlueprintBlock>
            </div>
          </div>

          <footer
            className={`${cellClassName} order-last justify-end text-xs text-foreground/60 lg:order-none lg:border-r`}
          >
            <BlueprintBlock label="META" delay={1000} className="w-fit">
              <div className="flex flex-col gap-2">
                <SiteFooter />
                <span>Est. whenever curiosity struck</span>
              </div>
            </BlueprintBlock>
          </footer>

          <div className="relative min-h-[28rem] min-w-0 border-b border-foreground/10 bg-(--craft-page)/85 backdrop-blur-[2px] lg:min-h-0 lg:border-b-0">
            <LandingPlates crafts={handpicked} total={crafts.length} />
          </div>
        </div>
      </main>
    </>
  );
}
