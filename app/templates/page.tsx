import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { uploadTemplate } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { TemplateForm } from "@/components/template-form";
import { TemplatePreview } from "@/components/template-preview";
import { asList } from "@/lib/api";
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

export default async function TemplatesPage() {
  const { sessionId } = await requireUser();

  let templates: CertificateTemplate[] = [];
  let loadError: string | undefined;
  try {
    const result = await listCertificateTemplates({
      headers: sessionHeader(sessionId),
    });
    if (result.error) loadError = "The server couldn't return your templates.";
    templates = asList<CertificateTemplate>(result.data);
  } catch {
    loadError = "Can't reach the server. Is the API running?";
  }

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
            <span className="text-foreground">{templates.length}</span> on file
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
            />
          </div>
        </div>
      </section>

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {loadError ? (
          <p className="px-6 pt-8 md:px-10" role="alert">
            <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
              {loadError}
            </span>
          </p>
        ) : null}

        {templates.length === 0 ? (
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
            className="grid sm:grid-cols-2 xl:grid-cols-3"
          >
            {templates.map((template) => (
              <Link
                key={template.uuid ?? template.id}
                href={`/templates/${template.uuid}`}
                className="group relative flex flex-col border-r-2 border-b-2 border-border transition-colors duration-300 hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent"
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
