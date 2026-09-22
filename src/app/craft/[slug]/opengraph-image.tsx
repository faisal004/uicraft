import { getContentBySlug } from "@/lib/content";
import { createSocialImage, socialImageSize } from "@/lib/social-image";

export const alt = "UIcraft interaction study";
export const size = socialImageSize;
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const document = getContentBySlug(slug);

  return createSocialImage({
    title: document?.title ?? "UIcraft",
    description:
      document?.description ??
      "Interface animation and interaction studies, rebuilt from scratch.",
    category: document?.category,
  });
}
