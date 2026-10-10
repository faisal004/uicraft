"use client";

import { ImageBitmap } from "@/components/mdx/image-bitmap";

export function ImageBitmapThumbnail() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-full overflow-hidden [&>div>div:first-child]:hidden [&>div>div:last-child]:hidden">
      <ImageBitmap src="/image-bitmap-sample.svg" cols={48} className="!max-w-none !p-3" />
    </div>
  );
}
