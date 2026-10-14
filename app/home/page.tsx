import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";

// The same order as the wizard on /templates/[uuid], so the numbers mean something.
const STEPS = [
  {
    title: "Upload a design",
    body: "The artwork every certificate is printed on. PNG or JPG if you want to place text on it.",
  },
  {
    title: "Place boxes",
    body: "Drag a box onto each spot where a name, date or image should print.",
  },
  {
    title: "Upload a CSV",
    body: "One row per recipient. The header row gives the column names.",
  },
  {
    title: "Map and generate",
    body: "Match columns to boxes, generate the batch, then download it as a zip.",
  },
];

const NOT_BUILT = ["Email delivery", "Recipient download page", "Public verification"];

export default async function HomePage() {
  const { user } = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col">
        <section className="px-6 py-16 md:px-10 md:py-24">
          <p className="text-xs tracking-widest text-muted-foreground uppercase md:text-sm">
            Signed in as <span className="text-foreground">{user.name || user.username}</span>
          </p>
          <h1 className="mt-6 text-[clamp(3rem,10vw,10rem)] leading-[0.85] font-bold tracking-tighter uppercase">
            Certificates
            <br />
            <span className="inline-block bg-accent px-4 py-1 text-accent-foreground">
              In bulk
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-snug text-muted-foreground md:text-2xl">
            One design and one CSV. You get a certificate for every row.
          </p>
          <Button
            asChild
            className="mt-10 h-14 gap-3 px-8 text-base tracking-tighter transition-transform active:scale-[0.98] md:h-16 md:text-lg"
          >
            <Link href="/templates">
              Open templates
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </Button>
        </section>

        <section aria-labelledby="how-heading" className="border-t-2 border-border">
          <h2 id="how-heading" className="sr-only">
            How a batch is made
          </h2>
          <ol className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="bg-background p-8 md:p-10">
                <span className="font-mono text-sm font-bold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-3xl leading-none font-bold tracking-tighter uppercase md:text-4xl">
                  {s.title}
                </h3>
                <p className="mt-4 max-w-xs text-base text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-auto flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t-2 border-border px-6 py-8 md:px-10">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Not built yet
          </h2>
          <p className="text-sm text-muted-foreground">{NOT_BUILT.join(", ")}.</p>
        </section>
      </main>
    </div>
  );
}
