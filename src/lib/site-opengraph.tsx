import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

import { getCraftContent } from "@/lib/content";

export const siteOpenGraphSize = {
  width: 1200,
  height: 630,
};

export const siteOpenGraphAlt =
  "UIcraft, Faisal Husain's playground for rebuilding interface interactions that catch his eye.";

const fontsDirectory = path.join(process.cwd(), "src/assets/fonts");

const glyphs = " .,:;+=xX#";

function asciiField(columns: number, rows: number) {
  let seed = 20261002;

  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };

  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => glyphs[next() % glyphs.length]).join(""),
  ).join("\n");
}

async function loadFonts() {
  const [pixel, sans, medium, mono] = await Promise.all([
    readFile(path.join(fontsDirectory, "GeistPixel-Regular.woff")),
    readFile(path.join(fontsDirectory, "Geist-Regular.woff")),
    readFile(path.join(fontsDirectory, "Geist-Medium.woff")),
    readFile(path.join(fontsDirectory, "GeistMono-Regular.woff")),
  ]);

  return [
    { name: "Geist Pixel", data: pixel, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: sans, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ];
}

export async function createSiteOpenGraph() {
  const fonts = await loadFonts();
  const studies = getCraftContent();
  const field = asciiField(28, 22);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#1736f5",
          color: "#f4ff8c",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "54px 68px 48px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            color: "#f4ff8c",
            display: "flex",
            fontFamily: "Geist Mono",
            fontSize: 13,
            height: 300,
            letterSpacing: 1.4,
            lineHeight: 1.2,
            maskImage: "radial-gradient(circle at 70% 40%, black 0%, transparent 68%)",
            opacity: 0.5,
            position: "absolute",
            right: 36,
            top: 132,
            whiteSpace: "pre",
            width: 360,
          }}
        >
          {field}
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 14 }}>
            <div style={{ background: "#181916", display: "flex", height: 14, width: 14 }} />
            <div style={{ display: "flex", fontFamily: "Geist", fontSize: 28, fontWeight: 500 }}>
              UIcraft
            </div>
          </div>
          <div style={{ display: "flex", fontFamily: "Geist", fontSize: 22, opacity: 0.72 }}>
            Personal experiments, ongoing
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", position: "relative", width: 760 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist Pixel",
              fontSize: 76,
              lineHeight: 0.92,
            }}
          >
            Saw something cool.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist Pixel",
              fontSize: 76,
              lineHeight: 0.92,
              marginTop: 10,
            }}
          >
            Had to know how
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist Pixel",
              fontSize: 76,
              lineHeight: 0.92,
              marginTop: 10,
            }}
          >
            it worked.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist",
              fontSize: 28,
              marginTop: 32,
              opacity: 0.78,
            }}
          >
            A place to remake what catches my eye.
          </div>
        </div>

        <div
          style={{
            alignItems: "flex-end",
            display: "flex",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontFamily: "Geist", fontSize: 26, fontWeight: 500 }}>
              Faisal Husain
            </div>
            <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 16, opacity: 0.62 }}>
              faisalhusa.in
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: 520,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Geist Mono",
                fontSize: 15,
                justifyContent: "space-between",
                opacity: 0.62,
              }}
            >
              <span>All experiments</span>
              <span>{String(studies.length).padStart(2, "0")}</span>
            </div>
            <div style={{ background: "rgba(244,255,140,0.4)", display: "flex", height: 1, width: "100%" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: 520 }}>
              {studies.map((study) => (
                <div
                  key={study.slug}
                  style={{
                    display: "flex",
                    fontFamily: "Geist",
                    fontSize: 20,
                    marginRight: 18,
                  }}
                >
                  {study.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...siteOpenGraphSize,
      fonts,
    },
  );
}
