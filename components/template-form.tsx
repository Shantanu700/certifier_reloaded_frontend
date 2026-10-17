"use client";

import { useActionState, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import type { TemplateState } from "@/app/actions";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload-client";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/uploads";
import { cn } from "@/lib/utils";
import type { CertificateTemplate } from "@/src/client";

const FIELD_CLASS =
  "mt-2 h-14 w-full border-b-2 border-border bg-transparent px-4 text-lg font-bold tracking-tight outline-none focus:border-accent aria-[invalid]:border-destructive aria-[invalid]:focus:border-accent md:text-xl";

const LABEL_CLASS =
  "block px-4 text-xs font-bold tracking-widest text-muted-foreground uppercase";

export const FILE_CLASS =
  "mt-2 w-full cursor-pointer px-4 text-sm text-muted-foreground outline-none file:mr-4 file:cursor-pointer file:border-2 file:border-border file:bg-foreground file:px-4 file:py-2 file:text-xs file:font-bold file:tracking-widest file:text-background file:uppercase hover:file:border-accent hover:file:bg-accent hover:file:text-accent-foreground focus-visible:file:outline-2 focus-visible:file:outline-offset-2 focus-visible:file:outline-accent";

const ACCEPT = "image/png,image/jpeg,application/pdf";

export function TemplateForm({
  action,
  template,
  submitLabel,
  pendingLabel,
  idPrefix,
  row = false,
  secondary,
}: {
  action: (state: TemplateState, formData: FormData) => Promise<TemplateState>;
  template?: CertificateTemplate;
  submitLabel: string;
  pendingLabel: string;
  idPrefix: string;
  /** Inline layout for a page section: fields and actions sit side by side when there's room. */
  row?: boolean;
  /** A second action shown beside the submit button in `row` layout (e.g. a link elsewhere). */
  secondary?: ReactNode;
}) {
  // The file goes straight to S3 from here; the action only ever sees the uuid.
  const [state, formAction, pending] = useActionState(
    async (prev: TemplateState, formData: FormData): Promise<TemplateState> => {
      const file = formData.get("file");
      formData.delete("file"); // never let a File reach a server action
      if (file instanceof File && file.size > 0) {
        const uploaded = await uploadFile(file, "template");
        if ("error" in uploaded) return uploaded;
        formData.set("upload", uploaded.upload);
      }
      return action(prev, formData);
    },
    null
  );
  const [oversize, setOversize] = useState<string | null>(null);
  const failed = state && "error" in state;
  const statusId = `${idPrefix}-status`;
  // The modal indents labels to sit over the field text; a panel aligns them
  // flush with its own heading instead. twMerge lets px-0 win over px-4.
  const flush = row ? "px-0" : undefined;

  // `row` makes the form a container, so fields and buttons pair up only when
  // the section is wide enough for both labels on one line (narrow at lg, 1024px).
  return (
    <form action={formAction} className={row ? "@container space-y-5" : "space-y-8"}>
      {template ? (
        <input type="hidden" name="uuid" value={template.uuid ?? ""} />
      ) : null}

      <fieldset
        disabled={pending}
        className={
          row
            ? "grid gap-5 disabled:opacity-60 @[34rem]:grid-cols-2"
            : "space-y-6 disabled:opacity-60"
        }
      >
        <div>
          <label htmlFor={`${idPrefix}-name`} className={cn(LABEL_CLASS, flush)}>
            Template name
          </label>
          <input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            required
            maxLength={200}
            autoComplete="off"
            defaultValue={template?.name}
            placeholder="Workshop completion"
            aria-invalid={failed ? true : undefined}
            aria-describedby={state ? statusId : undefined}
            className={cn(FIELD_CLASS, flush)}
          />
        </div>

        <div>
          <label htmlFor={`${idPrefix}-file`} className={cn(LABEL_CLASS, flush)}>
            {template ? "Replace file" : "Template file"}
          </label>
          <input
            id={`${idPrefix}-file`}
            name="file"
            type="file"
            accept={ACCEPT}
            required={!template}
            aria-invalid={oversize ? true : undefined}
            aria-describedby={`${idPrefix}-file-hint`}
            className={cn(FILE_CLASS, flush)}
            onChange={(e) => {
              const picked = e.currentTarget.files?.[0];
              setOversize(
                picked && picked.size > MAX_UPLOAD_BYTES
                  ? `That file is ${(picked.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_MB} MB.`
                  : null
              );
            }}
          />
          <p
            id={`${idPrefix}-file-hint`}
            className={cn("mt-2 px-4 text-xs tracking-widest text-muted-foreground uppercase", flush)}
          >
            PNG, JPG or PDF, up to {MAX_UPLOAD_MB} MB
            {template ? ". Leave empty to keep the current file" : null}
          </p>
        </div>
      </fieldset>

      <div
        className={
          row ? "space-y-3" : "space-y-8"
        }
      >
        <p id={statusId} aria-live="polite" className={cn("min-h-8 px-4 empty:min-h-0", flush)}>
          {oversize ? (
            <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
              {oversize}
            </span>
          ) : null}
          {!oversize && state && "error" in state ? (
            <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
              {state.error}
            </span>
          ) : null}
        </p>

        <div className={row ? "grid gap-3 @[34rem]:grid-cols-2" : undefined}>
          <Button
            type="submit"
            disabled={pending || oversize !== null}
            aria-busy={pending}
            className="h-14 w-full gap-3 text-base tracking-tighter"
          >
            {pending ? pendingLabel : submitLabel}
            {pending ? <Loader /> : <ArrowRight className="size-5" aria-hidden="true" />}
          </Button>
          {row ? secondary : null}
        </div>
      </div>
    </form>
  );
}
