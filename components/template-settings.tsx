import { Trash2 } from "lucide-react";

import { deleteTemplate, syncFromCanva, updateTemplate } from "@/app/actions";
import { CanvaQualitySlider } from "@/components/canva-quality-slider";
import { ConfirmPopover } from "@/components/confirm-popover";
import { SubmitButton } from "@/components/submit-button";
import { TemplateForm } from "@/components/template-form";
import { templateFileUrl } from "@/components/template-preview";
import type { CertificateTemplate } from "@/src/client";

const STAMP: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export const META_LABEL =
  "text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase";
const RAIL_HEADING =
  "text-xs font-bold tracking-widest text-muted-foreground uppercase";

/**
 * A template's details, Canva refresh, rename/replace and delete: the body of the
 * "Template settings" modal, both in the editor and on the template list.
 * `done` is where Refresh lands (modal closed); `retry` is where a failed Refresh or
 * Delete lands (modal still open), so each page brings the user back to itself.
 */
export function TemplateSettings({
  template,
  done,
  retry,
}: {
  template: CertificateTemplate;
  done: string;
  retry: string;
}) {
  const uuid = template.uuid ?? "";
  const fileUrl = templateFileUrl(template.file);
  const back = (
    <>
      <input type="hidden" name="uuid" value={uuid} />
      <input type="hidden" name="done" value={done} />
      <input type="hidden" name="retry" value={retry} />
    </>
  );

  return (
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
          {back}
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
          fields={back}
        />
      </div>
    </section>
  );
}
