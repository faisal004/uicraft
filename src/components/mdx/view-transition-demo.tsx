"use client";

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";

export function ViewTransitionDemo() {
  const [open, setOpen] = useState(false);
  const artwork = (
    <div className="vt-art" role="img" aria-label="Illustrated desert mountains at sunset">
      <span className="vt-sun" aria-hidden="true" />
      <span className="vt-art-label">FIELD NOTES<br />THE WEST</span>
      <span className="vt-art-number">01</span>
    </div>
  );

  function toggle() {
    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setOpen((current) => !current);
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => setOpen((current) => !current));
    });
  }

  return (
    <div className="vt-demo mt-10">
      <div className="vt-header">
        <span className="vt-wordmark">FIELD NOTES <span>/ VOL. 01</span></span>
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls="vt-story">
          {open ? <ArrowLeft size={16} aria-hidden="true" /> : null}
          {open ? "Back to cover" : "Read the story"}
          {open ? null : <ArrowUpRight size={16} aria-hidden="true" />}
        </button>
      </div>
      <div id="vt-story" className={open ? "vt-detail" : "vt-cover"}>
        {artwork}
        <div className="vt-copy">
          <div className="vt-meta"><span>TRAVEL JOURNAL</span><span>04 MIN READ</span></div>
          <h3>Where the light stays longer</h3>
          <p>{open
            ? "The last hour of daylight changes the shape of everything. Open the story, then return to the cover to follow the same image in reverse."
            : "A short story about the stillness of the desert at dusk."}</p>
          <div className="vt-copy-footer"><span>01 / THE WEST</span><span>FIELD NOTES</span></div>
        </div>
      </div>

      <style>{`
        .vt-demo {
          padding: clamp(1.25rem, 4vw, 2.5rem);
          border: 1px solid #ded8cf;
          border-radius: .75rem;
          background: #f5f2ec;
          color: #292823;
          font-family: system-ui, sans-serif;
        }
        .vt-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid #d8d0c6; }
        .vt-wordmark { font-size: .8rem; font-weight: 750; }
        .vt-wordmark span { margin-left: .35rem; color: #857f75; font-weight: 500; }
        .vt-header button {
          display: inline-flex;
          align-items: center;
          gap: .75rem;
          padding: .65rem .9rem;
          border: 1px solid #292823;
          border-radius: .4rem;
          background: #292823;
          color: #fffaf2;
          font-size: .8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .vt-header button:hover { background: #45433d; }
        .vt-header button:focus-visible { outline: 2px solid #a6563e; outline-offset: 3px; }
        .vt-header button svg { flex: none; }
        .vt-cover, .vt-detail { display: grid; align-items: center; gap: clamp(1.5rem, 5vw, 3rem); margin: 2.5rem auto 0; }
        .vt-cover { max-width: 43rem; grid-template-columns: minmax(0, 14rem) minmax(0, 1fr); }
        .vt-detail { max-width: 42rem; gap: 2rem; }
        .vt-art {
          view-transition-name: uicraft-cover;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          aspect-ratio: 4 / 5;
          border-radius: .25rem;
          background: #cc846b;
          box-shadow: 0 16px 30px #34251d26;
        }
        .vt-sun { position: absolute; top: 24%; left: 55%; width: 32%; aspect-ratio: 1; border-radius: 50%; background: #f2d1a5; }
        .vt-art::before, .vt-art::after { content: ""; position: absolute; left: -15%; width: 130%; height: 52%; border-radius: 50% 50% 0 0; }
        .vt-art::before { bottom: -18%; background: #a95f50; transform: rotate(-9deg); }
        .vt-art::after { bottom: -33%; background: #63483f; transform: rotate(12deg); }
        .vt-art-label, .vt-art-number { position: absolute; z-index: 1; color: #fff8ee; font-family: ui-monospace, monospace; font-weight: 600; }
        .vt-art-label { top: 7%; left: 8%; font-size: clamp(.6rem, 1.6vw, .85rem); line-height: 1.5; }
        .vt-art-number { right: 8%; bottom: 7%; font-size: clamp(1.5rem, 4vw, 2.5rem); line-height: 1; }
        .vt-copy { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
        .vt-meta, .vt-copy-footer { display: flex; justify-content: space-between; gap: 1rem; font: 600 .65rem/1.4 ui-monospace, monospace; color: #a6563e; }
        .vt-copy h3 { margin: 1.25rem 0 0; max-width: 18ch; font-size: clamp(1.8rem, 4vw, 3rem); line-height: 1.08; font-weight: 550; text-wrap: balance; }
        .vt-copy > p { max-width: 46ch; margin: 1rem 0 0; color: #6d695f; font-size: .9rem; line-height: 1.7; text-wrap: pretty; }
        .vt-copy-footer { margin-top: 2rem; padding-top: .9rem; border-top: 1px solid #d8d0c6; color: #857f75; }
        .vt-detail .vt-art { width: 100%; aspect-ratio: 16 / 9; }
        .vt-detail .vt-copy { width: 100%; }
        ::view-transition-group(uicraft-cover) { animation-duration: 450ms; animation-timing-function: ease-in-out; }
        @media (max-width: 600px) { .vt-cover { max-width: 26rem; grid-template-columns: 1fr; } .vt-cover .vt-art { width: min(100%, 14rem); } }
      `}</style>
    </div>
  );
}
