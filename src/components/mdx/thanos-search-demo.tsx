"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, ImageIcon, Mic, MoreVertical, RotateCcw, Search, Video, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { animateDust } from "@/components/mdx/dust-effect";

const results = [
  {
    site: "marvel.com › characters › thanos",
    title: "Thanos | Marvel Characters",
    description: "Meet the Mad Titan. Learn about Thanos, the Infinity Stones, and the moment that changed the Marvel universe.",
  },
  {
    site: "en.wikipedia.org › wiki › Thanos",
    title: "Thanos - Wikipedia",
    description: "Thanos is a fictional supervillain appearing in American comic books published by Marvel Comics. He first appeared in The Invincible Iron Man.",
  },
  {
    site: "marvel.com › movies › avengers-infinity-war",
    title: "Avengers: Infinity War (2018) | Marvel",
    description: "The Avengers and their allies must be willing to sacrifice everything in an attempt to defeat the powerful Thanos.",
  },
  {
    site: "en.wikipedia.org › wiki › The_Blip",
    title: "The Blip and the Snap - Marvel Cinematic Universe",
    description: "A single snap of the Infinity Gauntlet erased half of all life. Years later, another snap brought everyone back.",
  },
  {
    site: "marvel.com › articles › comics",
    title: "The Infinity Gauntlet: A Complete Guide",
    description: "Explore the six Infinity Stones, the gauntlet that holds them, and the stories behind Thanos's most famous gesture.",
  },
  {
    site: "en.wikipedia.org › wiki › Avengers:_Endgame",
    title: "Avengers: Endgame - Wikipedia",
    description: "The surviving Avengers work to reverse the damage caused by Thanos and bring back those who disappeared.",
  },
  {
    site: "marvel.com › articles › movies",
    title: "The Six Infinity Stones Explained",
    description: "Space, Mind, Reality, Power, Time, and Soul: six stones that gave the Infinity Gauntlet its power.",
  },
  {
    site: "en.wikipedia.org › wiki › Infinity_Gauntlet",
    title: "The Infinity Gauntlet - Marvel Comics",
    description: "The cosmic artifact at the center of one of Marvel's most famous stories and its unforgettable snap.",
  },
];

export function ThanosSearchDemo() {
  const pageRef = useRef<HTMLDivElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioRef = useRef<HTMLAudioElement[]>([]);
  const spriteFrameRef = useRef(0);
  const spritePreloadsRef = useRef<HTMLImageElement[]>([]);
  const gauntletRef = useRef<HTMLSpanElement>(null);
  const soundOnRef = useRef(true);
  const [status, setStatus] = useState<"ready" | "snapping" | "snapped" | "restoring">("ready");
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    const page = pageRef.current;
    spritePreloadsRef.current = ["snap", "time"].map((kind) => {
      const image = new Image();
      image.src = `/thanos/thanos_${kind}.png`;
      return image;
    });
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      animationsRef.current.forEach((animation) => animation.cancel());
      page?.querySelectorAll("[data-dust-layer]").forEach((copy) => copy.remove());
      soundTimersRef.current.forEach(clearTimeout);
      audioRef.current.forEach((audio) => audio.pause());
      cancelAnimationFrame(spriteFrameRef.current);
    };
  }, []);

  const playSound = (file: string) => {
    if (!soundOnRef.current) return;
    const audio = new Audio(`/thanos/${file}.mp3`);
    audioRef.current.push(audio);
    audio.addEventListener("ended", () => { audioRef.current = audioRef.current.filter((item) => item !== audio); }, { once: true });
    void audio.play().catch(() => {});
  };

  const toggleSound = () => {
    soundOnRef.current = !soundOnRef.current;
    setSoundOn(soundOnRef.current);
    if (!soundOnRef.current) {
      audioRef.current.forEach((audio) => audio.pause());
      audioRef.current = [];
    }
  };

  const playSprite = (kind: "snap" | "time", onComplete: () => void) => {
    const gauntlet = gauntletRef.current;
    if (!gauntlet) { onComplete(); return; }
    cancelAnimationFrame(spriteFrameRef.current);
    gauntlet.style.backgroundImage = `url('/thanos/thanos_${kind}.png')`;
    gauntlet.style.backgroundSize = "3840px 80px";
    const start = performance.now();
    const draw = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= 48 * 50) {
        gauntlet.style.backgroundImage = "url('/thanos/thanos_idle.png')";
        gauntlet.style.backgroundPosition = "0 0";
        gauntlet.style.backgroundSize = "80px 80px";
        onComplete();
      } else {
        gauntlet.style.backgroundPosition = `${-Math.floor(elapsed / 50) * 80}px 0`;
        spriteFrameRef.current = requestAnimationFrame(draw);
      }
    };
    spriteFrameRef.current = requestAnimationFrame(draw);
  };

  const targets = () => Array.from(pageRef.current?.querySelectorAll<HTMLElement>('[data-snap-target="true"]') ?? []);

  const clearLayers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
    pageRef.current?.querySelectorAll("[data-dust-layer]").forEach((copy) => copy.remove());
  };

  const onGauntlet = () => {
    if (status === "snapping" || status === "restoring") return;
    const items = targets();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (status === "snapped") {
      playSound("thanos_reverse_sound");
      if (reducedMotion) {
        items.forEach((item) => { item.style.visibility = "visible"; });
        setStatus("ready");
        return;
      }
      setStatus("restoring");
      playSprite("time", () => {
        const animations = items.flatMap((item, index) => animateDust(item, {
          duration: 650, layers: 20, delay: index * 100, restore: true,
        }).animations);
        animationsRef.current = animations;
        timeoutRef.current = setTimeout(() => {
          items.forEach((item) => { item.style.visibility = "visible"; });
          clearLayers();
          setStatus("ready");
        }, 650 + 1_100 + items.length * 100);
      });
      return;
    }

    playSound("thanos_snap_sound");
    if (reducedMotion) {
      items.forEach((item) => { item.style.visibility = "hidden"; });
      setStatus("snapped");
      return;
    }
    setStatus("snapping");
    playSprite("snap", () => {
      const animations = items.flatMap((item, index) => animateDust(item, {
        duration: 1_200, layers: 20, delay: index * 160,
      }).animations);
      animationsRef.current = animations;
      items.forEach((_, index) => {
        soundTimersRef.current.push(setTimeout(() => playSound(`thanos_dust_${index % 4 + 1}`), 350 + index * 200));
      });
      items.forEach((item) => { item.style.visibility = "hidden"; });
      timeoutRef.current = setTimeout(() => {
        clearLayers();
        setStatus("snapped");
      }, 1_200 + 1_100 + items.length * 160);
    });
  };

  const reset = () => {
    clearLayers();
    soundTimersRef.current.forEach(clearTimeout);
    soundTimersRef.current = [];
    audioRef.current.forEach((audio) => audio.pause());
    audioRef.current = [];
    cancelAnimationFrame(spriteFrameRef.current);
    if (gauntletRef.current) {
      gauntletRef.current.style.backgroundImage = "url('/thanos/thanos_idle.png')";
      gauntletRef.current.style.backgroundPosition = "0 0";
      gauntletRef.current.style.backgroundSize = "80px 80px";
    }
    targets().forEach((item) => { item.style.visibility = "visible"; });
    setStatus("ready");
  };

  return (
    <div ref={pageRef} className="min-h-dvh bg-white font-[Arial,sans-serif] text-[#202124]">
      <header className="border-b border-[#dadce0]">
        <div className="mx-auto flex max-w-[1440px] items-center gap-5 px-5 py-5 sm:gap-8 sm:px-10">
          <Link href="/craft/thanos-snap" className="shrink-0 text-[22px] font-medium tracking-[-0.08em] sm:text-[27px]" aria-label="Back to UIcraft Thanos Snap">
            <span className="text-[#4285f4]">G</span><span className="text-[#ea4335]">o</span><span className="text-[#fbbc05]">o</span><span className="text-[#4285f4]">g</span><span className="text-[#34a853]">l</span><span className="text-[#ea4335]">e</span>
          </Link>
          <div className="flex h-12 max-w-[690px] flex-1 items-center gap-3 rounded-full border border-[#dadce0] px-4 shadow-[0_1px_4px_#20212412] sm:h-14 sm:px-6">
            <input aria-label="Search query" readOnly value="Thanos Snap" className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-lg" />
            <Mic className="size-5 shrink-0 text-[#4285f4]" aria-hidden="true" />
            <Search className="size-5 shrink-0 text-[#4285f4]" aria-hidden="true" />
          </div>
          <Link href="/craft/thanos-snap" className="ml-auto hidden items-center gap-1.5 text-sm text-[#5f6368] hover:text-[#1a73e8] md:inline-flex"><ArrowLeft className="size-4" /> Back to craft</Link>
        </div>
        <nav aria-label="Search categories" className="mx-auto flex max-w-[1440px] gap-6 overflow-x-auto px-5 text-sm text-[#5f6368] sm:pl-[150px]">
          <span className="flex shrink-0 items-center gap-1.5 border-b-[3px] border-[#1a73e8] px-1 pb-3 text-[#1a73e8]"><Search className="size-4" /> All</span>
          <span className="flex shrink-0 items-center gap-1.5 pb-3"><BookOpen className="size-4" /> News</span>
          <span className="flex shrink-0 items-center gap-1.5 pb-3"><BookOpen className="size-4" /> Books</span>
          <span className="flex shrink-0 items-center gap-1.5 pb-3"><ImageIcon className="size-4" /> Images</span>
          <span className="flex shrink-0 items-center gap-1.5 pb-3"><Video className="size-4" /> Videos</span>
          <span className="flex shrink-0 items-center gap-1.5 pb-3"><MoreVertical className="size-4" /> More</span>
        </nav>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 pb-20 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,690px)_minmax(280px,360px)] lg:gap-16">
          <section aria-label="Search results" className="min-w-0">
            <p className="py-5 text-sm text-[#70757a]">About 69,455,573 results (0.98 seconds)</p>
            <div className="space-y-9">
              {results.map((result, index) => (
                <div key={result.title} className="relative">
                  <article data-snap-target={index % 2 === 0 ? "true" : undefined} className="max-w-[640px]">
                    <p className="text-sm text-[#202124]">{result.site}</p>
                    <h2 className="mt-1 text-xl leading-snug text-[#1a0dab] sm:text-[22px]">{result.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-[#4d5156]">{result.description}</p>
                  </article>
                </div>
              ))}
            </div>
          </section>

          <aside className="order-first mt-7 self-start border border-[#dadce0] lg:order-last lg:mt-16" aria-label="Thanos Snap panel">
            <div className="flex items-center justify-between gap-4 border-b border-[#dadce0] p-5">
              <div><h1 className="text-2xl font-normal">Thanos Snap</h1><p className="mt-1 text-sm text-[#70757a]">Interactive Easter egg</p></div>
              <button type="button" onClick={onGauntlet} disabled={status === "snapping" || status === "restoring"} aria-label={status === "snapped" ? "Restore search results" : "Snap away half the search results"} className="rounded-full p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-[#1a73e8] disabled:opacity-50"><span ref={gauntletRef} className="block size-20 bg-no-repeat" style={{ backgroundImage: "url('/thanos/thanos_idle.png')", backgroundSize: "80px 80px" }} aria-hidden="true" /></button>
            </div>
            <div className="p-5 text-sm leading-6 text-[#4d5156]">
              <p>Click the Infinity Gauntlet to make half of these search results turn to dust. Click again to bring them back.</p>
              <p role="status" className="mt-4 font-medium text-[#202124]">{status === "ready" ? "The results are ready." : status === "snapping" ? "The snap is in motion…" : status === "snapped" ? "Half the results are gone." : "Restoring the results…"}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded border border-[#dadce0] px-3 py-1.5 text-sm text-[#1a73e8] hover:bg-[#f8faff]"><RotateCcw className="size-4" /> Reset</button>
                <button type="button" onClick={toggleSound} aria-pressed={soundOn} className="inline-flex items-center gap-2 rounded border border-[#dadce0] px-3 py-1.5 text-sm text-[#5f6368] hover:bg-[#f8faff]">{soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} Sound {soundOn ? "on" : "off"}</button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
