import Link from "next/link";

import { logout } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";

export function AppHeader({ crumb }: { crumb?: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border px-6 py-5 md:px-10">
      <div className="flex items-center gap-4">
        <Link
          href="/home"
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <Wordmark />
        </Link>
        {crumb ? (
          <span className="flex items-center gap-4 text-xs font-bold tracking-widest text-muted-foreground uppercase md:text-sm">
            <span aria-hidden="true">/</span>
            {crumb}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {crumb === "Templates" ? null : (
          <Link
            href="/templates"
            className="inline-flex h-11 items-center border-2 border-border px-4 text-xs font-bold tracking-widest uppercase transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Templates
          </Link>
        )}
        <ThemeToggle />
        <form action={logout}>
          <SubmitButton
            variant="outline"
            pendingLabel="Signing out…"
            className="h-11 border-2 px-4 text-xs tracking-widest hover:bg-foreground hover:text-background"
          >
            Sign out
          </SubmitButton>
        </form>
      </div>
    </header>
  );
}
