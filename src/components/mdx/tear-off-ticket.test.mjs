import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./tear-off-ticket.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});
const helpers = {};
runInNewContext(outputText, { exports: helpers, require: createRequire(import.meta.url) });

test("each perforation snaps into place and the last one releases the stub", () => {
  const { tearGeometry } = helpers;
  assert.equal(tearGeometry(0).tip, 74);
  for (let i = 1; i <= 10; i++) {
    const before = tearGeometry(i / 10 - 0.001);
    const after = tearGeometry(i / 10);
    assert.equal(before.opened, i - 1);
    assert.equal(after.opened, i);
    assert.ok(after.tip - before.tip > 12);
    assert.equal(after.cut.match(/L /g).length, i * 4 + 1);
  }
  assert.equal(tearGeometry(1).tip, 252);
});

test("the stub lands exactly on its resting spot in the pile", () => {
  const { stubLanding, restFor, bodyFall, ticketEnter } = helpers;
  const release = { x: 12, y: -5, vx: 160, vy: -240 };
  const rest = restFor(42, release.vx);
  const start = stubLanding(0, release, rest);
  const end = stubLanding(0.75, release, rest);
  assert.deepEqual([start.x, start.y, start.scale, start.flip], [12, -5, 1, 1]);
  assert.ok(Math.abs(end.x - (rest.x - 470)) < 1e-6);
  assert.ok(Math.abs(end.y - (rest.y - 163)) < 1e-6);
  assert.ok(Math.abs(end.scale - 0.42) < 1e-6);
  assert.ok(Math.abs(end.flip - (rest.faceUp ? 1 : -1)) < 1e-6);
  assert.ok(bodyFall(0.9).y > 400);
  assert.equal(ticketEnter(0).opacity, 0);
  assert.ok(Math.abs(ticketEnter(0.95).y) < 0.5);
});

test("every ticket gets a repeatable design, seat and barcode", () => {
  const { themeFor, seatFor, barcodeFor } = helpers;
  assert.equal(themeFor(42).title.join(" "), "AFTER DARK");
  assert.notEqual(themeFor(43).title.join(" "), "AFTER DARK");
  assert.equal(themeFor(46), themeFor(42));
  assert.deepEqual(seatFor(57), seatFor(57));
  assert.notDeepEqual(barcodeFor(42), barcodeFor(43));
});

test("the copy/paste tab contains the exact live component", () => {
  const mdx = readFileSync(new URL("../../content/craft/tear-off-ticket.mdx", import.meta.url), "utf8");
  const copy = mdx.match(/```tsx title="tear-off-ticket\.tsx"\n([\s\S]*?)\n```/)?.[1];
  assert.equal(copy, source.trimEnd());
});
