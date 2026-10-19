import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, SlidersHorizontal, Trash2 } from "lucide-react";

import { deleteTemplate, editCertificate, syncFromCanva, updateTemplate } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { CanvaQualitySlider } from "@/components/canva-quality-slider";
import { CsvPanel, GeneratePanel, MappingPanel } from "@/components/batch-panels";
import { ConfirmPopover } from "@/components/confirm-popover";
import { ISSUE_FILTERS, IssuePanel, type IssueFilter } from "@/components/issue-panel";
import { Modal } from "@/components/modal";
import { StepLink } from "@/components/step-link";
import { SubmitButton } from "@/components/submit-button";
import { TemplateForm } from "@/components/template-form";
import {
  TemplatePreview,
  isImageFile,
  templateFileUrl,
} from "@/components/template-preview";
import {
  TemplateWorkspace,
  type EditorImageBox,
} from "@/components/template-workspace";
import { asList, asMapping, asPageNumber, asPageSize, type PageInfo } from "@/lib/api";
import { isMappable } from "@/lib/boxes";
import { requireSession, sessionHeader } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  listCertificateBatches,
  listGeneratedCertificates,
  listTemplateBoxes,
  listTemplateImageBoxes,
  retrieveCertificateBatchIssuance,
  retrieveCertificateTemplate,
  retrieveGeneratedCertificate,
  type CertificateBatch,
  type GeneratedCertificate,
  type IssuanceCounts,
  type TemplateBox,
  type TemplateImageBox,
} from "@/src/client";

const STAMP: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

const META_LABEL =
  "text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase";
const RAIL_HEADING =
  "text-xs font-bold tracking-widest text-muted-foreground uppercase";

const STEPS = [
  { id: "boxes", label: "Place boxes" },
  { id: "csv", label: "Upload CSV" },
  { id: "mapping", label: "Map columns" },
  { id: "generate", label: "Generate" },
  { id: "issue", label: "Issue" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const isStep = (value: unknown): value is StepId =>
  STEPS.some((s) => s.id === value);

export default async function TemplatePage({
  params,
  searchParams,
}: PageProps<"/templates/[uuid]">) {
  const { uuid } = await params;
  const {
    step: stepParam,
    batch: batchParam,
    page: pageParam,
    size: sizeParam,
    settings: settingsParam,
    filter: filterParam,
    edit: editParam,
  } = await searchParams;
  const filter = ISSUE_FILTERS.find((f) => f.id === filterParam)?.id;
  const step: StepId = isStep(stepParam) ? stepParam : "boxes";
  const showSettings = settingsParam === "1";
  // The four calls below carry the session themselves, so a dead session shows up as a
  // 401/403 on them; checking it first would be a fifth Django round trip per step.
  const { sessionId } = await requireSession();
  const headers = sessionHeader(sessionId);
  const fetched = await Promise.all([
    retrieveCertificateTemplate({ path: { uuid }, headers }),
    listTemplateBoxes({ path: { template_uuid: uuid }, headers }),
    listTemplateImageBoxes({ path: { template_uuid: uuid }, headers }),
    listCertificateBatches({ path: { template_uuid: uuid }, headers }),
  ]).catch(() => null);
  // 401 is a dead session; 403 is a logged-in recipient, who has no templates (/home sends
  // them on). Checked outside the catch above: redirect() works by throwing.
  if (fetched?.some((r) => r.response?.status === 401)) redirect("/login");
  if (fetched?.some((r) => r.response?.status === 403)) redirect("/home");

  let boxes: TemplateBox[] = [];
  let imageBoxes: EditorImageBox[] = [];
  let batches: CertificateBatch[] = [];
  const template = fetched?.[0].data;
  if (fetched) {
    const [, boxResult, imageBoxResult, batchResult] = fetched;
    boxes = asList<TemplateBox>(boxResult.data).filter((box) => box?.key);
    imageBoxes = asList<TemplateImageBox>(imageBoxResult.data)
      .filter((box) => box?.key)
      .map((box) => ({ ...box, imageUrl: templateFileUrl(box.image) }));
    batches = asList<CertificateBatch>(batchResult.data).filter((b) => b?.uuid);
  }
  if (!template) notFound();
  // Verification boxes print the certificate's own code, so they never take a CSV column or typed text.
  const mappableBoxes = boxes.filter((box) => isMappable(box.type));

  const templateUuid = template.uuid ?? uuid;
  const fileUrl = templateFileUrl(template.file);
  const editable = isImageFile(template.file);

  const ordered = [...batches].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  );
  // "manual" is where issuing one by hand lands: that action doesn't know the batch's uuid.
  const selectedBatch =
    ordered.find((b) => (batchParam === "manual" ? b.is_manual : b.uuid === batchParam)) ??
    ordered[0];

  let certificates: GeneratedCertificate[] = [];
  let certPage: PageInfo | undefined;
  if (step === "generate" && selectedBatch?.uuid) {
    const page = asPageNumber(pageParam);
    const size = asPageSize(sizeParam);
    try {
      const result = await listGeneratedCertificates({
        path: { uuid: selectedBatch.uuid },
        headers,
        query: { page, page_size: size } as never,
      });
      certificates = (result.data?.results ?? []).filter((cert) => cert?.uuid);
      certPage = {
        count: result.data?.count ?? certificates.length,
        page,
        size,
        hasNext: Boolean(result.data?.next),
        hasPrev: Boolean(result.data?.previous),
      };
    } catch {}
  }

  let counts: IssuanceCounts | undefined;
  let editing: GeneratedCertificate | undefined;
  const issueHref = (to: IssueFilter | undefined, page: number) =>
    `/templates/${templateUuid}?step=issue&batch=${selectedBatch?.uuid}${to ? `&filter=${to}` : ""}${
      page > 1 ? `&page=${page}` : ""
    }&size=${asPageSize(sizeParam)}`;
  const issueHere = issueHref(filter, asPageNumber(pageParam));
  if (step === "issue" && selectedBatch?.uuid) {
    const page = asPageNumber(pageParam);
    const size = asPageSize(sizeParam);
    try {
      const [countResult, listResult, editResult] = await Promise.all([
        retrieveCertificateBatchIssuance({ path: { uuid: selectedBatch.uuid }, headers }),
        listGeneratedCertificates({
          path: { uuid: selectedBatch.uuid },
          headers,
          query: { page, page_size: size, ...(filter && { filter }) },
        }),
        typeof editParam === "string"
          ? retrieveGeneratedCertificate({ path: { uuid: editParam }, headers })
          : undefined,
      ]);
      counts = countResult.data;
      certificates = (listResult.data?.results ?? []).filter((cert) => cert?.uuid);
      certPage = {
        count: listResult.data?.count ?? certificates.length,
        page,
        size,
        hasNext: Boolean(listResult.data?.next),
        hasPrev: Boolean(listResult.data?.previous),
      };
      editing = editResult?.data;
    } catch {}
  }

  const href = (id: StepId) =>
    `/templates/${templateUuid}?step=${id}${
      selectedBatch?.uuid ? `&batch=${selectedBatch.uuid}` : ""
    }`;

  // The key is not decoration: this element crosses into a client component as a
  // prop, and when the RSC payload delivers it as a lazy chunk React can miss the
  // static-child check and warn "Each child in a list should have a unique key".
  const tabs = (
    <nav
      key="steps"
      aria-label="Steps"
      className="grid shrink-0 grid-cols-3 gap-px border-b-2 border-border bg-border sm:grid-cols-5"
    >
      {STEPS.map((s, i) => {
        const current = s.id === step;
        return (
          <StepLink
            key={s.id}
            href={href(s.id)}
            aria-current={current ? "step" : undefined}
            className={cn(
              "block px-4 py-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
              current
                ? "bg-accent text-accent-foreground"
                : "bg-background hover:bg-muted"
            )}
          >
            <span className="font-mono text-[0.625rem] font-bold opacity-60">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[0.6875rem] leading-tight font-bold tracking-widest uppercase">
              {s.label}
            </span>
          </StepLink>
        );
      })}
    </nav>
  );

  const panel =
    step === "csv" ? (
      <CsvPanel
        templateUuid={templateUuid}
        batches={ordered}
        selected={selectedBatch}
        boxes={mappableBoxes}
      />
    ) : step === "mapping" ? (
      <MappingPanel
        templateUuid={templateUuid}
        batch={selectedBatch}
        boxes={mappableBoxes}
      />
    ) : step === "generate" ? (
      <GeneratePanel
        templateUuid={templateUuid}
        batch={selectedBatch}
        certificates={certificates}
        page={certPage}
      />
    ) : step === "issue" ? (
      <IssuePanel
        templateUuid={templateUuid}
        batch={selectedBatch}
        counts={counts}
        certificates={certificates}
        page={certPage}
        filter={filter}
        here={issueHere}
        href={issueHref}
      />
    ) : null;

  // Only boxes with text behind them can be edited: a CSV batch's unmapped boxes print nothing.
  const mapping = asMapping(selectedBatch?.mapping);
  const editRow = (editing?.row_data ?? {}) as Record<string, unknown>;
  const editDialog =
    step === "issue" && editing && selectedBatch ? (
      <Modal closeHref={issueHere} label="Edit certificate text">
        <form action={editCertificate} className="space-y-5">
          <input type="hidden" name="templateUuid" value={templateUuid} />
          <input type="hidden" name="batch" value={selectedBatch.uuid} />
          <input type="hidden" name="uuid" value={editing.uuid} />
          <input type="hidden" name="back" value={issueHere} />
          <p className="text-sm text-muted-foreground">
            Saving makes the certificate again with this text.
            {editing.issue_status === "issued" ? " Its recipient sees the new version straight away." : null}
          </p>
          {mappableBoxes
            .filter((box) => mapping[box.key])
            .map((box) => (
              <label key={box.uuid ?? box.key} className="block">
                <span className={META_LABEL}>{box.key}</span>
                <input
                  name={`value:${box.key}`}
                  maxLength={500}
                  defaultValue={String(editRow[mapping[box.key]] ?? "")}
                  className="mt-2 h-11 w-full border-2 border-border bg-transparent px-3 text-sm font-bold tracking-tight outline-none focus:border-accent"
                />
              </label>
            ))}
          <SubmitButton pendingLabel="Saving…" className="h-12 w-full">
            Save and re-make
          </SubmitButton>
        </form>
      </Modal>
    ) : null;

  const settings = (
    <section className="space-y-8">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <dt className={META_LABEL}>Created</dt>
          <dd
            suppressHydrationWarning
            className="mt-1 text-sm font-bold tracking-tight"
          >
            {new Date(template.created_at).toLocaleString(undefined, STAMP)}
          </dd>
        </div>
        <div>
          <dt className={META_LABEL}>Updated</dt>
          <dd
            suppressHydrationWarning
            className="mt-1 text-sm font-bold tracking-tight"
          >
            {new Date(template.updated_at).toLocaleString(undefined, STAMP)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className={META_LABEL}>Reference</dt>
          <dd className="mt-1 font-mono text-xs break-all text-muted-foreground">
            {template.uuid ?? "Not assigned"}
          </dd>
        </div>
      </dl>

      {template.canva_design_id ? (
        <form action={syncFromCanva} className="border-t-2 border-border pt-6">
          <h3 className={RAIL_HEADING}>From Canva</h3>
          <p className="mt-4 text-sm text-muted-foreground">
            Re-export page {template.canva_page ?? 1} of the Canva design after editing
            it there. Leave the quality as it is to keep the current size; placed boxes
            are scaled to fit a new one. The design&apos;s shape must not change.
          </p>
          <input type="hidden" name="uuid" value={templateUuid} />
          <div className="mt-5">
            <CanvaQualitySlider
              id="sync-width"
              thumbnailWidth={null}
              thumbnailHeight={null}
              currentUrl={fileUrl}
            />
          </div>
          <SubmitButton
            variant="outline"
            pendingLabel="Refreshing…"
            className="mt-5 h-12 w-full border-2"
          >
            Refresh from Canva
          </SubmitButton>
        </form>
      ) : null}

      <div className="border-t-2 border-border pt-6">
        <h3 className={RAIL_HEADING}>Rename or replace</h3>
        <div className="mt-4">
          <TemplateForm
            action={updateTemplate}
            template={template}
            idPrefix="edit"
            submitLabel="Save changes"
            pendingLabel="Saving…"
          />
        </div>
      </div>

      <div className="border-t-2 border-border pt-6">
        <p className="text-sm text-muted-foreground">
          Deleting <span className="font-bold text-foreground">{template.name}</span>{" "}
          removes its file, its boxes and every batch run from it.
        </p>
        <ConfirmPopover
          label="Delete template"
          icon={<Trash2 aria-hidden="true" />}
          triggerClassName="mt-5 h-12 w-full"
          title={`Delete ${template.name}?`}
          description="Its file, boxes and batches go with it. This can't be undone."
          confirmLabel="Delete template"
          pendingLabel="Deleting…"
          action={deleteTemplate}
          fields={<input type="hidden" name="uuid" value={templateUuid} />}
        />
      </div>
    </section>
  );

  return (
    <div className="flex flex-col lg:h-dvh lg:overflow-hidden">
      <AppHeader crumb="Templates" />

      <section className="flex shrink-0 flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b-2 border-border px-6 py-6 md:px-10">
        <div className="min-w-0">
          <Link
            href="/templates"
            className="tap inline-flex items-center gap-2 text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            All templates
          </Link>
          <h1 className="mt-3 text-3xl leading-[0.9] font-bold tracking-tighter uppercase md:text-5xl">
            {template.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-2 border-border px-3 py-2 text-[0.6875rem] font-bold tracking-widest uppercase transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Open original
            </a>
          ) : null}
          <Link
            href={showSettings ? href(step) : `${href(step)}&settings=1`}
            aria-current={showSettings ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 border-2 px-3 py-2 text-[0.6875rem] font-bold tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              showSettings
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border hover:bg-muted"
            )}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            Template settings
          </Link>
        </div>
      </section>

      {editable && fileUrl ? (
        <TemplateWorkspace
          key={template.file?.uuid}
          templateUuid={templateUuid}
          src={fileUrl}
          name={template.name}
          boxes={boxes}
          imageBoxes={imageBoxes}
          editing={step === "boxes"}
          editHref={href("boxes")}
          tabs={tabs}
        >
          {panel}
        </TemplateWorkspace>
      ) : (
        <div className="grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex min-h-0 flex-col border-b-2 border-border p-6 md:p-8 lg:border-r-2 lg:border-b-0">
            <TemplatePreview
              file={template.file}
              name={template.name}
              embed
              className="aspect-4/3 w-full bg-muted/40 lg:aspect-auto lg:min-h-0 lg:flex-1"
            />
          </div>
          <div className="flex min-h-0 flex-col">
            {tabs}
            <div className="relative min-h-0 flex-1 space-y-8 p-6 md:p-8 lg:overflow-y-auto">
              {step === "boxes" ? (
                <p className="border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
                  Text boxes can only be placed on a PNG or JPG. Replace the file
                  under Template settings to lay out where values print.
                </p>
              ) : (
                panel
              )}
            </div>
          </div>
        </div>
      )}

      {editDialog}
      {showSettings ? (
        <Modal closeHref={href(step)} label="Template settings">
          {settings}
        </Modal>
      ) : null}
    </div>
  );
}
