import Link from "next/link";

import { AsciiField } from "@/components/ascii-field";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig, siteUrl } from "@/lib/site";

export default function Home() {
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
        }}
      />
      <main className="relative isolate flex h-dvh flex-col overflow-hidden bg-[#1736f5] px-5 text-[#f4ff8c] sm:px-8 lg:px-12">
      <AsciiField />
      <div className="noise pointer-events-none absolute inset-0 -z-10" />

      <header className="flex w-full items-center justify-between py-6 sm:py-8">
        <Link href="/" className="font-heading text-base transition-opacity duration-150 hover:opacity-55">
          UIcraft
        </Link>
        <p className="hidden text-sm text-current opacity-70 sm:block">Personal experiments, ongoing</p>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 items-center py-4 sm:py-6">
        <div className="max-w-6xl">
          <p className="mb-6 text-sm text-current opacity-70 sm:mb-8">
            A place to remake what catches my eye.
          </p>
          <h1 className="hero-title font-heading max-w-5xl text-balance">
            Saw something cool. Had to know how it worked.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-current opacity-70 sm:mt-10 sm:text-lg sm:leading-8">
            Not a UI library. Just a growing collection of animations and
            interactions I’ve rebuilt from things I find online.
          </p>
          <Link
            href="/craft"
            className="font-heading mt-7 inline-flex border-b border-current pb-1 text-base transition-opacity duration-150 hover:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-4 sm:mt-10"
          >
            Enter the playground
          </Link>
        </div>
      </div>

      <footer className="flex items-center justify-between py-6 text-xs text-current opacity-70 sm:py-8">
        <SiteFooter />
        <span>Est. whenever curiosity struck</span>
      </footer>
      </main>
    </>
  );
}
