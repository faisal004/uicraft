import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = path.join(process.cwd(), "src/content/courses");
const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type Lesson = {
  slug: string;
  title: string;
  description: string;
  order: number;
  body: string;
};

export type Course = {
  slug: string;
  title: string;
  description: string;
  lessons: Lesson[];
};

export function getCourseSlugs(): string[] {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && safeSlug.test(entry.name) && fs.existsSync(path.join(root, entry.name, "course.json")))
    .map((entry) => entry.name);
}

export function getCourse(slug: string): Course | undefined {
  if (!safeSlug.test(slug) || !getCourseSlugs().includes(slug)) return undefined;

  const directory = path.join(root, slug);
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, "course.json"), "utf8")) as { title: string; description: string };
  const lessonsDirectory = path.join(directory, "lessons");
  const lessons = fs.readdirSync(lessonsDirectory)
    .filter((filename) => filename.endsWith(".mdx"))
    .map((filename) => {
      const { data, content } = matter(fs.readFileSync(path.join(lessonsDirectory, filename), "utf8"));
      if (!data.title || !data.description || !Number.isFinite(Number(data.order))) {
        throw new Error(`Invalid course lesson: ${slug}/${filename}`);
      }
      return {
        slug: filename.slice(0, -4),
        title: String(data.title),
        description: String(data.description),
        order: Number(data.order),
        body: content,
      };
    })
    .sort((a, b) => a.order - b.order);

  return { slug, title: metadata.title, description: metadata.description, lessons };
}
