import "server-only";

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { concepts, getConcept } from "@/lib/concepts";
import { hasWriteUp, splitCraftSections } from "@/lib/craft-sections";

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
  /** `${href}/how-it-works` when the craft has a write-up, otherwise undefined. */
  howItWorksHref?: string;
  /** Captured social preview files under public/og (see scripts/capture-og.mjs), when present. */
  ogImageFile?: string;
  ogVideo?: string;
};

export type ContentDocument = ContentEntry & {
  body: string;
};

function toDate(value: unknown) {
  return value ? new Date(value as string).toISOString().slice(0, 10) : undefined;
}

// A shallow clone (common on CI) makes every file look like it changed in the
// oldest fetched commit, so only trust git when the full history is present.
const fullHistory = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim() === "false";
  } catch {
    return false;
  }
})();

/** The date of the last commit that touched the file, as YYYY-MM-DD. */
function lastCommitDate(file: string) {
  if (!fullHistory) return undefined;
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

const ogDirectory = path.join(process.cwd(), "public/og");

/** The absolute path of a captured social preview file, if it exists. */
function ogFile(name: string) {
  const file = path.join(ogDirectory, name);
  return fs.existsSync(file) ? file : undefined;
}

function readDocument(filename: string): ContentDocument {
  const slug = filename.replace(/\.mdx$/, "");
  const source = fs.readFileSync(path.join(contentDirectory, filename), "utf8");
  const { data, content } = matter(source);
  const file = path.join(contentDirectory, filename);

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

  const href = kind === "craft" ? `/craft/${concept}/${slug}` : "/craft";
  const writeUp = kind === "craft" && hasWriteUp(splitCraftSections(content));

  return {
    slug,
    title: String(data.title),
    seoTitle: data.seoTitle ? String(data.seoTitle) : undefined,
    description: String(data.description),
    publishedAt,
    updatedAt: lastCommitDate(file) ?? toDate(data.updatedAt) ?? publishedAt,
    category: data.category ? String(data.category) : undefined,
    preview: data.preview ? String(data.preview) : undefined,
    order: Number(data.order ?? 999),
    kind,
    concept,
    href,
    howItWorksHref: writeUp ? `${href}/how-it-works` : undefined,
    ogImageFile: ogFile(`${slug}.png`),
    ogVideo: ogFile(`${slug}.mp4`) ? `/og/${slug}.mp4` : undefined,
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
      howItWorksHref: document.howItWorksHref,
      ogImageFile: document.ogImageFile,
      ogVideo: document.ogVideo,
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
