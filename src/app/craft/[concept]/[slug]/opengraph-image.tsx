import fs from "node:fs";

import { getConcept } from "@/lib/concepts";
import { getContentBySlug } from "@/lib/content";
import { createSocialImage, socialImageSize } from "@/lib/social-image";

export const alt = "UICraft interaction study";
export const size = socialImageSize;
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ concept: string; slug: string }>;
}) {
  const { slug } = await params;
  const document = getContentBySlug(slug);

  // A screenshot captured by `npm run og` shows the craft itself, so prefer it over the text card.
  if (document?.ogImageFile) {
    return new Response(fs.readFileSync(document.ogImageFile), {
      headers: { "Content-Type": "image/png" },
    });
  }

  return createSocialImage({
    title: document?.title ?? "UICraft",
    description:
      document?.description ??
      "Interface animation and interaction studies, rebuilt from scratch.",
    category: (document?.concept && getConcept(document.concept)?.title) ?? document?.category,
  });
}
