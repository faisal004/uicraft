import "server-only";

import fs from "node:fs";
import path from "node:path";

import { CodeBlock } from "@/components/mdx/code-block";

export function ThanosSnapSource() {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/components/mdx/thanos-snap-demo.tsx"),
    "utf8",
  );

  return (
    <div className="not-prose mt-6">
      <p className="mb-3 font-mono text-xs text-(--craft-muted)">thanos-snap-demo.tsx</p>
      <CodeBlock><code className="block px-5">{source}</code></CodeBlock>
    </div>
  );
}
