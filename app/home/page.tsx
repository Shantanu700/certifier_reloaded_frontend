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

// The page is locked to one viewport: type and spacing scale with height as well as
// width, and secondary copy drops out on short screens rather than forcing a scroll.
const SHORT = "[@media(max-height:500px)]:hidden";
const GAP = "mt-[clamp(0.75rem,2.5dvh,2.5rem)] [@media(max-height:500px)]:mt-0";
// Under 500px tall (phones in landscape) the button sits beside the headline.
const SHORT_ROW =
  "[@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-center [@media(max-height:500px)]:justify-between [@media(max-height:500px)]:gap-6";

export default async function HomePage() {
  const { user } = await requireUser();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader />

      <main className="flex min-h-0 flex-1 flex-col">
        <section
          className={`flex min-h-0 flex-1 flex-col justify-center px-6 py-[clamp(0.75rem,4dvh,4rem)] md:px-10 ${SHORT_ROW}`}
        >
          <p className={`text-xs tracking-widest text-muted-foreground uppercase md:text-sm ${SHORT}`}>
            Signed in as <span className="text-foreground">{user.name || user.username}</span>
          </p>
          <h1
            className={`${GAP} text-[clamp(1.75rem,min(12vw,11dvh),10rem)] leading-[0.85] font-bold tracking-tighter uppercase`}
          >
            Certificates
            <br />
            <span className="inline-block bg-accent px-[0.15em] py-[0.03em] text-accent-foreground">
              In bulk
            </span>
          </h1>
          <p
            className={`${GAP} max-w-xl text-base leading-snug text-muted-foreground md:text-xl [@media(max-height:600px)]:hidden`}
          >
            One design and one CSV. You get a certificate for every row.
          </p>
          <Button
            asChild
            className={`${GAP} h-12 w-fit gap-3 px-6 text-base tracking-tighter transition-transform active:scale-[0.98] md:h-14 md:px-8 md:text-lg`}
          >
            <Link href="/templates">
              Open templates
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </Button>
        </section>

        <section aria-labelledby="how-heading" className="shrink-0 border-t-2 border-border">
          <h2 id="how-heading" className="sr-only">
            How a batch is made
          </h2>
          <ol className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 [@media(max-height:500px)]:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="bg-background px-4 py-[clamp(0.75rem,2.5dvh,2.5rem)] md:px-6 xl:px-10"
              >
                <span className="font-mono text-xs font-bold text-muted-foreground md:text-sm">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-lg leading-none font-bold tracking-tighter uppercase md:mt-3 md:text-2xl xl:text-3xl">
                  {s.title}
                </h3>
                <p className="mt-3 hidden max-w-xs text-sm text-muted-foreground md:block lg:text-base [@media(max-height:760px)]:hidden">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={`flex shrink-0 flex-wrap items-baseline gap-x-6 gap-y-1 border-t-2 border-border px-6 py-3 md:px-10 md:py-5 ${SHORT}`}
        >
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Not built yet
          </h2>
          <p className="text-xs text-muted-foreground md:text-sm">{NOT_BUILT.join(", ")}.</p>
        </section>
      </main>
    </div>
  );
}
