import Link from "next/link";

import { logout } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";

const NAV = {
  issuer: [{ href: "/templates", label: "Templates" }],
  recipient: [
    { href: "/certificates", label: "My certificates" },
    { href: "/profile", label: "Profile" },
  ],
};

/** `role` picks the nav; pages that skip fetching the user are issuer pages, hence the default. */
export function AppHeader({ crumb, role = "issuer" }: { crumb?: string; role?: string }) {
  const links = role === "recipient" ? NAV.recipient : NAV.issuer;
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border px-6 py-3 md:px-10 md:py-5">
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

      <div className="flex items-center gap-2 sm:gap-3">
        {links.map((link) =>
          link.label === crumb ? null : (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex h-11 items-center border-2 border-border px-3 text-xs sm:px-4 font-bold tracking-widest uppercase transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {link.label}
            </Link>
          )
        )}
        <ThemeToggle />
        <form action={logout}>
          <SubmitButton
            variant="outline"
            pendingLabel="Signing out…"
            className="h-11 border-2 px-3 text-xs tracking-widest sm:px-4 hover:bg-foreground hover:text-background"
          >
            Sign out
          </SubmitButton>
        </form>
      </div>
    </header>
  );
}
