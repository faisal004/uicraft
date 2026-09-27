import type { Metadata } from "next";

import { ThanosSearchDemo } from "@/components/mdx/thanos-search-demo";

export const metadata: Metadata = {
  title: "Thanos Snap Demo",
  description: "A search page demo where the Infinity Gauntlet turns half the results to dust.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ThanosSearchDemo />;
}
