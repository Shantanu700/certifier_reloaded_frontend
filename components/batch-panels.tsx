import Link from "next/link";
import { Download, Play, Trash2 } from "lucide-react";

import { deleteBatch, exportBatch, generateBatch, issueOne, saveMapping } from "@/app/actions";
import { BatchProgress, ExportProgress } from "@/components/batch-progress";
import { BatchStatus } from "@/components/batch-status";
import { ConfirmPopover } from "@/components/confirm-popover";
import { CsvUploadForm } from "@/components/csv-upload-form";
import { SelectField } from "@/components/select-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { NamingEditor } from "@/components/naming-editor";
import { templateFileUrl } from "@/components/template-preview";
import {
  IN_FLIGHT,
  PAGE_SIZES,
  asMapping,
  asNamingParts,
  asStrings,
  type PageInfo,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CertificateBatch, GeneratedCertificate, TemplateBox } from "@/src/client";

const HEADING = "text-xs font-bold tracking-widest text-muted-foreground uppercase";
const SELECT_CLASS =
  "h-11 w-full border-2 border-border bg-transparent px-3 text-sm font-bold tracking-tight outline-none focus:border-accent";
const STAMP: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

const NUDGE = "border-2 border-dashed border-border p-4 text-sm text-muted-foreground";

export function CsvPanel({
  templateUuid,
  batches,
  selected,
  boxes,
}: {
  templateUuid: string;
  batches: CertificateBatch[];
  selected?: CertificateBatch;
  boxes: TemplateBox[];
}) {
  return (
    <section className="space-y-6">
      <div>
        <h3 className={HEADING}>Upload recipients</h3>
        <CsvUploadForm templateUuid={templateUuid} />
      </div>

      <details className="group border-2 border-border">
        <summary className="cursor-pointer list-none px-5 py-3 text-xs font-bold tracking-widest uppercase transition-colors marker:content-none hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
          <span className="flex items-center justify-between gap-4">
            Or issue one by hand
            <span aria-hidden="true" className="text-muted-foreground">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </span>
        </summary>
        <div className="border-t-2 border-border p-5">
          {boxes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add a text box in step 01 first.</p>
          ) : (
            <form action={issueOne} className="space-y-4">
              <input type="hidden" name="templateUuid" value={templateUuid} />
              <p className="text-sm text-muted-foreground">
                Type what each box should say. The certificate is made and issued straight away.
              </p>
              <label className="block">
                <span className={HEADING}>Recipient email or username</span>
                <input name="recipient" required maxLength={255} autoComplete="off" className={cn(SELECT_CLASS, "mt-2")} />
              </label>
              {boxes.map((box) => (
                <label key={box.uuid ?? box.key} className="block">
                  <span className={cn(HEADING, "break-all")}>{box.key}</span>
                  <input name={`value:${box.key}`} maxLength={500} className={cn(SELECT_CLASS, "mt-2")} />
                </label>
              ))}
              <SubmitButton pendingLabel="Issuing…" className="h-12 w-full">
                Issue certificate
              </SubmitButton>
            </form>
          )}
        </div>
      </details>

      <div>
        <h3 className={HEADING}>
          Uploaded{batches.length ? ` · ${batches.length}` : null}
        </h3>
        {batches.length ? (
          <ul className="mt-4 grid gap-px bg-border">
            {batches.map((batch) => (
              <li key={batch.uuid} className="bg-background">
                <Link
                  href={`/templates/${templateUuid}?step=${batch.is_manual ? "issue" : "mapping"}&batch=${batch.uuid}`}
                  aria-current={batch.uuid === selected?.uuid || undefined}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                    batch.uuid === selected?.uuid
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="min-w-0">
                    <span
                      suppressHydrationWarning
                      className="block text-sm font-bold tracking-tight"
                    >
                      {batch.is_manual
                        ? "Issued by hand"
                        : new Date(batch.created_at).toLocaleString(undefined, STAMP)}
                    </span>
                    <span className="mt-1 block text-[0.6875rem] font-bold tracking-widest uppercase opacity-70">
                      {batch.is_manual
                        ? `${batch.total_rows ?? 0} certificate${batch.total_rows === 1 ? "" : "s"}`
                        : batch.generation_status ?? "pending"}
                      {!batch.is_manual && batch.total_rows
                        ? ` · ${batch.processed_rows ?? 0}/${batch.total_rows}`
                        : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn(NUDGE, "mt-4")}>
            No CSVs yet. One row per certificate, with a header row naming the
            columns you&apos;ll map onto the boxes.
          </p>
        )}
      </div>
    </section>
  );
}

export function MappingPanel({
  templateUuid,
  batch,
  boxes,
}: {
  templateUuid: string;
  batch?: CertificateBatch;
  boxes: TemplateBox[];
}) {
  if (!batch) {
    return (
      <p className={NUDGE}>
        Upload a CSV first. There are no columns to map yet.
      </p>
    );
  }
  if (batch.is_manual) {
    return (
      <p className={NUDGE}>
        These certificates were issued by hand, so there&apos;s no CSV to map. Manage them
        under Issue.
      </p>
    );
  }
  if (boxes.length === 0) {
    return (
      <p className={NUDGE}>
        This template has no text boxes, so there&apos;s nothing to map a column
        onto. Go back to step 01 and add some. Image and verification boxes
        don&apos;t appear here: they print the same image, or each
        certificate&apos;s own code.
      </p>
    );
  }

  const columns = asStrings(batch.csv_columns);
  if (columns.length === 0) {
    return (
      <p className={NUDGE}>
        No columns came back for this CSV. The server hasn&apos;t parsed a header
        row from it{batch.error_message ? `: ${batch.error_message}` : ""}.
      </p>
    );
  }

  const byBox = asMapping(batch.mapping);

  return (
    <section className="space-y-8">
      <div>
        <h3 className={HEADING}>Map columns onto boxes</h3>
        <form action={saveMapping} className="mt-4 space-y-5">
          <input type="hidden" name="templateUuid" value={templateUuid} />
          <input type="hidden" name="uuid" value={batch.uuid} />

          <ul className="grid gap-px bg-border">
            {boxes.map((box) => (
              <li key={box.uuid ?? box.key} className="space-y-2 bg-background p-4">
                <label
                  htmlFor={`map-${box.key}`}
                  className="block text-sm font-bold tracking-tight break-all"
                >
                  {box.key}
                  {box.type === "qr" ? <span className="text-muted-foreground"> · QR code</span> : null}
                </label>
                <SelectField
                  id={`map-${box.key}`}
                  name={`map:${box.key}`}
                  defaultValue={byBox[box.key] ?? ""}
                  emptyLabel="Not mapped"
                  options={columns.map((column) => ({ value: column, label: column }))}
                />
              </li>
            ))}
          </ul>

          <SubmitButton pendingLabel="Saving…" className="h-12 w-full">
            Save mapping
          </SubmitButton>
        </form>
      </div>

      <div className="border-t-2 border-border pt-6">
        <h3 className={HEADING}>Certificate filenames</h3>
        <NamingEditor
          templateUuid={templateUuid}
          batchUuid={batch.uuid ?? ""}
          columns={columns}
          initial={asNamingParts(batch.naming_convention)}
        />
      </div>
    </section>
  );
}

/**
 * The first mapped column (usually the recipient's name) labels each row, so
 * staff can tell whose certificate it is without counting CSV lines.
 */
export function certificateLabel(batch: CertificateBatch, cert: GeneratedCertificate) {
  const labelColumn = Object.values(asMapping(batch.mapping))[0];
  const data = cert.row_data as Record<string, unknown> | undefined;
  const value = labelColumn ? data?.[labelColumn] : undefined;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pageHref(
  templateUuid: string,
  batchUuid: string | undefined,
  page: number,
  size: number
) {
  const batch = batchUuid ? `&batch=${batchUuid}` : "";
  return `/templates/${templateUuid}?step=generate${batch}&page=${page}&size=${size}`;
}

const PAGER_LINK =
  "inline-flex items-center self-stretch px-3 py-1.5 text-[0.6875rem] font-bold tracking-widest uppercase transition-colors pointer-coarse:py-3.5 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

/** Previous / Next links for any paginated list; `href` builds the URL for a given page number. */
export function Pager({
  page,
  href,
  label,
  className,
}: {
  page: PageInfo;
  href: (page: number) => string;
  label: string;
  className?: string;
}) {
  const ends = [
    { label: "Previous", to: page.page - 1, enabled: page.hasPrev },
    { label: "Next", to: page.page + 1, enabled: page.hasNext },
  ];

  return (
    <nav
      aria-label={label}
      className={cn("mt-4 flex items-center justify-between gap-3 border-2 border-border", className)}
    >
      {ends.map(({ label, to, enabled }, i) =>
        enabled ? (
          <Link
            key={label}
            href={href(to)}
            rel={i === 0 ? "prev" : "next"}
            className={PAGER_LINK}
          >
            {i === 0 ? "← " : null}
            {label}
            {i === 1 ? " →" : null}
          </Link>
        ) : (
          <span
            key={label}
            aria-disabled="true"
            className={cn(PAGER_LINK, "text-muted-foreground/50")}
          >
            {i === 0 ? "← " : null}
            {label}
            {i === 1 ? " →" : null}
          </span>
        )
      )}
      <span
        aria-live="polite"
        className="order-first flex-1 px-3 text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase sm:order-0 sm:flex-none"
      >
        Page {page.page}
      </span>
    </nav>
  );
}

function PageSizes({
  templateUuid,
  batch,
  page,
}: {
  templateUuid: string;
  batch?: CertificateBatch;
  page: PageInfo;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.625rem] font-bold tracking-widest text-muted-foreground uppercase">
        Per page
      </span>
      <div className="flex gap-px border-2 border-border bg-border">
        {PAGE_SIZES.map((size) => (
          <Link
            key={size}
            href={pageHref(templateUuid, batch?.uuid, 1, size)}
            aria-current={size === page.size || undefined}
            className={cn(
              "px-2.5 py-1 text-[0.625rem] font-bold tracking-widest tabular-nums pointer-coarse:px-3.5 pointer-coarse:py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
              size === page.size
                ? "bg-accent text-accent-foreground"
                : "bg-background hover:bg-muted"
            )}
          >
            {size}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GeneratePanel({
  templateUuid,
  batch,
  certificates,
  page,
}: {
  templateUuid: string;
  batch?: CertificateBatch;
  certificates: GeneratedCertificate[];
  page?: PageInfo;
}) {
  if (!batch) {
    return <p className={NUDGE}>Upload a CSV and map its columns first.</p>;
  }

  const status = batch.generation_status ?? "pending";
  const running = IN_FLIGHT.includes(status);
  const exportStatus = batch.export_status ?? "pending";
  const total = batch.total_rows ?? 0;
  const failures = certificates.filter((c) => c.is_successful === false).length;
  const rowLabel = (cert: GeneratedCertificate) => certificateLabel(batch, cert);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={HEADING}>Generate</h3>
          <BatchStatus batch={batch} />
        </div>

        {batch.error_message ? (
          <p role="alert">
            <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
              {batch.error_message}
            </span>
          </p>
        ) : null}

        <BatchProgress
          uuid={batch.uuid!}
          initial={{
            generation_status: status,
            total_rows: total,
            processed_rows: batch.processed_rows ?? 0,
          }}
        />

        <p className="text-sm text-muted-foreground">
          {status === "mapped"
            ? "The mapping is saved. Generating makes one certificate for every row."
            : status === "pending"
              ? "Save a mapping first. Generation only runs on a mapped batch."
              : running
                ? "Running. The bar above updates every few seconds."
                : `This batch is ${status}.`}
        </p>

        <form action={generateBatch}>
          <input type="hidden" name="templateUuid" value={templateUuid} />
          <input type="hidden" name="uuid" value={batch.uuid} />
          <SubmitButton
            pendingLabel="Starting…"
            disabled={status !== "mapped"}
            className="h-12 w-full"
          >
            <Play className="size-4" aria-hidden="true" />
            Generate certificates
          </SubmitButton>
        </form>
      </div>

      <div className="border-t-2 border-border pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h3 className={HEADING}>
            Certificates{page?.count ? ` (${page.count})` : null}
            {failures ? (
              <span className="text-destructive">, {failures} failed on this page</span>
            ) : null}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {exportStatus === "completed" ||
            IN_FLIGHT.includes(exportStatus) ? null : (
              <form action={exportBatch}>
                <input type="hidden" name="templateUuid" value={templateUuid} />
                <input type="hidden" name="uuid" value={batch.uuid} />
                <SubmitButton
                  variant="outline"
                  size="sm"
                  pendingLabel="Starting…"
                  disabled={running || certificates.length === 0}
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  Export as zip
                </SubmitButton>
              </form>
            )}
            {page && page.count > PAGE_SIZES[0] ? (
              <PageSizes templateUuid={templateUuid} batch={batch} page={page} />
            ) : null}
          </div>
        </div>
        {exportStatus === "pending" ? null : (
          <div className="mt-4">
            <ExportProgress
              uuid={batch.uuid!}
              initial={{
                export_status: exportStatus,
                total_rows: total,
                export_processed_rows: batch.export_processed_rows,
                export_error_message: batch.export_error_message,
                export_file: batch.export_file,
              }}
            />
          </div>
        )}

        {certificates.length === 0 ? (
          <p className={cn(NUDGE, "mt-4")}>
            {running
              ? "Running. Files appear here as rows finish."
              : "Nothing generated from this batch yet."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-px bg-border">
            {certificates.map((cert) => {
              const url = templateFileUrl(cert.file);
              return (
                <li
                  key={cert.uuid}
                  className="flex items-center justify-between gap-4 bg-background px-4 py-3"
                >
                  <span className="min-w-0">
                    {/* row_index is 0-based from the first recipient; people count from 1. */}
                    <span className="block truncate text-sm font-bold tracking-tight">
                      {rowLabel(cert) ?? `Row ${cert.row_index + 1}`}
                    </span>
                    {rowLabel(cert) ? (
                      <span className="mt-0.5 block font-mono text-[0.6875rem] text-muted-foreground">
                        Row {cert.row_index + 1}
                      </span>
                    ) : null}
                    {cert.is_successful === false ? (
                      <span className="mt-1 block text-[0.6875rem] tracking-widest text-destructive uppercase">
                        {cert.error_message || "Failed"}
                      </span>
                    ) : null}
                  </span>
                  {url ? (
                    <Button asChild variant="outline" size="sm" className="shrink-0 border-2">
                      <a href={url} target="_blank" rel="noreferrer">
                        <Download aria-hidden="true" />
                        Open
                      </a>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {page && (page.hasPrev || page.hasNext) ? (
          <Pager
            page={page}
            href={(to) => pageHref(templateUuid, batch?.uuid, to, page.size)}
            label="Certificate pages"
          />
        ) : null}
      </div>

      <ConfirmPopover
        label="Delete this batch"
        icon={<Trash2 aria-hidden="true" />}
        triggerClassName="h-12 w-full"
        title="Delete this batch?"
        description="The CSV, its mapping and every certificate generated from it are removed. The template itself is untouched."
        confirmLabel="Delete batch"
        pendingLabel="Deleting…"
        action={deleteBatch}
        fields={
          <>
            <input type="hidden" name="templateUuid" value={templateUuid} />
            <input type="hidden" name="uuid" value={batch.uuid} />
          </>
        }
      />
    </section>
  );
}
