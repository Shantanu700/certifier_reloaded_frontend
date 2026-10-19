import Link from "next/link";
import { Ban, Download, Pencil, Send, Trash2, UserMinus } from "lucide-react";

import {
  assignCertificate,
  deleteCertificate,
  issueBatch,
  matchRecipients,
  revokeBatch,
  revokeCertificate,
} from "@/app/actions";
import { Pager, certificateLabel } from "@/components/batch-panels";
import { ConfirmPopover } from "@/components/confirm-popover";
import { MatchFieldsEditor } from "@/components/match-fields-editor";
import { SubmitButton } from "@/components/submit-button";
import { templateFileUrl } from "@/components/template-preview";
import { Tip } from "@/components/tip";
import { buttonVariants } from "@/components/ui/button";
import { asMapping, asStrings, type PageInfo } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CertificateBatch, GeneratedCertificate, IssuanceCounts } from "@/src/client";

const HEADING = "text-xs font-bold tracking-widest text-muted-foreground uppercase";
const SELECT_CLASS =
  "h-11 w-full border-2 border-border bg-transparent px-3 text-sm font-bold tracking-tight outline-none focus:border-accent";
const NUDGE = "border-2 border-dashed border-border p-4 text-sm text-muted-foreground";
// Row actions are bordered icon buttons, named by a tooltip (and aria-label for screen readers).
const ACTION = cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "border-2");

export const ISSUE_FILTERS = [
  { id: "unassigned", label: "Unassigned" },
  { id: "ready", label: "Ready" },
  { id: "issued", label: "Issued" },
  { id: "revoked", label: "Revoked" },
  { id: "failed", label: "Failed" },
] as const;

export type IssueFilter = (typeof ISSUE_FILTERS)[number]["id"];

function state(cert: GeneratedCertificate): IssueFilter {
  if (cert.issue_status === "issued" || cert.issue_status === "revoked") return cert.issue_status;
  if (cert.is_successful === false) return "failed";
  return cert.recipient ? "ready" : "unassigned";
}

const BADGE: Record<IssueFilter, string> = {
  unassigned: "border-border text-muted-foreground",
  ready: "border-accent text-foreground",
  issued: "border-accent bg-accent text-accent-foreground",
  revoked: "border-destructive text-destructive",
  failed: "border-destructive text-destructive",
};

export function IssuePanel({
  templateUuid,
  batch,
  counts,
  certificates,
  page,
  filter,
  here,
  href,
}: {
  templateUuid: string;
  batch?: CertificateBatch;
  counts?: IssuanceCounts;
  certificates: GeneratedCertificate[];
  page?: PageInfo;
  filter?: IssueFilter;
  /** This exact URL, so every form lands back on the same filter and page. */
  here: string;
  href: (filter: IssueFilter | undefined, page: number) => string;
}) {
  if (!batch) {
    return <p className={NUDGE}>Upload a CSV and generate it first, or issue one by hand under Upload CSV.</p>;
  }
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  if (!total) {
    return <p className={NUDGE}>Nothing generated from this batch yet. Generate it first.</p>;
  }

  const hidden = (
    <>
      <input type="hidden" name="templateUuid" value={templateUuid} />
      <input type="hidden" name="batch" value={batch.uuid} />
      <input type="hidden" name="back" value={here} />
    </>
  );
  const columns = asStrings(batch.csv_columns);
  const saved = asMapping(batch.match_fields);

  return (
    <section className="space-y-8">
      {batch.is_manual ? null : (
        <div>
          <h3 className={HEADING}>Find recipients</h3>
          <form action={matchRecipients} className="mt-4 space-y-4">
            <input type="hidden" name="templateUuid" value={templateUuid} />
            <input type="hidden" name="uuid" value={batch.uuid} />
            <input type="hidden" name="back" value={here} />
            <p className="text-sm text-muted-foreground">
              Add the details your CSV has and pick the column that holds each one. A row goes to a
              recipient only when every detail matches their profile and exactly one verified
              recipient fits. Include Email when you can: roll numbers and phone numbers are typed in
              by students themselves.
            </p>
            <MatchFieldsEditor columns={columns} saved={saved} />
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="overwrite" className="size-4 accent-accent" />
              Also replace recipients already assigned (including ones you set by hand)
            </label>
            <SubmitButton pendingLabel="Matching…" className="h-12 w-full">
              Match recipients
            </SubmitButton>
          </form>
        </div>
      )}

      <div className={batch.is_manual ? undefined : "border-t-2 border-border pt-6"}>
        <nav aria-label="Filter certificates" className="flex flex-wrap gap-px border-2 border-border bg-border">
          <Link
            href={href(undefined, 1)}
            aria-current={!filter || undefined}
            className={cn(
              "flex-1 px-3 py-2 text-center text-[0.6875rem] font-bold tracking-widest uppercase",
              !filter ? "bg-accent text-accent-foreground" : "bg-background hover:bg-muted"
            )}
          >
            All {total}
          </Link>
          {ISSUE_FILTERS.map((f) => (
            <Link
              key={f.id}
              href={href(f.id, 1)}
              aria-current={filter === f.id || undefined}
              className={cn(
                "flex-1 px-3 py-2 text-center text-[0.6875rem] font-bold tracking-widest whitespace-nowrap uppercase",
                filter === f.id ? "bg-accent text-accent-foreground" : "bg-background hover:bg-muted"
              )}
            >
              {f.label} {counts?.[f.id] ?? 0}
            </Link>
          ))}
        </nav>

        <div className="mt-4 flex flex-wrap items-start gap-4">
          <form action={issueBatch} className="flex-1">
            <input type="hidden" name="templateUuid" value={templateUuid} />
            <input type="hidden" name="uuid" value={batch.uuid} />
            <input type="hidden" name="back" value={here} />
            <SubmitButton pendingLabel="Issuing…" disabled={!counts?.ready} className="h-12 w-full">
              <Send className="size-4" aria-hidden="true" />
              Issue {counts?.ready ?? 0} ready certificate{counts?.ready === 1 ? "" : "s"}
            </SubmitButton>
          </form>
          {counts?.issued ? (
            <ConfirmPopover
              label={`Revoke all ${counts.issued}`}
              icon={<Ban aria-hidden="true" />}
              triggerClassName="h-12 px-5"
              align="end"
              title={`Revoke ${counts.issued} certificate${counts.issued === 1 ? "" : "s"}?`}
              description="Recipients keep seeing them, marked revoked, without a download. This can't be undone."
              confirmLabel="Revoke all"
              pendingLabel="Revoking…"
              action={revokeBatch}
              fields={
                <>
                  <input type="hidden" name="templateUuid" value={templateUuid} />
                  <input type="hidden" name="uuid" value={batch.uuid} />
                  <input type="hidden" name="back" value={here} />
                </>
              }
            />
          ) : null}
        </div>

        {certificates.length === 0 ? (
          <p className={cn(NUDGE, "mt-4")}>No certificates in this view.</p>
        ) : (
          <ul className="mt-4 grid gap-px bg-border">
            {certificates.map((cert) => {
              const s = state(cert);
              const url = templateFileUrl(cert.file);
              const label = certificateLabel(batch, cert) ?? `Row ${cert.row_index + 1}`;
              const fields = (
                <>
                  {hidden}
                  <input type="hidden" name="uuid" value={cert.uuid} />
                </>
              );
              return (
                <li key={cert.uuid} className="space-y-3 bg-background px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold tracking-tight">{label}</span>
                      <span className="mt-0.5 block text-xs break-all text-muted-foreground">
                        {cert.recipient
                          ? [cert.recipient.name || cert.recipient.username, cert.recipient.email, cert.recipient.roll_number]
                              .filter(Boolean)
                              .join(" · ")
                          : s === "failed"
                            ? cert.error_message || "Failed to render"
                            : cert.match_error || "No recipient yet"}
                      </span>
                    </span>
                    <span className={cn("shrink-0 border-2 px-2 py-0.5 text-[0.625rem] font-bold tracking-widest uppercase", BADGE[s])}>
                      {ISSUE_FILTERS.find((f) => f.id === s)?.label}
                    </span>
                  </div>

                  {s === "unassigned" || s === "ready" ? (
                    <form action={assignCertificate} className="flex gap-2">
                      {fields}
                      <label className="sr-only" htmlFor={`recipient-${cert.uuid}`}>
                        Recipient email or username for {label}
                      </label>
                      <input
                        id={`recipient-${cert.uuid}`}
                        name="recipient"
                        required
                        maxLength={255}
                        autoComplete="off"
                        placeholder="Email or username"
                        className={cn(SELECT_CLASS, "h-9 font-normal")}
                      />
                      <SubmitButton variant="outline" size="sm" pendingLabel="…" className="h-9 border-2">
                        {s === "ready" ? "Change" : "Assign"}
                      </SubmitButton>
                    </form>
                  ) : null}

                  <div className="flex flex-wrap items-start gap-2">
                    {url ? (
                      <Tip label="Open file">
                        <a href={url} target="_blank" rel="noreferrer" aria-label="Open file" className={ACTION}>
                          <Download aria-hidden="true" />
                        </a>
                      </Tip>
                    ) : null}
                    {s !== "revoked" ? (
                      <Tip label="Edit text">
                        <Link href={`${here}&edit=${cert.uuid}`} scroll={false} aria-label="Edit text" className={ACTION}>
                          <Pencil aria-hidden="true" />
                        </Link>
                      </Tip>
                    ) : null}
                    {s === "ready" ? (
                      <form action={assignCertificate} className="flex">
                        {fields}
                        <input type="hidden" name="recipient" value="" />
                        <Tip label="Unassign">
                          <button type="submit" aria-label="Unassign" className={cn(ACTION, "cursor-pointer")}>
                            <UserMinus aria-hidden="true" />
                          </button>
                        </Tip>
                      </form>
                    ) : null}
                    {s === "unassigned" || s === "ready" || s === "failed" ? (
                      <ConfirmPopover
                        label="Delete"
                        iconOnly
                        icon={<Trash2 aria-hidden="true" />}
                        title="Delete this certificate?"
                        description={`${label} is removed from this batch. This can't be undone.`}
                        confirmLabel="Delete"
                        pendingLabel="Deleting…"
                        action={deleteCertificate}
                        fields={fields}
                      />
                    ) : null}
                    {s === "issued" ? (
                      <ConfirmPopover
                        label="Revoke"
                        iconOnly
                        icon={<Ban aria-hidden="true" />}
                        title="Revoke this certificate?"
                        description={`${cert.recipient?.name || cert.recipient?.username || "The recipient"} keeps seeing it, marked revoked, without a download. This can't be undone.`}
                        confirmLabel="Revoke"
                        pendingLabel="Revoking…"
                        action={revokeCertificate}
                        fields={fields}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {page && (page.hasPrev || page.hasNext) ? (
          <Pager page={page} href={(to) => href(filter, to)} label="Certificate pages" />
        ) : null}
      </div>
    </section>
  );
}
