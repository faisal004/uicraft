import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";

import { courseComponents } from "@/components/course/course-mdx";
import { getCourse, getCourseSlugs, type Course } from "@/lib/courses";

type Props = { params: Promise<{ course: string; lesson: string }> };

export function generateStaticParams() {
  return getCourseSlugs().flatMap((slug) =>
    (getCourse(slug)?.lessons ?? []).map((lesson) => ({ course: slug, lesson: lesson.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { course: courseSlug, lesson: lessonSlug } = await params;
  const course = getCourse(courseSlug);
  const lesson = course?.lessons.find((item) => item.slug === lessonSlug);
  if (!course || !lesson) return {};
  return {
    title: `${lesson.title} | ${course.title}`,
    description: lesson.description,
    robots: { index: false, follow: false },
  };
}

function LessonLinks({ course, active }: { course: Course; active: string }) {
  return (
    <ol className="space-y-1">
      {course.lessons.map((lesson, index) => (
        <li key={lesson.slug}>
          <Link
            href={`/courses/${course.slug}/${lesson.slug}`}
            aria-current={lesson.slug === active ? "page" : undefined}
            className={`flex gap-3 px-3 py-2.5 text-sm leading-5 transition-colors ${lesson.slug === active ? "bg-blue-600 text-white" : "text-foreground/65 hover:bg-foreground/5 hover:text-foreground"}`}
          >
            <span className="font-mono text-xs tabular-nums opacity-70">{String(index + 1).padStart(2, "0")}</span>
            <span>{lesson.title}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default async function CourseLessonPage({ params }: Props) {
  const { course: courseSlug, lesson: lessonSlug } = await params;
  const course = getCourse(courseSlug);
  const index = course?.lessons.findIndex((item) => item.slug === lessonSlug) ?? -1;
  if (!course || index < 0) notFound();
  const lesson = course.lessons[index];
  const previous = course.lessons[index - 1];
  const next = course.lessons[index + 1];

  return (
    <main className="min-h-dvh bg-(--craft-page) text-foreground md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="border-b border-foreground/15 bg-(--craft-sidebar) md:sticky md:top-0 md:h-dvh md:overflow-y-auto md:border-r md:border-b-0">
        <div className="p-5 md:p-6">
          <Link href="/" className="font-mono text-xs text-foreground/50 hover:text-foreground">UIcraft</Link>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-blue-600">Personal course</p>
          <p className="mt-2 font-heading text-xl leading-6">{course.title}</p>
          <p className="mt-2 text-xs leading-5 text-foreground/50">{course.lessons.length} lessons</p>
        </div>
        <div className="px-3 pb-5 md:hidden">
          <details>
            <summary className="cursor-pointer border border-foreground/15 p-3 text-sm">Lesson {index + 1}: {lesson.title} · Choose lesson</summary>
            <nav aria-label="Course lessons" className="mt-3"><LessonLinks course={course} active={lesson.slug} /></nav>
          </details>
        </div>
        <nav aria-label="Course lessons" className="hidden px-3 pb-8 md:block">
          <LessonLinks course={course} active={lesson.slug} />
        </nav>
      </aside>

      <div className="min-w-0 px-5 py-10 sm:px-10 sm:py-14 lg:px-16">
        <article className="mx-auto max-w-3xl pb-16">
          <header className="border-b border-foreground/15 pb-8">
            <p className="font-mono text-xs uppercase tracking-widest text-blue-600">Lesson {index + 1} of {course.lessons.length}</p>
            <h1 className="mt-4 font-heading text-4xl leading-tight sm:text-5xl">{lesson.title}</h1>
            <p className="mt-4 text-lg leading-8 text-foreground/65">{lesson.description}</p>
          </header>
          <div className="pt-5">
            <MDXRemote
              source={lesson.body}
              components={courseComponents}
              options={{ mdxOptions: { rehypePlugins: [[rehypePrettyCode, { theme: "github-dark-default", keepBackground: false, defaultLang: "plaintext" }]] } }}
            />
          </div>
          <nav aria-label="Lesson navigation" className="mt-16 grid gap-3 border-t border-foreground/15 pt-6 sm:grid-cols-2">
            {previous ? <Link href={`/courses/${course.slug}/${previous.slug}`} className="border border-foreground/15 p-4 text-sm hover:border-blue-600">← Previous: {previous.title}</Link> : <span />}
            {next ? <Link href={`/courses/${course.slug}/${next.slug}`} className="border border-foreground/15 p-4 text-right text-sm hover:border-blue-600">Next: {next.title} →</Link> : null}
          </nav>
        </article>
      </div>
    </main>
  );
}
