import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const contentDirectory = path.join(process.cwd(), "src/content/craft");

export type ContentEntry = {
  slug: string;
  title: string;
  description: string;
  publishedAt?: string;
  category?: string;
  preview?: string;
  order: number;
  kind: "introduction" | "craft";
};

export type ContentDocument = ContentEntry & {
  body: string;
};

function readDocument(filename: string): ContentDocument {
  const slug = filename.replace(/\.mdx$/, "");
  const source = fs.readFileSync(path.join(contentDirectory, filename), "utf8");
  const { data, content } = matter(source);

  if (!data.title || !data.description || !data.kind) {
    throw new Error(`${filename} is missing required frontmatter.`);
  }

  const publishedAt = data.publishedAt
    ? new Date(data.publishedAt).toISOString().slice(0, 10)
    : undefined;

  return {
    slug,
    title: String(data.title),
    description: String(data.description),
    publishedAt,
    category: data.category ? String(data.category) : undefined,
    preview: data.preview ? String(data.preview) : undefined,
    order: Number(data.order ?? 999),
    kind: data.kind === "introduction" ? "introduction" : "craft",
    body: content,
  };
}

export function getAllContent(): ContentEntry[] {
  return fs
    .readdirSync(contentDirectory)
    .filter((filename) => filename.endsWith(".mdx"))
    .map(readDocument)
    .map((document) => ({
      slug: document.slug,
      title: document.title,
      description: document.description,
      publishedAt: document.publishedAt,
      category: document.category,
      preview: document.preview,
      order: document.order,
      kind: document.kind,
    }))
    .sort((a, b) => a.order - b.order);
}

export function getCraftContent(): ContentEntry[] {
  return getAllContent().filter((entry) => entry.kind === "craft");
}

export function getContentBySlug(slug: string): ContentDocument | undefined {
  const filename = `${slug}.mdx`;

  if (!fs.existsSync(path.join(contentDirectory, filename))) {
    return undefined;
  }

  return readDocument(filename);
}
