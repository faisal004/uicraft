"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "binary" | "halftone" | "bayer" | "dither";
type ColorMode = "mono" | "original";

const MODES: Mode[] = ["binary", "halftone", "bayer", "dither"];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const CELL = 10;

type Props = {
  src?: string;
  cols?: number;
  mode?: Mode;
  color?: string;
  className?: string;
};

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function ImageBitmap({
  src,
  cols: initialCols = 64,
  mode: initialMode = "halftone",
  color = "#f4f4f4",
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const loadIdRef = useRef(0);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cols, setCols] = useState(initialCols);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [colorMode, setColorMode] = useState<ColorMode>("mono");
  const [threshold, setThreshold] = useState(128);
  const [invert, setInvert] = useState(false);

  const loadUrl = useCallback((url: string, isObjectUrl: boolean) => {
    const loadId = ++loadIdRef.current;
    const image = new Image();
    if (!isObjectUrl) image.crossOrigin = "anonymous";
    image.onload = () => {
      if (loadId !== loadIdRef.current) {
        if (isObjectUrl) URL.revokeObjectURL(url);
        return;
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = isObjectUrl ? url : null;
      setError(null);
      setImg(image);
    };
    image.onerror = () => {
      if (isObjectUrl) URL.revokeObjectURL(url);
      if (loadId === loadIdRef.current) setError("Could not load image.");
    };
    image.src = url;
  }, []);

  const loadFile = useCallback(
    (file?: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.");
        return;
      }
      loadUrl(URL.createObjectURL(file), true);
    },
    [loadUrl]
  );

  useEffect(() => {
    if (src) loadUrl(src, false);
  }, [src, loadUrl]);

  useEffect(
    () => () => {
      loadIdRef.current++;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const rows = Math.max(1, Math.round((cols * img.naturalHeight) / img.naturalWidth));
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return;

    octx.fillStyle = "#000";
    octx.fillRect(0, 0, cols, rows);
    octx.drawImage(img, 0, 0, cols, rows);

    let data: Uint8ClampedArray;
    try {
      data = octx.getImageData(0, 0, cols, rows).data;
    } catch {
      // Canvas taint is only detected when pixels are read.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Image is cross-origin and can't be read. Upload it or enable CORS.");
      return;
    }

    const count = cols * rows;
    const bias = 128 - threshold;
    const lum = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      if (invert) l = 255 - l;
      lum[i] = clamp(l + bias);
    }

    // on/off map for non-halftone modes
    const on = new Uint8Array(count);
    if (mode === "binary") {
      for (let i = 0; i < count; i++) on[i] = lum[i] > 128 ? 1 : 0;
    } else if (mode === "bayer") {
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const t = ((BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16) * 255;
          on[y * cols + x] = lum[y * cols + x] > t ? 1 : 0;
        }
    } else if (mode === "dither") {
      const buf = Float32Array.from(lum);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const old = buf[i];
          const next = old > 128 ? 255 : 0;
          on[i] = next ? 1 : 0;
          const err = old - next;
          if (x + 1 < cols) buf[i + 1] += (err * 7) / 16;
          if (y + 1 < rows) {
            if (x > 0) buf[i + cols - 1] += (err * 3) / 16;
            buf[i + cols] += (err * 5) / 16;
            if (x + 1 < cols) buf[i + cols + 1] += (err * 1) / 16;
          }
        }
    }

    canvas.width = cols * CELL;
    canvas.height = rows * CELL;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const TAU = Math.PI * 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const cx = x * CELL + CELL / 2;
        const cy = y * CELL + CELL / 2;
        const fill =
          colorMode === "original"
            ? `rgb(${data[i * 4]},${data[i * 4 + 1]},${data[i * 4 + 2]})`
            : color;

        let radius: number;
        let lit: boolean;
        if (mode === "halftone") {
          const v = lum[i] / 255;
          radius = Math.sqrt(v) * CELL * 0.5;
          lit = radius > 0.4;
        } else {
          lit = on[i] === 1;
          radius = CELL * 0.42;
        }

        if (!lit) {
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.beginPath();
          ctx.arc(cx, cy, CELL * 0.3, 0, TAU);
          ctx.fill();
          continue;
        }
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, TAU);
        ctx.fill();
      }
    }
  }, [img, cols, mode, colorMode, threshold, invert, color]);

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "bitmap.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  };

  const btn = (active: boolean) =>
    `border px-3 py-2 text-xs font-medium outline-none transition-colors active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-600 motion-reduce:transition-none dark:focus-visible:ring-blue-300 ${
      active
        ? "border-(--demo-ink) bg-(--demo-ink) text-(--demo-bg)"
        : "border-(--demo-border) bg-(--demo-bg) text-(--demo-muted) hover:border-(--demo-ink) hover:text-(--demo-ink)"
    }`;

  const slider =
    "h-1.5 w-full cursor-pointer appearance-none outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-300 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-(--demo-bg) [&::-moz-range-thumb]:bg-(--demo-ink) [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-(--demo-bg) [&::-webkit-slider-thumb]:bg-(--demo-ink)";

  return (
    <div
      className={`w-full overflow-hidden border border-(--demo-border) bg-(--demo-bg) text-(--demo-ink) [--demo-bg:#fff] [--demo-bar:#eeeeeb] [--demo-border:#d8d8d4] [--demo-ink:#181916] [--demo-muted:#595b55] [--demo-subtle:#696b64] [--demo-track:#d8d8d4] dark:[--demo-bg:#2b2b2b] dark:[--demo-bar:#242424] dark:[--demo-border:#4b4b4b] dark:[--demo-ink:#f4f4f4] dark:[--demo-muted:#bdbdbd] dark:[--demo-subtle:#a3a3a3] dark:[--demo-track:#4b4b4b] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-(--demo-border) bg-(--demo-bar) px-4 py-3 sm:px-5">
        <span className="text-xs font-medium">Image / bitmap</span>
        <span className="font-mono text-[11px] tabular-nums text-(--demo-subtle)">
          {img ? `${cols} × ${Math.max(1, Math.round((cols * img.naturalHeight) / img.naturalWidth))} samples` : "Choose an image"}
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          loadFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="grid md:grid-cols-[minmax(0,1fr)_280px]">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            loadFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex h-80 min-w-0 items-center justify-center overflow-hidden bg-[#111214] p-5 sm:h-[430px] sm:p-8 ${dragging ? "outline-2 outline-offset-[-8px] outline-white/70" : ""}`}
        >
          {img ? (
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Bitmap rendering of the uploaded image"
              className="block h-auto max-h-full max-w-full object-contain"
            />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-white/30 px-8 py-12 text-sm text-white/70 outline-none hover:border-white/70 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              Drop an image or choose a file
            </button>
          )}
        </div>
        <div className="grid content-start gap-6 border-t border-(--demo-border) p-5 md:border-t-0 md:border-l">
          <div className="grid gap-3">
            <span className="text-xs font-medium">Render mode</span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Render mode">
              {MODES.map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={btn(mode === m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <label className="grid gap-3 text-xs">
            <span className="flex items-center justify-between">
              <span className="font-medium">Columns</span>
              <output className="font-mono tabular-nums text-(--demo-subtle)">{cols}</output>
            </span>
            <input
              type="range"
              min={16}
              max={160}
              step={2}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className={slider}
              style={{ background: `linear-gradient(to right, var(--demo-ink) ${((cols - 16) / 144) * 100}%, var(--demo-track) 0)` }}
            />
            <span className="flex justify-between font-mono text-[10px] tabular-nums text-(--demo-subtle)">
              <span>16</span><span>160</span>
            </span>
          </label>
          <label className="grid gap-3 text-xs">
            <span className="flex items-center justify-between">
              <span className="font-medium">Threshold</span>
              <output className="font-mono tabular-nums text-(--demo-subtle)">{threshold}</output>
            </span>
            <input
              type="range"
              min={20}
              max={236}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className={slider}
              style={{ background: `linear-gradient(to right, var(--demo-ink) ${((threshold - 20) / 216) * 100}%, var(--demo-track) 0)` }}
            />
            <span className="flex justify-between font-mono text-[10px] tabular-nums text-(--demo-subtle)">
              <span>20</span><span>236</span>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2 border-t border-(--demo-border) pt-5">
            <button type="button" aria-pressed={invert} onClick={() => setInvert((v) => !v)} className={btn(invert)}>
              Invert
            </button>
            <button
              type="button"
              aria-pressed={colorMode === "original"}
              onClick={() => setColorMode((c) => (c === "mono" ? "original" : "mono"))}
              className={btn(colorMode === "original")}
            >
              Original color
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className={btn(false)}>
              Replace
            </button>
            <button type="button" disabled={!img} onClick={download} className={`${btn(false)} disabled:opacity-40`}>
              Save PNG
            </button>
          </div>
          {error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
}
