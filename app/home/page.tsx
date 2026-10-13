import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/session";

const AREAS = [
  {
    n: "01",
    title: "Templates",
    body: "Upload and manage the artwork certificates are printed onto.",
    href: "/templates",
  },
  { n: "02", title: "Issue", body: "Create certificates and send them to recipients." },
  { n: "03", title: "Verify", body: "Look up a certificate and confirm it is genuine." },
  { n: "04", title: "Revoke", body: "Withdraw a certificate that should no longer stand." },
];

export default async function HomePage() {
  const { user } = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col">
        <section className="px-6 py-20 md:px-10 md:py-32">
          <h1 className="text-[clamp(3rem,12vw,13rem)] leading-[0.8] font-bold tracking-tighter uppercase">
            Partly
            <br />
            <span className="inline-block bg-accent px-4 py-1 text-accent-foreground">
              Wired
            </span>
          </h1>
          <p className="mt-10 max-w-xl text-lg leading-tight text-muted-foreground md:text-2xl">
            Templates are live. Issuing, verifying and revoking have no endpoints
            yet — those three cards below are still placeholders.
          </p>
          <p className="mt-8 text-xs tracking-widest text-muted-foreground uppercase md:text-sm">
            Signed in as <span className="text-foreground">{user.name || user.username}</span>
          </p>
        </section>

        <section className="grid gap-px border-t-2 border-border bg-border md:grid-cols-2 xl:grid-cols-4">
          {AREAS.map((area) => {
            const body = (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-6 -right-2 text-[8rem] leading-none font-bold text-muted select-none group-hover:text-accent-foreground/20 md:text-[10rem]"
                >
                  {area.n}
                </span>
                <div className="relative">
                  <h2 className="text-4xl font-bold tracking-tighter uppercase md:text-5xl">
                    {area.title}
                  </h2>
                  <p className="mt-6 max-w-xs text-base text-muted-foreground group-hover:text-accent-foreground/80 md:text-lg">
                    {area.body}
                  </p>
                </div>
                <p className="relative mt-8">
                  {area.href ? (
                    <span className="inline-flex items-center gap-2 border-2 border-current px-2 py-1 text-[0.6875rem] font-bold tracking-widest uppercase">
                      Open
                      <ArrowUpRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  ) : (
                    <span className="inline-block border-2 border-border px-2 py-1 text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase">
                      Not built yet
                    </span>
                  )}
                </p>
              </>
            );

            const CELL_CLASS =
              "group relative flex min-h-72 flex-col justify-between overflow-hidden bg-background p-8 md:p-12";

            return area.href ? (
              <Link
                key={area.n}
                href={area.href}
                className={`${CELL_CLASS} transition-colors duration-300 hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent`}
              >
                {body}
              </Link>
            ) : (
              <article key={area.n} className={CELL_CLASS}>
                {body}
              </article>
            );
          })}
        </section>

      </main>

      <footer className="border-t-2 border-border px-6 py-8 md:px-10">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Certifier Reloaded — demo build
        </p>
      </footer>
    </div>
  );
}
