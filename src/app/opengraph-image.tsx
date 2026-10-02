import { createSiteOpenGraph, siteOpenGraphAlt, siteOpenGraphSize } from "@/lib/site-opengraph";

export const alt = siteOpenGraphAlt;
export const size = siteOpenGraphSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return createSiteOpenGraph();
}
