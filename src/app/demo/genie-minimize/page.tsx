import type { Metadata } from "next";

import { GenieMinimizeDemo } from "@/components/mdx/genie-minimize";

export const metadata: Metadata = {
  title: "Genie Minimise Demo",
  description: "A window that funnels into its dock slot when minimised, and pours back out when restored.",
  robots: { index: false, follow: false },
};

export default function Page() {
  // "Colours In Motion" from Pexels (pexels.com/video/5914207), Pexels License: free to use.
  return <GenieMinimizeDemo src="/reel.mp4" />;
}
