import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";

import { connectCanva, disconnectCanva, importCanvaDesign } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { CanvaQualitySlider } from "@/components/canva-quality-slider";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { requireUser, sessionHeader } from "@/lib/session";
import { getCanvaDesigns, getCanvaStatus, type CanvaDesign } from "@/src/client";

const LABEL_CLASS =
  "block text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase";
const FIELD_CLASS =
  "mt-1 h-10 w-full border-b-2 border-border bg-transparent px-2 text-sm font-bold tracking-tight outline-none focus:border-accent";
const TEXT_LINK =
  "tap inline-flex items-center gap-2 text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

const msgOf = (error: unknown, fallback: string) => {
  const msg = (error as { msg?: unknown } | undefined)?.msg;
  return typeof msg === "string" ? msg : fallback;
};

/**
 * Pick a design from the user's own Canva account. Search and paging are
 * search params (like the template wizard's steps), so this stays a server
 * component and a failed import lands back on the same results.
 */
export default async function CanvaImportPage({
  searchParams,
}: PageProps<"/templates/canva">) {
  const { sessionId } = await requireUser();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(params.q).trim();
  const after = one(params.after);
  const error = one(params.error);
  const headers = sessionHeader(sessionId);

  let connected = false;
  let designs: CanvaDesign[] = [];
  let next: string | null = null;
  let loadError: string | undefined;
  try {
    const status = await getCanvaStatus({ headers });
    if (status.error) loadError = msgOf(status.error, "Couldn't check your Canva connection.");
    connected = Boolean(status.data?.connected);

    if (connected) {
      const page = await getCanvaDesigns({
        headers,
        query: { ...(q && { query: q }), ...(after && { continuation: after }) },
      });
      if (page.error) loadError = msgOf(page.error, "Canva didn't return your designs.");
      designs = page.data?.items ?? [];
      next = page.data?.continuation ?? null;
      // A failed refresh disconnects on the server; reflect it instead of an empty grid.
      if (page.error) connected = (await getCanvaStatus({ headers })).data?.connected ?? false;
    }
  } catch {
    loadError = "Can't reach the server. Try again in a moment.";
  }

  const here = `/templates/canva${q || after ? `?${new URLSearchParams({ ...(q && { q }), ...(after && { after }) })}` : ""}`;

  return (
    <div className="flex flex-col lg:h-dvh lg:overflow-hidden">
      <AppHeader crumb="Templates" />

      <section className="flex shrink-0 flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b-2 border-border px-6 py-6 md:px-10">
        <div className="min-w-0">
          <Link href="/templates" className={TEXT_LINK}>
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            All templates
          </Link>
          <h1 className="mt-3 text-3xl leading-[0.9] font-bold tracking-tighter uppercase md:text-5xl">
            Import from Canva
          </h1>
          <p className="mt-3 max-w-md text-sm leading-tight text-muted-foreground">
            Pick a design and the page to use. It comes in as an image, so you can
            place boxes on it, and you can refresh it later after editing in Canva.
          </p>
        </div>

        {connected ? (
          <div className="flex flex-wrap items-end gap-4">
            <form action="/templates/canva" className="flex items-end gap-2">
              <div>
                <label htmlFor="canva-q" className={LABEL_CLASS}>
                  Search your designs
                </label>
                <input
                  id="canva-q"
                  name="q"
                  type="search"
                  maxLength={255}
                  defaultValue={q}
                  placeholder="Certificate"
                  className={`${FIELD_CLASS} w-56`}
                />
              </div>
              <Button type="submit" className="h-10 px-4" aria-label="Search">
                <Search className="size-4" aria-hidden="true" />
              </Button>
            </form>
            <form action={disconnectCanva}>
              <SubmitButton variant="outline" pendingLabel="Disconnecting…" className="h-10 border-2">
                Disconnect Canva
              </SubmitButton>
            </form>
          </div>
        ) : null}
      </section>

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {error || loadError ? (
          <p className="px-6 pt-6 md:px-10" role="alert">
            <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
              {error || loadError}
            </span>
          </p>
        ) : null}

        {!connected ? (
          <div className="flex min-h-80 items-center justify-center p-6 md:p-10">
            <form
              action={connectCanva}
              className="w-full max-w-lg border-2 border-dashed border-border px-8 py-14 text-center"
            >
              <h2 className="text-2xl font-bold tracking-tighter uppercase md:text-4xl">
                Connect your Canva account
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground md:text-base">
                Certifier asks Canva for permission to list and export your designs.
                You can disconnect at any time.
              </p>
              <SubmitButton pendingLabel="Opening Canva…" className="mt-8 h-14 gap-3 px-10 text-base tracking-tighter">
                Connect Canva
                <ArrowRight className="size-5" aria-hidden="true" />
              </SubmitButton>
            </form>
          </div>
        ) : designs.length === 0 && !loadError ? (
          <p className="px-6 py-10 text-sm text-muted-foreground md:px-10">
            {q ? `No Canva designs match “${q}”.` : "Your Canva account has no designs yet."}
          </p>
        ) : (
          <section aria-label="Canva designs" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {designs.map((design) => (
              <form
                key={design.id}
                action={importCanvaDesign}
                className="flex flex-col border-r-2 border-b-2 border-border"
              >
                <input type="hidden" name="design_id" value={design.id} />
                <input type="hidden" name="back" value={here} />
                <div className="flex aspect-16/10 items-center justify-center overflow-hidden border-b-2 border-border bg-muted/40">
                  {design.thumbnail_url ? (
                    <img src={design.thumbnail_url} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs tracking-widest text-muted-foreground uppercase">No preview</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <div>
                      <label htmlFor={`name-${design.id}`} className={LABEL_CLASS}>
                        Template name
                      </label>
                      <input
                        id={`name-${design.id}`}
                        name="name"
                        required
                        maxLength={200}
                        defaultValue={design.title}
                        className={FIELD_CLASS}
                      />
                    </div>
                    {(design.page_count ?? 1) > 1 ? (
                      <div>
                        <label htmlFor={`page-${design.id}`} className={LABEL_CLASS}>
                          Page
                        </label>
                        <select id={`page-${design.id}`} name="page" defaultValue="1" className={`${FIELD_CLASS} w-20`}>
                          {Array.from({ length: design.page_count ?? 1 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                  <CanvaQualitySlider
                    id={`width-${design.id}`}
                    thumbnailWidth={design.thumbnail_width}
                    thumbnailHeight={design.thumbnail_height}
                  />
                  <SubmitButton pendingLabel="Importing…" className="mt-auto h-12 gap-3">
                    Import
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </SubmitButton>
                </div>
              </form>
            ))}
          </section>
        )}

        {connected && (after || next) ? (
          <nav aria-label="More designs" className="flex justify-between gap-4 px-6 py-6 md:px-10">
            {after ? (
              <Link href={q ? `/templates/canva?${new URLSearchParams({ q })}` : "/templates/canva"} className={TEXT_LINK}>
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                First page
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/templates/canva?${new URLSearchParams({ ...(q && { q }), after: next })}`} className={TEXT_LINK}>
                More designs
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
