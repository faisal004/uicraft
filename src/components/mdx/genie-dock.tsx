"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

// A desktop dock with smooth magnification, launch bounces and a slot for a minimised window.
// The icons are original drawings in a glossy squircle style, not any real product's artwork.

const ICON = 54; // resting icon size in CSS px
const MAGNIFY = 0.62; // extra scale right under the pointer
const REACH = 150; // how far the lens spreads, in CSS px
const EASE = 0.22; // how quickly sizes chase their target each frame (0..1)
const PAD = 7;

// ---------- clock / date, client-only so server and client markup match ----------

export function useNow(intervalMs = 15000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}

// ---------- icons ----------

function Tile({ id, from, to, children }: { id: string; from: string; to: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className="block size-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${id}-hl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x="4" y="4" width="92" height="92" rx="22" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${id}-bg)`} />
        {children}
        <rect x="0" y="0" width="100" height="100" fill={`url(#${id}-hl)`} opacity="0.55" />
      </g>
      <rect x="4.5" y="4.5" width="91" height="91" rx="21.5" fill="none" stroke="#000" strokeOpacity="0.12" />
    </svg>
  );
}

const FilesIcon = () => (
  <Tile id="dk-files" from="#7fd0ff" to="#1f6fe6">
    <path d="M18 34 q0-6 6-6 h18 l6 6 h28 q6 0 6 6 v34 q0 6-6 6 H24 q-6 0-6-6z" fill="#cfe8ff" />
    <path d="M18 42 q0-5 5-5 h54 q5 0 5 5 v33 q0 5-5 5 H23 q-5 0-5-5z" fill="#fff" fillOpacity="0.95" />
    <rect x="26" y="50" width="30" height="4" rx="2" fill="#7fb8f5" />
  </Tile>
);

const BrowserIcon = () => (
  <Tile id="dk-browser" from="#ffffff" to="#dfe6ef">
    <circle cx="50" cy="50" r="35" fill="#1a6be0" />
    <circle cx="50" cy="50" r="31" fill="#3fa2ff" />
    {Array.from({ length: 24 }, (_, i) => (
      <line key={i} x1="50" y1="21" x2="50" y2={i % 2 ? 25 : 27} stroke="#fff" strokeOpacity="0.85" strokeWidth="1.2" transform={`rotate(${i * 15} 50 50)`} />
    ))}
    <g transform="rotate(45 50 50)">
      <path d="M50 26 L56 50 L44 50 Z" fill="#ff3b30" />
      <path d="M50 74 L56 50 L44 50 Z" fill="#fff" />
    </g>
    <circle cx="50" cy="50" r="2.5" fill="#fff" />
  </Tile>
);

const MailIcon = () => (
  <Tile id="dk-mail" from="#6fd0ff" to="#1673f0">
    <rect x="18" y="30" width="64" height="42" rx="5" fill="#fff" />
    <path d="M19 32 L50 54 L81 32" fill="none" stroke="#b7dcfa" strokeWidth="3.5" strokeLinejoin="round" />
  </Tile>
);

const NotesIcon = () => (
  <Tile id="dk-notes" from="#fffef8" to="#f1eee4">
    <rect x="0" y="0" width="100" height="30" fill="#ffd84d" />
    <rect x="0" y="22" width="100" height="8" fill="#f5c22c" />
    {[3, 13, 23, 33, 43, 53, 63, 73, 83, 93].map((x) => (
      <circle key={x} cx={x} cy="31" r="1.3" fill="#d9d4c4" />
    ))}
    {[46, 58, 70, 82].map((y) => (
      <line key={y} x1="14" y1={y} x2="86" y2={y} stroke="#e2ddcf" strokeWidth="1.6" />
    ))}
  </Tile>
);

function CalendarIcon({ now }: { now: Date | null }) {
  const weekday = now ? now.toLocaleDateString("en", { weekday: "short" }).toUpperCase() : "";
  const day = now ? String(now.getDate()) : "";
  return (
    <Tile id="dk-cal" from="#ffffff" to="#f2f2f2">
      <text x="50" y="30" textAnchor="middle" fontSize="15" fontWeight="600" fill="#ff3b30" fontFamily="ui-sans-serif, system-ui, sans-serif">
        {weekday}
      </text>
      <text x="50" y="77" textAnchor="middle" fontSize="48" fontWeight="300" fill="#1d1d1f" fontFamily="ui-sans-serif, system-ui, sans-serif">
        {day}
      </text>
    </Tile>
  );
}

const MessagesIcon = () => (
  <Tile id="dk-msg" from="#7af58f" to="#13b53a">
    <ellipse cx="50" cy="47" rx="30" ry="24" fill="#fff" />
    <path d="M30 62 Q28 74 20 78 Q34 77 42 68 Z" fill="#fff" />
  </Tile>
);

const MusicIcon = () => (
  <Tile id="dk-music" from="#ff8297" to="#f0203f">
    <path d="M42 30 L70 24 V62" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M42 30 V68" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
    <ellipse cx="35" cy="69" rx="9" ry="7" fill="#fff" />
    <ellipse cx="63" cy="63" rx="9" ry="7" fill="#fff" />
  </Tile>
);

const PhotosIcon = () => (
  <Tile id="dk-photos" from="#8fd3ff" to="#d8f1ff">
    <circle cx="68" cy="34" r="9" fill="#ffd34d" />
    <path d="M0 78 L28 46 L48 66 L64 52 L100 82 V100 H0Z" fill="#3aa35a" />
    <path d="M0 86 L22 70 L44 84 L70 72 L100 90 V100 H0Z" fill="#2a7d44" />
  </Tile>
);

const TerminalIcon = () => (
  <Tile id="dk-term" from="#3a3a40" to="#141416">
    <rect x="0" y="0" width="100" height="16" fill="#55555c" />
    <path d="M24 42 L36 52 L24 62" fill="none" stroke="#e8e8ea" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="42" y="60" width="20" height="4.5" rx="2" fill="#e8e8ea" />
  </Tile>
);

const SettingsIcon = () => (
  <Tile id="dk-settings" from="#d3d6dc" to="#7d828d">
    <g fill="#4a4e57">
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x="46" y="17" width="8" height="14" rx="2" transform={`rotate(${i * 36} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="24" />
    </g>
    <circle cx="50" cy="50" r="17" fill="#a9adb6" />
    <circle cx="50" cy="50" r="8" fill="#4a4e57" />
  </Tile>
);

const PlayerIcon = () => (
  <Tile id="dk-player" from="#b9a2ff" to="#5530d4">
    <circle cx="50" cy="50" r="28" fill="#fff" fillOpacity="0.18" />
    <path d="M42 34 Q42 30 46 32 L68 47 Q71 50 68 53 L46 68 Q42 70 42 66 Z" fill="#fff" />
  </Tile>
);

const TrashIcon = () => (
  <svg viewBox="0 0 100 100" className="block size-full" aria-hidden="true">
    <defs>
      <linearGradient id="dk-trash" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.12" />
        <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
      </linearGradient>
    </defs>
    <path d="M24 24 H76 L71 90 Q70 94 66 94 H34 Q30 94 29 90 Z" fill="url(#dk-trash)" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" />
    <ellipse cx="50" cy="24" rx="27" ry="5" fill="#fff" fillOpacity="0.2" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" />
    {[38, 50, 62].map((x) => (
      <line key={x} x1={x} y1="34" x2={x} y2="86" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
    ))}
  </svg>
);

// ---------- dock ----------

type AppItem = { kind: "app"; name: string; icon: (now: Date | null) => ReactNode; alwaysRunning?: boolean };
type Item = AppItem | { kind: "divider" } | { kind: "slot"; id: string; title: string } | { kind: "trash" };

const APPS: AppItem[] = [
  { kind: "app", name: "Files", icon: () => <FilesIcon />, alwaysRunning: true },
  { kind: "app", name: "Browser", icon: () => <BrowserIcon />, alwaysRunning: true },
  { kind: "app", name: "Mail", icon: () => <MailIcon /> },
  { kind: "app", name: "Notes", icon: () => <NotesIcon /> },
  { kind: "app", name: "Calendar", icon: (now) => <CalendarIcon now={now} /> },
  { kind: "app", name: "Messages", icon: () => <MessagesIcon /> },
  { kind: "app", name: "Music", icon: () => <MusicIcon /> },
  { kind: "app", name: "Photos", icon: () => <PhotosIcon /> },
  { kind: "app", name: "Terminal", icon: () => <TerminalIcon /> },
  { kind: "app", name: "Settings", icon: () => <SettingsIcon /> },
  { kind: "app", name: "Player", icon: () => <PlayerIcon /> },
];

export type DockSlot = { id: string; title: string; open: boolean; minimised: boolean };

export function GenieDock({
  side = "bottom",
  slots,
  running,
  onApp,
  onRestore,
  iconElements,
  slotElements,
}: {
  side?: "bottom" | "left" | "right";
  slots: DockSlot[];
  running: Record<string, boolean>;
  // Return true if the app handled the click (it opened, restored or focused a window).
  onApp: (name: string) => boolean;
  onRestore: (id: string) => void;
  iconElements: RefObject<Record<string, HTMLElement | null>>;
  slotElements: RefObject<Record<string, HTMLElement | null>>;
}) {
  const now = useNow();
  const vertical = side !== "bottom";
  const items: Item[] = [...APPS, { kind: "divider" }, ...slots.map((slot) => ({ kind: "slot" as const, id: slot.id, title: slot.title })), { kind: "trash" }];
  const cellRefs = useRef<(HTMLElement | null)[]>([]);
  const iconRefs = useRef<(HTMLElement | null)[]>([]);
  const tipRefs = useRef<(HTMLElement | null)[]>([]);
  const pointerRef = useRef<number | null>(null);
  const itemsRef = useRef(items);
  const sideRef = useRef(side);
  const slotOpenRef = useRef<Record<string, boolean>>({});
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    itemsRef.current = items;
    sideRef.current = side;
    slotOpenRef.current = Object.fromEntries(slots.map((slot) => [slot.id, slot.open]));
  });

  // One frame loop eases every icon toward its target size, so the lens glides instead of snapping.
  // Along a bottom dock the lens follows the pointer's x; along a side dock, its y.
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sizes: number[] = [];
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const pointer = pointerRef.current;
      const isVertical = sideRef.current !== "bottom";
      itemsRef.current.forEach((item, i) => {
        const cell = cellRefs.current[i];
        if (!cell || item.kind === "divider") return;
        const base = item.kind === "slot" ? (slotOpenRef.current[item.id] ? ICON : 0) : ICON;
        if (sizes[i] === undefined) sizes[i] = base;
        let target = base;
        if (pointer !== null && base > 0) {
          const r = cell.getBoundingClientRect();
          const centre = isVertical ? r.top + r.height / 2 : r.left + r.width / 2;
          const t = Math.max(0, 1 - Math.abs(pointer - centre) / REACH);
          target = base * (1 + MAGNIFY * (0.5 - 0.5 * Math.cos(t * Math.PI)));
        }
        sizes[i] = motion.matches ? target : sizes[i] + (target - sizes[i]) * EASE;
        if (Math.abs(target - sizes[i]) < 0.05) sizes[i] = target;
        const size = sizes[i];
        // The cell grows along the dock; the icon grows out of the shelf toward the screen.
        if (isVertical) {
          cell.style.height = `${size}px`;
          cell.style.width = `${ICON + PAD}px`;
        } else {
          cell.style.width = `${size}px`;
          cell.style.height = `${ICON + PAD}px`;
        }
        const icon = iconRefs.current[i];
        if (icon) {
          icon.style.width = `${size}px`;
          icon.style.height = `${size}px`;
        }
        const tip = tipRefs.current[i];
        if (tip) {
          tip.style.bottom = tip.style.left = tip.style.right = "";
          if (sideRef.current === "bottom") tip.style.bottom = `${size + 12}px`;
          else if (sideRef.current === "left") tip.style.left = `${size + 16}px`;
          else tip.style.right = `${size + 16}px`;
        }
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const bounce = (i: number) => {
    const icon = iconRefs.current[i];
    if (!icon || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    icon.style.animation = "none";
    void icon.offsetWidth; // restart the animation
    const name = side === "bottom" ? "genie-dock-bounce" : side === "left" ? "genie-dock-bounce-right" : "genie-dock-bounce-left";
    icon.style.animation = `${name} 1.1s cubic-bezier(0.3, 0.7, 0.4, 1)`;
  };

  // Where the icon sits in its cell, and where the running dot and label go, for each side.
  const iconPlace = side === "bottom" ? "bottom-[7px] left-1/2 -translate-x-1/2" : side === "left" ? "left-[7px] top-1/2 -translate-y-1/2" : "right-[7px] top-1/2 -translate-y-1/2";
  const dotPlace = side === "bottom" ? "bottom-[1px] left-1/2 -translate-x-1/2" : side === "left" ? "left-[1px] top-1/2 -translate-y-1/2" : "right-[1px] top-1/2 -translate-y-1/2";
  const tipPlace = side === "bottom" ? "left-1/2 -translate-x-1/2" : "top-1/2 -translate-y-1/2";
  const cellSize = (width: number) => (vertical ? { width: ICON + PAD, height: width } : { width, height: ICON + PAD });

  return (
    <nav
      aria-label="Dock"
      className={
        side === "bottom"
          ? "absolute inset-x-0 bottom-2 z-0 flex justify-center px-4"
          : `absolute inset-y-0 top-7 z-0 flex items-center py-4 ${side === "left" ? "left-2" : "right-2"}`
      }
      onMouseMove={(event) => {
        pointerRef.current = vertical ? event.clientY : event.clientX;
      }}
      onMouseLeave={() => {
        pointerRef.current = null;
        setHovered(null);
      }}
    >
      <style>{`
        @keyframes genie-dock-bounce {
          0%, 100% { transform: translateY(0); }
          18% { transform: translateY(-46%); } 36% { transform: translateY(0); }
          52% { transform: translateY(-24%); } 68% { transform: translateY(0); }
          80% { transform: translateY(-8%); }
        }
        @keyframes genie-dock-bounce-right {
          0%, 100% { transform: translateX(0); }
          18% { transform: translateX(46%); } 36% { transform: translateX(0); }
          52% { transform: translateX(24%); } 68% { transform: translateX(0); }
          80% { transform: translateX(8%); }
        }
        @keyframes genie-dock-bounce-left {
          0%, 100% { transform: translateX(0); }
          18% { transform: translateX(-46%); } 36% { transform: translateX(0); }
          52% { transform: translateX(-24%); } 68% { transform: translateX(0); }
          80% { transform: translateX(-8%); }
        }
      `}</style>
      {/* The glass shelf keeps a fixed thickness; magnified icons rise out of it toward the screen. */}
      <div
        className={`relative flex rounded-[20px] border border-white/25 bg-white/18 shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl backdrop-saturate-[1.8] ${
          vertical ? `flex-col ${side === "left" ? "items-start" : "items-end"}` : "items-end"
        }`}
        style={vertical ? { width: ICON + PAD * 2, paddingBlock: PAD - 2 } : { height: ICON + PAD * 2, paddingInline: PAD - 2 }}
      >
        {items.map((item, i) => {
          if (item.kind === "divider") {
            return (
              <span
                key="divider"
                aria-hidden="true"
                className={vertical ? `my-[6px] h-px w-[78%] bg-white/30 ${side === "left" ? "ml-[6px]" : "mr-[6px]"}` : "mx-[6px] mb-[6px] h-[78%] w-px self-end bg-white/30"}
              />
            );
          }
          const label = item.kind === "app" ? item.name : item.kind === "trash" ? "Trash" : item.title;
          const tip =
            hovered === i ? (
              <span
                ref={(el) => {
                  tipRefs.current[i] = el;
                }}
                className={`pointer-events-none absolute z-10 rounded-md border border-white/10 bg-[#2a2a2e]/90 px-2.5 py-[3px] text-[12px] whitespace-nowrap text-white/95 shadow-lg ${tipPlace}`}
                style={side === "bottom" ? { bottom: ICON + 12 } : side === "left" ? { left: ICON + 16 } : { right: ICON + 16 }}
              >
                {label}
              </span>
            ) : null;
          const cellRef = (el: HTMLElement | null) => {
            cellRefs.current[i] = el;
          };
          const iconRef = (el: HTMLElement | null) => {
            iconRefs.current[i] = el;
          };

          if (item.kind === "slot") {
            const slot = slots.find((entry) => entry.id === item.id);
            return (
              <button
                key={`slot-${item.id}`}
                ref={cellRef}
                type="button"
                onMouseEnter={() => setHovered(i)}
                onClick={() => onRestore(item.id)}
                disabled={!slot?.minimised}
                aria-label={`Restore ${item.title}`}
                className="relative shrink-0 cursor-default outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-white/70"
                style={cellSize(0)}
              >
                {slot?.minimised && tip}
                <span ref={iconRef} className={`absolute flex items-center ${iconPlace}`} style={{ width: 0, height: 0 }}>
                  {/* A minimised window lands on this box (its aspect is set by the window). */}
                  <div
                    ref={(el) => {
                      slotElements.current[item.id] = el;
                    }}
                    aria-hidden="true"
                    className="aspect-[16/10] w-full"
                  />
                </span>
              </button>
            );
          }

          const isRunning = item.kind === "app" && (item.alwaysRunning || running[item.name]);
          return (
            <button
              key={item.kind === "app" ? item.name : "trash"}
              ref={cellRef}
              type="button"
              onMouseEnter={() => setHovered(i)}
              aria-label={label}
              onClick={() => {
                const handled = item.kind === "app" && onApp(item.name);
                if (!handled || (item.kind === "app" && !running[item.name])) bounce(i);
              }}
              className="relative shrink-0 cursor-default outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-white/70"
              style={cellSize(ICON)}
            >
              {tip}
              <span
                ref={(el) => {
                  iconRef(el);
                  if (item.kind === "app") iconElements.current[item.name] = el;
                }}
                className={`absolute block rounded-[22%] drop-shadow-[0_3px_5px_rgba(0,0,0,0.3)] ${iconPlace}`}
                style={{ width: ICON, height: ICON }}
              >
                {item.kind === "app" ? item.icon(now) : <TrashIcon />}
              </span>
              <span
                aria-hidden="true"
                className={`absolute size-[4px] rounded-full transition-colors ${dotPlace} ${isRunning ? "bg-white/90 shadow-[0_0_4px_rgba(255,255,255,0.7)]" : "bg-transparent"}`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
