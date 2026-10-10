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
  color = "#fcd34d",
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
      if (!file || !file.type.startsWith("image/")) {
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
    `border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none ${
      active
        ? "border-white bg-white text-[#0b1018]"
        : "border-white/20 text-white/65 hover:border-white/60 hover:text-white"
    }`;

  return (
    <div
      className={`mx-auto w-full max-w-3xl border border-white/15 bg-[#0b1018] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:p-6 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
        <span>Image to bitmap</span>
        <span>
          {cols} cols · {mode}
        </span>
      </div>

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
        className={`my-4 flex min-h-[240px] items-center justify-center border border-dashed transition-colors motion-reduce:transition-none ${
          dragging ? "border-white bg-white/5" : "border-white/15"
        }`}
      >
        {img ? (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Bitmap rendering of the uploaded image"
            className="block h-auto w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-10 font-mono text-xs uppercase tracking-[0.18em] text-white/60 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white"
          >
            Drop an image or click to upload
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-3 font-mono text-[10px] uppercase tracking-wider text-red-300">
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => loadFile(e.target.files?.[0])}
      />

      <div className="grid gap-4 border-t border-white/15 pt-4">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Render mode">
          {MODES.map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={btn(mode === m)}>
              {m}
            </button>
          ))}
        </div>

        <div className="grid gap-3 font-mono text-[10px] uppercase tracking-wider text-white/65 sm:grid-cols-2">
          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0">Cols {cols}</span>
            <input
              type="range"
              min={16}
              max={160}
              step={2}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-full accent-white"
            />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0">Level {threshold}</span>
            <input
              type="range"
              min={20}
              max={236}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-white"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-1">
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
          <button type="button" onClick={() => fileRef.current?.click()} className={btn(false)}>
            Replace
          </button>
          <button type="button" disabled={!img} onClick={download} className={`${btn(false)} disabled:opacity-40`}>
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
