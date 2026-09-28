import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCourse, getCourseSlugs } from "@/lib/courses";

type Props = { params: Promise<{ course: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return getCourseSlugs().map((course) => ({ course }));
}

export default async function CoursePage({ params }: Props) {
  const { course: slug } = await params;
  const course = getCourse(slug);
  if (!course || course.lessons.length === 0) notFound();
  redirect(`/courses/${slug}/${course.lessons[0].slug}`);
}
