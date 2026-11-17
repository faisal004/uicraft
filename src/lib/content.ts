import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { concepts, getConcept } from "@/lib/concepts";

const contentDirectory = path.join(process.cwd(), "src/content/craft");

export type ContentEntry = {
  slug: string;
  title: string;
  seoTitle?: string;
  description: string;
  publishedAt?: string;
  updatedAt?: string;
  category?: string;
  preview?: string;
  order: number;
  kind: "introduction" | "craft";
  /** Concept slug. Every craft has one; the introduction does not. */
  concept?: string;
  /** Canonical path, e.g. `/craft/webgl/genie-minimize`. */
  href: string;
};

export type ContentDocument = ContentEntry & {
  body: string;
};

function toDate(value: unknown) {
  return value ? new Date(value as string).toISOString().slice(0, 10) : undefined;
}

function readDocument(filename: string): ContentDocument {
  const slug = filename.replace(/\.mdx$/, "");
  const source = fs.readFileSync(path.join(contentDirectory, filename), "utf8");
  const { data, content } = matter(source);

  if (!data.title || !data.description || !data.kind) {
    throw new Error(`${filename} is missing required frontmatter.`);
  }

  const publishedAt = toDate(data.publishedAt);
  const kind = data.kind === "introduction" ? "introduction" : "craft";
  const concept = data.concept ? String(data.concept) : undefined;

  if (kind === "craft" && (!concept || !getConcept(concept))) {
    throw new Error(
      `${filename} needs a \`concept\` from src/lib/concepts.ts (got ${concept ?? "nothing"}).`,
    );
  }

  return {
    slug,
    title: String(data.title),
    seoTitle: data.seoTitle ? String(data.seoTitle) : undefined,
    description: String(data.description),
    publishedAt,
    updatedAt: toDate(data.updatedAt) ?? publishedAt,
    category: data.category ? String(data.category) : undefined,
    preview: data.preview ? String(data.preview) : undefined,
    order: Number(data.order ?? 999),
    kind,
    concept,
    href: kind === "craft" ? `/craft/${concept}/${slug}` : "/craft",
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
      seoTitle: document.seoTitle,
      description: document.description,
      publishedAt: document.publishedAt,
      updatedAt: document.updatedAt,
      category: document.category,
      preview: document.preview,
      order: document.order,
      kind: document.kind,
      concept: document.concept,
      href: document.href,
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

export type ConceptGroup = (typeof concepts)[number] & { crafts: ContentEntry[] };

export function getCraftsByConcept(): ConceptGroup[] {
  const crafts = getCraftContent();

  return [...concepts]
    .sort((a, b) => a.order - b.order)
    .map((concept) => ({
      ...concept,
      crafts: crafts.filter((craft) => craft.concept === concept.slug),
    }))
    .filter((group) => group.crafts.length > 0);
}
