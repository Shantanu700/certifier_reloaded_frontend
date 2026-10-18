import { redirect } from "next/navigation";
import { Download } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { Pager } from "@/components/batch-panels";
import { templateFileUrl } from "@/components/template-preview";
import { asPageNumber, type PageInfo } from "@/lib/api";
import { requireUser, sessionHeader } from "@/lib/session";
import { listReceivedCertificates, type ReceivedCertificate } from "@/src/client";

const PAGE_SIZE = 20;
const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
const META = "text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase";

const listHref = (page: number) => (page > 1 ? `/certificates?page=${page}` : "/certificates");

/** A recipient's issued certificates. Revoked ones stay listed, without a download. */
export default async function CertificatesPage({ searchParams }: PageProps<"/certificates">) {
  const { user, sessionId } = await requireUser();
  if (user.role !== "recipient") redirect("/templates");
  const pageNumber = asPageNumber((await searchParams).page);

  let certificates: ReceivedCertificate[] = [];
  let page: PageInfo | undefined;
  let loadError: string | undefined;
  let outOfRange = false;
  try {
    const result = await listReceivedCertificates({
      headers: sessionHeader(sessionId),
      query: { page: pageNumber, page_size: PAGE_SIZE },
    });
    outOfRange = result.response?.status === 404 && pageNumber > 1;
    if (result.error && !outOfRange) loadError = "Couldn't load your certificates.";
    certificates = result.data?.results ?? [];
    page = result.data && {
      count: result.data.count,
      page: pageNumber,
      size: PAGE_SIZE,
      hasNext: Boolean(result.data.next),
      hasPrev: Boolean(result.data.previous),
    };
  } catch {
    loadError = "Can't reach the server. Try again in a moment.";
  }
  if (outOfRange) redirect(listHref(1));

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader crumb="My certificates" role="recipient" />

      <section className="border-b-2 border-border px-6 py-6 md:px-10">
        <h1 className="text-3xl leading-[0.9] font-bold tracking-tighter uppercase md:text-5xl">
          My certificates
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {page?.count
            ? `${page.count} certificate${page.count === 1 ? "" : "s"} issued to you.`
            : "Certificates issued to you appear here."}
          {user.email_verified ? null : " Verify your email on your profile so issuers can find you."}
        </p>
      </section>

      <main className="flex-1 px-6 py-6 md:px-10">
        {loadError ? (
          <p role="alert">
            <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
              {loadError}
            </span>
          </p>
        ) : certificates.length === 0 ? (
          <p className="border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
            Nothing yet. When an issuer sends you a certificate, it shows up here. Keep your
            profile details (roll number, phone, date of birth) up to date so they can match you.
          </p>
        ) : (
          <ul className="grid gap-px border-2 border-border bg-border">
            {certificates.map((cert) => {
              const url = templateFileUrl(cert.file);
              const revoked = cert.issue_status === "revoked";
              return (
                <li key={cert.uuid} className="flex flex-wrap items-center justify-between gap-4 bg-background px-4 py-4">
                  <span className="min-w-0">
                    <span className="block text-lg leading-tight font-bold tracking-tight">{cert.template_name}</span>
                    <span suppressHydrationWarning className={`mt-1 block ${META}`}>
                      From {cert.issuer_name || "an issuer"}
                      {cert.issued_at ? ` · ${new Date(cert.issued_at).toLocaleDateString("en-IN", DAY)}` : null}
                    </span>
                  </span>
                  {revoked ? (
                    <span suppressHydrationWarning className="border-2 border-destructive px-3 py-1.5 text-[0.6875rem] font-bold tracking-widest text-destructive uppercase">
                      Revoked
                      {cert.revoked_at ? ` ${new Date(cert.revoked_at).toLocaleDateString("en-IN", DAY)}` : null}
                    </span>
                  ) : url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="tap inline-flex items-center gap-2 border-2 border-border px-3 py-2 text-[0.6875rem] font-bold tracking-widest uppercase transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      Download
                      <Download className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {page && (page.hasPrev || page.hasNext) ? (
          <Pager page={page} href={listHref} label="Certificate pages" />
        ) : null}
      </main>
    </div>
  );
}
