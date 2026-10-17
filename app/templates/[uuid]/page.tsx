import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, SlidersHorizontal } from "lucide-react";

import { deleteTemplate, syncFromCanva, updateTemplate } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { CsvPanel, GeneratePanel, MappingPanel } from "@/components/batch-panels";
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
import { asList, asPageNumber, asPageSize, type PageInfo } from "@/lib/api";
import { getSessionId, sessionHeader } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  listCertificateBatches,
  listGeneratedCertificates,
  listTemplateBoxes,
  listTemplateImageBoxes,
  retrieveCertificateTemplate,
  type CertificateBatch,
  type GeneratedCertificate,
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
    error,
    step: stepParam,
    batch: batchParam,
    page: pageParam,
    size: sizeParam,
    settings: settingsParam,
  } = await searchParams;
  const step: StepId = isStep(stepParam) ? stepParam : "boxes";
  const showSettings = settingsParam === "1";
  // No requireUser() here: the four calls below carry the session themselves,
  // so a dead session shows up as a 401/403 on them and re-validating it first
  // would just be a fifth Django round trip on every step navigation.
  const sessionId = await getSessionId();
  if (!sessionId) redirect("/login");
  const headers = sessionHeader(sessionId);
  const fetched = await Promise.all([
    retrieveCertificateTemplate({ path: { uuid }, headers }),
    listTemplateBoxes({ path: { template_uuid: uuid }, headers }),
    listTemplateImageBoxes({ path: { template_uuid: uuid }, headers }),
    listCertificateBatches({ path: { template_uuid: uuid }, headers }),
  ]).catch(() => null);
  // DRF answers an unauthenticated session with 403, not 401 — check both, and
  // outside the catch above: redirect() works by throwing.
  if (fetched?.some((r) => r.response?.status === 401 || r.response?.status === 403))
    redirect("/login");

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

  const templateUuid = template.uuid ?? uuid;
  const fileUrl = templateFileUrl(template.file);
  const editable = isImageFile(template.file);

  const ordered = [...batches].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  );
  const selectedBatch =
    ordered.find((b) => b.uuid === batchParam) ?? ordered[0];

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

  const href = (id: StepId) =>
    `/templates/${templateUuid}?step=${id}${
      selectedBatch?.uuid ? `&batch=${selectedBatch.uuid}` : ""
    }`;

  const tabs = (
    <nav
      aria-label="Steps"
      className="grid shrink-0 grid-cols-2 gap-px border-b-2 border-border bg-border sm:grid-cols-4"
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
      />
    ) : step === "mapping" ? (
      <MappingPanel
        templateUuid={templateUuid}
        batch={selectedBatch}
        boxes={boxes}
      />
    ) : step === "generate" ? (
      <GeneratePanel
        templateUuid={templateUuid}
        batch={selectedBatch}
        certificates={certificates}
        page={certPage}
      />
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
            it there. Boxes stay where they are, so the design&apos;s size must not change.
          </p>
          <input type="hidden" name="uuid" value={templateUuid} />
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

      <form action={deleteTemplate} className="border-t-2 border-border pt-6">
        <p className="text-sm text-muted-foreground">
          Deleting <span className="font-bold text-foreground">{template.name}</span>{" "}
          removes its file, its boxes and every batch run from it.
        </p>
        <input type="hidden" name="uuid" value={templateUuid} />
        <SubmitButton
          variant="destructive"
          pendingLabel="Deleting…"
          className="mt-5 h-12 w-full border-2 border-destructive/40"
        >
          Delete template
        </SubmitButton>
      </form>
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
          {error ? (
            <p role="alert">
              <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
                {error}
              </span>
            </p>
          ) : null}
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="tap inline-flex items-center gap-2 text-[0.6875rem] font-bold tracking-widest uppercase underline underline-offset-4 hover:bg-accent hover:text-accent-foreground hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Open original
              <ExternalLink className="size-3.5" aria-hidden="true" />
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
          <div className="flex min-h-0 flex-col lg:overflow-y-auto">
            {tabs}
            <div className="space-y-8 p-6 md:p-8">
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

      {showSettings ? (
        <Modal closeHref={href(step)} label="Template settings">
          {settings}
        </Modal>
      ) : null}
    </div>
  );
}
