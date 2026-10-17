import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";

import { uploadTemplate } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Pager } from "@/components/batch-panels";
import { TemplateForm } from "@/components/template-form";
import { TemplatePreview } from "@/components/template-preview";
import { Button } from "@/components/ui/button";
import { asList, asPageNumber, type PageInfo } from "@/lib/api";
import { requireUser, sessionHeader } from "@/lib/session";
import {
  listCertificateTemplates,
  type CertificateTemplate,
} from "@/src/client";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

// A multiple of the grid's 2 and 3 columns, so full pages have no ragged last row.
const PAGE_SIZE = 6;

const listHref = (q: string, page: number) => {
  const params = new URLSearchParams({ ...(q && { q }), ...(page > 1 && { page: String(page) }) });
  return params.size ? `/templates?${params}` : "/templates";
};

export default async function TemplatesPage({
  searchParams,
}: PageProps<"/templates">) {
  const { sessionId } = await requireUser();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  // Matching happens in Django (?search=); this page only forwards the text and renders what comes back.
  const q = one(params.q).trim().slice(0, 255);
  const pageNumber = asPageNumber(params.page);

  let templates: CertificateTemplate[] = [];
  let page: PageInfo | undefined;
  let loadError: string | undefined;
  let outOfRange = false;
  try {
    const result = await listCertificateTemplates({
      headers: sessionHeader(sessionId),
      query: { ...(q && { search: q }), page: pageNumber, page_size: PAGE_SIZE },
    });
    // DRF answers a page past the end with 404, e.g. after deleting the last template on it.
    outOfRange = result.response?.status === 404 && pageNumber > 1;
    if (result.error && !outOfRange) loadError = "The server couldn't return your templates.";
    templates = asList<CertificateTemplate>(result.data?.results ?? []).filter((t) => t?.uuid);
    if (result.data) {
      page = {
        count: result.data.count,
        page: pageNumber,
        size: PAGE_SIZE,
        hasNext: Boolean(result.data.next),
        hasPrev: Boolean(result.data.previous),
      };
    }
  } catch {
    loadError = "Can't reach the server. Try again in a moment.";
  }
  if (outOfRange) redirect(listHref(q, 1));

  return (
    <div className="flex flex-col lg:h-dvh lg:overflow-hidden">
      <AppHeader crumb="Templates" />

      <section className="grid shrink-0 border-b-2 border-border lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]">
        <div className="flex flex-col justify-between gap-6 px-6 py-8 md:px-10">
          <div>
            <h1 className="text-4xl leading-[0.85] font-bold tracking-tighter uppercase md:text-5xl xl:text-6xl">
              Certificate
              <br />
              <span className="mt-1 inline-block bg-accent px-3 py-0.5 text-accent-foreground">
                Templates
              </span>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-tight text-muted-foreground md:text-base">
              The artwork a certificate is printed onto. Open one to rename it or
              replace the file.
            </p>
          </div>

          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            <span className="text-foreground">{page?.count ?? templates.length}</span>{" "}
            {q ? `matching “${q}”` : "on file"}
          </p>
        </div>

        <div className="border-t-2 border-border px-6 py-8 md:px-10 lg:border-t-0 lg:border-l-2">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            New template
          </h2>
          <div className="mt-5">
            <TemplateForm
              row
              action={uploadTemplate}
              idPrefix="upload"
              submitLabel="Upload"
              pendingLabel="Uploading…"
              secondary={
                <Button
                  asChild
                  variant="outline"
                  className="h-14 w-full gap-3 border-2 border-foreground text-base tracking-tighter hover:bg-foreground hover:text-background dark:hover:bg-foreground"
                >
                  <Link href="/templates/canva">
                    {/* The mark is a black disc: inverted in dark mode, and again
                        while the hover fill flips the button to foreground. */}
                    <img
                      src="/canva-icon.png"
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 group-hover/button:invert dark:invert dark:group-hover/button:invert-0"
                    />
                    Import from Canva
                  </Link>
                </Button>
              }
            />
          </div>
        </div>
      </section>

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <form
          action="/templates"
          role="search"
          className="flex flex-wrap items-end gap-3 border-b-2 border-border px-6 py-4 md:px-10"
        >
          <div className="min-w-0 basis-full sm:max-w-sm sm:flex-1 sm:basis-0">
            <label
              htmlFor="template-search"
              className="block text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase"
            >
              Search templates
            </label>
            <input
              id="template-search"
              name="q"
              type="search"
              maxLength={255}
              defaultValue={q}
              placeholder="Template name"
              className="mt-1 h-11 w-full border-b-2 border-border bg-transparent px-2 text-base font-bold tracking-tight outline-none focus:border-accent"
            />
          </div>
          <Button type="submit" variant="outline" className="h-11 gap-2 border-2 px-6">
            <Search className="size-4" aria-hidden="true" />
            Search
          </Button>
          {q ? (
            <Link
              href="/templates"
              className="tap inline-flex h-11 items-center text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Clear search
            </Link>
          ) : null}
          {page && (page.hasPrev || page.hasNext) ? (
            <Pager
              page={page}
              href={(to) => listHref(q, to)}
              label="Template pages"
              className="mt-0 ml-auto h-11"
            />
          ) : null}
        </form>

        {loadError ? (
          <p className="px-6 pt-8 md:px-10" role="alert">
            <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
              {loadError}
            </span>
          </p>
        ) : null}

        {templates.length === 0 && q && !loadError ? (
          <p className="px-6 py-10 text-sm text-muted-foreground md:px-10">
            No templates match “{q}”.{" "}
            <Link href="/templates" className="font-bold text-foreground underline underline-offset-4">
              Clear search
            </Link>
          </p>
        ) : templates.length === 0 ? (
          <div className="flex h-full min-h-80 items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-lg border-2 border-dashed border-border px-8 py-14 text-center">
              <h2 className="text-2xl font-bold tracking-tighter uppercase md:text-4xl">
                No templates yet
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground md:text-base">
                Upload a design in the panel above. It appears
                here once the upload finishes.
              </p>
            </div>
          </div>
        ) : (
          <section
            aria-label="Your templates"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          >
            {templates.map((template) => (
              <Link
                key={template.uuid ?? template.id}
                href={`/templates/${template.uuid}`}
                className="group relative flex flex-col border-r-2 border-b-2 border-border transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent"
              >
                <TemplatePreview
                  file={template.file}
                  name={template.name}
                  className="aspect-16/10 w-full border-0 border-b-2 border-border bg-muted/40"
                />

                <div className="flex items-end justify-between gap-4 p-5 md:p-6">
                  <div className="min-w-0">
                    <h3 className="truncate text-2xl leading-none font-bold tracking-tighter uppercase">
                      {template.name}
                    </h3>
                    <p
                      suppressHydrationWarning
                      className="mt-2 text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase group-hover:text-accent-foreground/70"
                    >
                      Updated{" "}
                      {new Date(template.updated_at).toLocaleDateString(
                        undefined,
                        DATE_FORMAT
                      )}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="size-5 shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
