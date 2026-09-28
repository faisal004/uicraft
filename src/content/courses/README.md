# Personal courses

Each course lives in its own folder. Copy `_template` to a new lowercase, hyphenated folder such as `svg` or `gsap`, then edit `course.json`. Put each lesson in a separate `lessons/*.mdx` file with `title`, `description`, and numeric `order` frontmatter. The folder and file names become the URLs: `/courses/svg/first-lesson`.

The sidebar, lesson count, and previous/next links come from these files automatically. `/courses/svg` opens its first lesson. Courses are absent from Craft navigation, sitemap, and feed; lesson pages request `noindex`. The old `/canvas-basics` URL still opens the Canvas course.

Run `npm run check:courses` after adding lessons to catch malformed frontmatter, duplicate order numbers, and MDX syntax errors.

Lessons can use Markdown, fenced code blocks, and registered interactive components. Put a new interactive component under `src/components/course/` and register it in `src/components/course/course-mdx.tsx` so MDX can render it. Ordinary lessons need no page or navigation code changes.

Teaching pattern: introduce one idea, show the smallest code that proves it, let the learner predict a change, show a live result when useful, and finish with one check question. Explain units and coordinate systems explicitly.
