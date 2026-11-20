import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./line-landscapes.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(`${source}\nexport { hatch };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});
const helpers = {};
const require = createRequire(import.meta.url);
// next/font only works inside a Next build, so hand the module a stand-in.
const fonts = { Caveat: () => ({ className: "" }) };
runInNewContext(outputText, { exports: helpers, require: (name) => (name === "next/font/google" ? fonts : require(name)) });

test("hatching leaves the notch of a concave shape blank", () => {
  const polygon = [[0, 0], [6, 0], [6, 6], [4, 6], [4, 2], [2, 2], [2, 6], [0, 6]];
  const strokes = helpers.hatch(polygon, 0, 2, "green");
  assert.deepEqual(Array.from(strokes, ({ from, to }) => [...from, ...to]), [
    [0, 1, 6, 1],
    [0, 3, 2, 3], [4, 3, 6, 3],
    [0, 5, 2, 5], [4, 5, 6, 5],
  ]);
});

test("a shape in front cuts a hole in the hatching behind it", () => {
  const square = [[0, 0], [6, 0], [6, 2], [0, 2]];
  const front = [[2, -1], [4, -1], [4, 3], [2, 3]];
  const strokes = helpers.hatch(square, 0, 2, "green", [front]);
  assert.deepEqual(Array.from(strokes, ({ from, to }) => [...from, ...to]), [
    [0, 1, 2, 1], [4, 1, 6, 1],
  ]);
});
