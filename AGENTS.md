<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Craft workflow

- The **Copy/paste component** tab must show one complete, runnable component. It must be the exact source used by the live demo, not an approximation or disconnected snippets. Keep it self-contained; if an asset is required, name and provide that asset next to the code.
- Keep the live craft demo focused on the smallest content that shows the effect. Put larger showcase variants on separate pages and link to them from the craft.
- The **How does it work?** tab is a beginner tutorial. Start with the visible HTML and explain each browser API before using it. Build the effect in small numbered steps from the plain starting point through animation, cleanup, and accessibility. Show only the code needed for each step and explain what changes on screen and why.
- When editing a craft, verify that the displayed copy/paste source and rendered demo are still the same component, and that each tutorial step matches the implementation.

## Personal course workflow

- Courses are separate from crafts. Keep them under `src/content/courses/<course>/` with one MDX file per lesson and course metadata in `course.json`. Follow `src/content/courses/README.md` and `_template` when adding a course or lesson.
- Teach from first principles: define each new term, explain units and coordinate systems, show a small code example, a live result when useful, one learner experiment, and a short check question. Add lessons to the sidebar through lesson files and their `order` values, not through hardcoded navigation.
- Keep courses out of public Craft navigation, sitemap, and feed. The generic route at `/courses/<course>/<lesson>` renders lesson files. Register new interactive MDX demos in `src/components/course/course-mdx.tsx` only when a lesson needs one.
