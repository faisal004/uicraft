// Captures each craft's social preview: a 1200×630 screenshot and a short looping mp4.
//
//   npm run dev            # in another terminal
//   npm run og             # every craft
//   npm run og pull-cord   # just the crafts you name
//
// Files land in public/og/<slug>.png and public/og/<slug>.mp4. The craft's opengraph-image route
// serves the png when it exists, and its metadata adds the mp4 as og:video.
// Needs Playwright's Chromium (`npx playwright install chromium`) and ffmpeg on the PATH.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.OG_BASE_URL ?? "http://localhost:3000";
const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT = path.join(ROOT, "src/content/craft");
const OUT = path.join(ROOT, "public/og");

// The craft layout has a 240px sidebar at desktop widths, so a 1440px window leaves the stage
// exactly 1200px wide.
const SIDEBAR = 240;
const WIDTH = 1200;
const HEIGHT = 630;
const CLIP_SECONDS = 4;

// How long to let a craft settle before the screenshot, in ms.
const SETTLE = { "text-to-particles": 4500, "world-clock-board": 3500, "svg-claw": 3200, "word-swap-claw": 4200 };

// Small crafts get a close-up: the demo is enlarged with CSS zoom, so it renders sharp at the bigger
// size while the stage's grid stays at its usual scale.
const ZOOM = { "tasteful-button": 3, "waving-flag": 2.5 };

// Crafts that only move when touched get a scripted touch while the video records.
const ACTIONS = {
  "tasteful-button": async (page) => {
    const button = page.locator(".craft-stage button").first();
    await button.hover();
    await page.waitForTimeout(700);
    await page.mouse.down();
    await page.waitForTimeout(180);
    await page.mouse.up();
  },
  "pull-cord": async (page) => {
    const box = await page.locator('.craft-stage [role="switch"]').boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 6, y + 105, { steps: 20 });
    await page.waitForTimeout(250);
    await page.mouse.up();
  },
  "lanyard-badge": async (page) => {
    const box = await page.locator('.craft-stage [role="button"]').first().boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 140, y + 30, { steps: 12 });
    await page.mouse.move(x + 60, y - 10, { steps: 4 });
    await page.mouse.up();
  },
  "thanos-snap": (page) => page.getByRole("button", { name: "Snap" }).click(),
  "view-transition": (page) => page.getByRole("button", { name: /A week of grey water/ }).click(),
  "genie-video": async (page) => {
    await page.mouse.move(SIDEBAR + WIDTH / 2, HEIGHT / 2);
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 70);
      await page.waitForTimeout(90);
    }
  },
  // The window controls sit under other hit areas, so fire the button's click directly rather than
  // clicking at its coordinates.
  "genie-minimize": async (page) => {
    await page.waitForTimeout(300);
    await page.locator('button[aria-label="Minimise Player"]').evaluate((button) => button.click());
    // Let it pour into the Dock, then click its Dock thumbnail so it pours back out.
    await page.waitForTimeout(1600);
    await page.locator('button[aria-label^="Restore"]:not([disabled])').first().evaluate((button) => button.click());
  },
};

function crafts() {
  return fs
    .readdirSync(CONTENT)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const source = fs.readFileSync(path.join(CONTENT, file), "utf8");
      const field = (name) => source.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1].trim();
      return { slug: file.replace(/\.mdx$/, ""), kind: field("kind"), concept: field("concept") };
    })
    .filter((craft) => craft.kind === "craft" && craft.concept);
}

async function capture(browser, { slug, concept }, tmp) {
  const context = await browser.newContext({
    viewport: { width: SIDEBAR + WIDTH, height: HEIGHT },
    colorScheme: "dark",
    recordVideo: { dir: tmp, size: { width: SIDEBAR + WIDTH, height: HEIGHT } },
  });
  // The site reads its theme from localStorage before the first paint.
  await context.addInitScript(() => localStorage.setItem("theme", "dark"));
  const page = await context.newPage();
  const started = Date.now();

  await page.goto(`${BASE}/craft/${concept}/${slug}`, { waitUntil: "networkidle" });
  // Hide the Next.js dev badge, and control panels a demo marks with data-og-hide.
  await page.addStyleTag({ content: "nextjs-portal, [data-og-hide] { display: none !important; }" });
  if (ZOOM[slug]) {
    await page.addStyleTag({ content: `.craft-stage > :not(h1) { zoom: ${ZOOM[slug]}; }` });
  }
  await page.waitForTimeout(SETTLE[slug] ?? 2000);

  await page.screenshot({
    path: path.join(OUT, `${slug}.png`),
    clip: { x: SIDEBAR, y: 0, width: WIDTH, height: HEIGHT },
  });
  const clipStart = Math.max(0, (Date.now() - started) / 1000 - 0.2);

  await ACTIONS[slug]?.(page);
  await page.waitForTimeout(CLIP_SECONDS * 1000);

  const video = page.video();
  await context.close();
  const webm = await video.path();

  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-ss", clipStart.toFixed(2), "-i", webm, "-t", String(CLIP_SECONDS),
    "-vf", `crop=${WIDTH}:${HEIGHT}:${SIDEBAR}:0,fps=30`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow",
    "-movflags", "+faststart", "-an",
    path.join(OUT, `${slug}.mp4`),
  ]);
}

// Use Playwright's own Chromium when it's installed. If it isn't, fall back to OG_CHROMIUM or the
// newest complete headless Chromium already in Playwright's cache, so a stalled download doesn't block.
async function launch() {
  if (process.env.OG_CHROMIUM) return chromium.launch({ executablePath: process.env.OG_CHROMIUM });
  try {
    return await chromium.launch();
  } catch (error) {
    const cache = path.join(os.homedir(), "Library/Caches/ms-playwright");
    const shells = fs.existsSync(cache)
      ? fs
          .readdirSync(cache)
          .filter((dir) => dir.startsWith("chromium_headless_shell-"))
          .filter((dir) => fs.existsSync(path.join(cache, dir, "INSTALLATION_COMPLETE")))
          .sort()
          .reverse()
      : [];
    for (const dir of shells) {
      const folder = fs.readdirSync(path.join(cache, dir)).find((name) => name.startsWith("chrome-headless-shell"));
      const binary = folder && path.join(cache, dir, folder, "chrome-headless-shell");
      if (binary && fs.existsSync(binary)) {
        console.log(`Using ${dir} (Playwright's own Chromium isn't installed)`);
        return chromium.launch({ executablePath: binary });
      }
    }
    throw error;
  }
}

const only = process.argv.slice(2);
const list = crafts().filter((craft) => only.length === 0 || only.includes(craft.slug));
if (list.length === 0) {
  console.error(`No crafts match: ${only.join(", ")}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "og-"));
const browser = await launch();
let failed = 0;

for (const craft of list) {
  try {
    await capture(browser, craft, tmp);
    const kb = (file) => Math.round(fs.statSync(path.join(OUT, file)).size / 1024);
    console.log(`✓ ${craft.slug}  png ${kb(`${craft.slug}.png`)} KB  mp4 ${kb(`${craft.slug}.mp4`)} KB`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${craft.slug}: ${error.message.split("\n")[0]}`);
  }
}

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
