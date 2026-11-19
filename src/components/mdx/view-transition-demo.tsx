"use client";

import { ArrowLeft } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";

type Post = {
  id: string;
  tag: string;
  date: string;
  minutes: number;
  title: string;
  excerpt: string;
  body: string[];
  // Three colours paint each cover: sky, near hills, far hills.
  palette: [string, string, string];
  sun: string;
};

const POSTS: Post[] = [
  {
    id: "desert",
    tag: "Travel",
    date: "Nov 12",
    minutes: 4,
    title: "Where the light stays longer",
    excerpt: "The stillness of the desert in the last hour before dark.",
    body: [
      "The last hour of daylight changes the shape of everything. Rocks that looked flat at noon grow long shadows, and the ridge behind camp turns the colour of a clay pot.",
      "We stopped talking around six. Not on purpose; there just wasn't much to add. The wind dropped, the sun sat on the far hills for a long time, and then it was gone all at once.",
      "Go back to the journal and watch the cover return to its card. It's the same element the whole way; only the page around it changes.",
    ],
    palette: ["#cc846b", "#a95f50", "#63483f"],
    sun: "#f2d1a5",
  },
  {
    id: "coast",
    tag: "Notes",
    date: "Oct 28",
    minutes: 6,
    title: "A week of grey water",
    excerpt: "Seven mornings on the same cold beach, and why I didn't mind.",
    body: [
      "It rained for six of the seven days. The sea and the sky met somewhere in the middle and agreed to be the same colour.",
      "Each morning I walked to the end of the breakwater and back. By Thursday the gulls had stopped bothering to move.",
      "On the last day the cloud lifted for twenty minutes. I've thought about those twenty minutes more than the rest of the trip.",
    ],
    palette: ["#8fa8b3", "#5f7e8c", "#34505c"],
    sun: "#e6eef0",
  },
  {
    id: "forest",
    tag: "Essay",
    date: "Oct 3",
    minutes: 5,
    title: "Learning the names of trees",
    excerpt: "A small notebook, a borrowed field guide, and a lot of oaks.",
    body: [
      "I started with the ones outside my window and got all three wrong. The field guide was patient about it.",
      "Bark is the trick. Leaves fall, but bark stays, and once you see the difference between a beech and a birch you can't stop seeing it.",
      "Forty-one trees so far. Most of them are oaks, and I'm fairly sure about at least half.",
    ],
    palette: ["#a9b88f", "#6f8a5c", "#3e5536"],
    sun: "#f1edc9",
  },
];

export function ViewTransitionDemo() {
  const [openId, setOpenId] = useState<string | null>(null);
  // The post whose cover and title carry a view-transition-name. Only one element may hold a
  // name at a time, so it stays on the last post opened, which is also the one we return to.
  const [activeId, setActiveId] = useState(POSTS[0].id);
  const pageRef = useRef<HTMLDivElement>(null);
  const post = POSTS.find((item) => item.id === openId);

  function show(nextId: string | null) {
    const update = () => {
      setOpenId(nextId);
      // Start the new view at its top, whether the demo or the page is the one scrolled.
      const page = pageRef.current;
      page?.scrollTo({ top: 0 });
      if (page && page.getBoundingClientRect().top < 0) page.scrollIntoView();
    };

    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      if (nextId) setActiveId(nextId);
      update();
      return;
    }

    // Name the clicked card first, so the browser's "before" snapshot can find it.
    if (nextId) flushSync(() => setActiveId(nextId));
    document.startViewTransition(() => {
      flushSync(update);
    });
  }

  const named = (id: string, part: "cover" | "title") =>
    id === activeId ? { viewTransitionName: `vt-${part}` } : undefined;

  return (
    <div ref={pageRef} className="vt-blog craft-fill">
      <header className="vt-bar">
        <span className="vt-logo">Field Notes</span>
        <nav aria-label="Journal">
          <span>Journal</span>
          <span>About</span>
        </nav>
      </header>

      {post ? (
        <article className="vt-post">
          <button type="button" className="vt-back" onClick={() => show(null)}>
            <ArrowLeft size={14} aria-hidden="true" /> All posts
          </button>
          <p className="vt-meta">
            {post.tag} · {post.date} · {post.minutes} min read
          </p>
          <h2 className="vt-post-title" style={named(post.id, "title")}>
            {post.title}
          </h2>
          <Cover post={post} style={named(post.id, "cover")} />
          {post.body.map((paragraph) => (
            <p key={paragraph.slice(0, 20)} className="vt-body">
              {paragraph}
            </p>
          ))}
        </article>
      ) : (
        <main className="vt-home">
          <h2 className="vt-intro">Slow travel, written down.</h2>
          <ul className="vt-grid">
            {POSTS.map((item) => (
              <li key={item.id}>
                <button type="button" className="vt-card" onClick={() => show(item.id)}>
                  <Cover post={item} style={named(item.id, "cover")} />
                  <span className="vt-meta">
                    {item.tag} · {item.date}
                  </span>
                  <span className="vt-card-title" style={named(item.id, "title")}>
                    {item.title}
                  </span>
                  <span className="vt-excerpt">{item.excerpt}</span>
                </button>
              </li>
            ))}
          </ul>
        </main>
      )}

      <style>{`
        .vt-blog {
          --vt-paper: #f6f3ee; --vt-ink: #24221e; --vt-muted: #6f6a61; --vt-line: #e2dcd2; --vt-accent: #a6563e;
          position: relative;
          min-height: 32rem;
          width: 100%;
          overflow-y: auto;
          background: var(--vt-paper);
          color: var(--vt-ink);
          font-family: system-ui, sans-serif;
        }
        .dark .vt-blog { --vt-paper: #12110f; --vt-ink: #efebe4; --vt-muted: #a39d92; --vt-line: #2a2722; --vt-accent: #e0937a; }
        .vt-bar { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 1rem clamp(1rem, 4vw, 2.5rem); border-bottom: 1px solid var(--vt-line); background: var(--vt-paper); }
        .vt-logo { font-family: Georgia, serif; font-size: 1.05rem; font-style: italic; }
        .vt-bar nav { display: flex; gap: 1.25rem; font-size: .8rem; color: var(--vt-muted); }
        .vt-home, .vt-post { margin: 0 auto; padding: clamp(1.5rem, 5vw, 3.5rem) clamp(1rem, 4vw, 2.5rem) 4rem; }
        .vt-home { max-width: 64rem; }
        .vt-post { max-width: 42rem; }
        .vt-intro { margin: 0 0 2rem; max-width: 16ch; font-family: Georgia, serif; font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 400; line-height: 1.05; text-wrap: balance; }
        .vt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: clamp(1rem, 3vw, 2rem); margin: 0; padding: 0; list-style: none; }
        .vt-card { display: flex; flex-direction: column; gap: .5rem; width: 100%; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
        .vt-card:focus-visible { outline: 2px solid var(--vt-accent); outline-offset: 6px; }
        .vt-card .vt-cover { aspect-ratio: 4 / 3; margin-bottom: .5rem; }
        .vt-card:hover .vt-card-title { text-decoration: underline; text-underline-offset: 4px; }
        .vt-meta { margin: 0; font: 600 .68rem/1.4 ui-monospace, monospace; letter-spacing: .04em; text-transform: uppercase; color: var(--vt-accent); }
        .vt-card-title { width: fit-content; font-family: Georgia, serif; font-size: 1.35rem; line-height: 1.15; }
        .vt-excerpt { font-size: .85rem; line-height: 1.6; color: var(--vt-muted); }
        .vt-back { display: inline-flex; align-items: center; gap: .4rem; margin-bottom: 2rem; padding: 0; border: 0; background: none; color: var(--vt-muted); font: inherit; font-size: .8rem; cursor: pointer; }
        .vt-back:hover { color: var(--vt-ink); }
        .vt-back:focus-visible { outline: 2px solid var(--vt-accent); outline-offset: 4px; }
        .vt-post-title { width: fit-content; margin: .75rem 0 1.75rem; font-family: Georgia, serif; font-size: clamp(2rem, 5vw, 3rem); font-weight: 400; line-height: 1.08; text-wrap: balance; }
        .vt-post .vt-cover { aspect-ratio: 16 / 9; margin-bottom: 2rem; }
        .vt-body { margin: 0 0 1.25rem; font-family: Georgia, serif; font-size: 1.05rem; line-height: 1.75; color: var(--vt-ink); }
        .vt-cover { display: block; position: relative; isolation: isolate; overflow: hidden; width: 100%; border-radius: .35rem; background: var(--sky); }
        .vt-cover::before, .vt-cover::after { content: ""; position: absolute; left: -15%; width: 130%; height: 55%; border-radius: 50% 50% 0 0; }
        .vt-cover::before { bottom: -20%; background: var(--near); transform: rotate(-8deg); }
        .vt-cover::after { bottom: -36%; background: var(--far); transform: rotate(11deg); }
        .vt-sun { position: absolute; top: 22%; left: 58%; width: 22%; aspect-ratio: 1; border-radius: 50%; background: var(--sun); }
        ::view-transition-group(vt-cover), ::view-transition-group(vt-title) { animation-duration: 450ms; animation-timing-function: cubic-bezier(.2, 0, 0, 1); }
      `}</style>
    </div>
  );
}

function Cover({ post, style }: { post: Post; style?: CSSProperties }) {
  const [sky, near, far] = post.palette;
  return (
    <span
      className="vt-cover"
      role="img"
      aria-label={`Illustrated cover for “${post.title}”`}
      style={{ ...style, "--sky": sky, "--near": near, "--far": far, "--sun": post.sun } as CSSProperties}
    >
      <span className="vt-sun" aria-hidden="true" />
    </span>
  );
}
