"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Toggle colour theme"
      onClick={() => {
        const dark = document.documentElement.classList.toggle("dark");
        try {
          localStorage.theme = dark ? "dark" : "light";
        } catch {}
      }}
      className="inline-flex h-11 items-center gap-2 border-2 border-border px-3 text-xs font-bold tracking-widest uppercase transition-colors hover:border-accent sm:px-4 hover:bg-accent hover:text-accent-foreground focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <span className="max-sm:hidden">
        <span className="hidden dark:inline">Light</span>
        <span className="dark:hidden">Dark</span>
      </span>
    </button>
  );
}
