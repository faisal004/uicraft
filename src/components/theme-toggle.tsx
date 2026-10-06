"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    // Theme still changes when storage is unavailable.
  }
}

export function ThemeToggle({
  className = "size-9 border border-current/20 text-current hover:bg-current/10",
  label,
}: {
  className?: string;
  label?: string;
}) {
  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || typeof document.startViewTransition !== "function") {
      applyTheme(nextDark);
      return;
    }

    document.startViewTransition(() => {
      applyTheme(nextDark);
    });
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
      className={cn("inline-flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2", className)}
    >
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </button>
  );
}
