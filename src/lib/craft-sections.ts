export type TocItem = { id: string; title: string; depth: 2 | 3 };

export type CraftSections = {
  /** Everything before the first `##`: the live demo and its one-line caption. */
  preview: string;
  /** The `## Implementation` source, shown as the copy/paste Code tab. */
  implementation?: string;
  /** Every other `##` section: the "How it works" write-up. */
  article: string;
  toc: TocItem[];
};

export function stripMarkdown(text: string) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
}

export function slugify(text: string) {
  return stripMarkdown(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Splits a craft body into the live demo (everything before the first h2),
// the optional `## Implementation` source, and the write-up that follows.
// Headings inside fenced code are ignored.
export function splitCraftSections(body: string): CraftSections {
  const lines = body.split("\n");
  const sections: { title: string; lines: string[] }[] = [];
  const preview: string[] = [];
  const toc: TocItem[] = [];
  let fence: string | undefined;

  for (const line of lines) {
    const fenceMatch = /^\s*(```|~~~)/.exec(line);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (line.trim().startsWith(fence)) fence = undefined;
    }

    const heading = fence ? null : /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (heading?.[1] === "##") sections.push({ title: heading[2], lines: [] });
    (sections.at(-1)?.lines ?? preview).push(line);

    const inImplementation = sections.at(-1)?.title.toLowerCase() === "implementation";
    if (heading && !inImplementation) {
      const title = stripMarkdown(heading[2]);
      toc.push({ id: slugify(title), title, depth: heading[1].length as 2 | 3 });
    }
  }

  const implementation = sections.find((section) => section.title.toLowerCase() === "implementation");
  const article = sections
    .filter((section) => section !== implementation)
    .map((section) => section.lines.join("\n"))
    .join("\n\n");

  return {
    preview: preview.join("\n").trim(),
    implementation: implementation?.lines.slice(1).join("\n").trim(),
    article: article.trim(),
    toc,
  };
}

/** A craft gets a "How it works" sub-page only when there is something written to put on it. */
export function hasWriteUp(sections: CraftSections) {
  return Boolean(sections.article || sections.implementation);
}
