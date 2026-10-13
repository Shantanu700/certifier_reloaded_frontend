"use client";

import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";

import type { TemplateState } from "@/app/actions";
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
}: {
  action: (state: TemplateState, formData: FormData) => Promise<TemplateState>;
  template?: CertificateTemplate;
  submitLabel: string;
  pendingLabel: string;
  idPrefix: string;
  row?: boolean;
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

  return (
    <form action={formAction} className={row ? "space-y-4" : "space-y-8"}>
      {template ? (
        <input type="hidden" name="uuid" value={template.uuid ?? ""} />
      ) : null}

      <fieldset
        disabled={pending}
        className={
          row
            ? "grid gap-5 disabled:opacity-60 sm:grid-cols-2"
            : "space-y-6 disabled:opacity-60"
        }
      >
        <div>
          <label htmlFor={`${idPrefix}-name`} className={LABEL_CLASS}>
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
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor={`${idPrefix}-file`} className={LABEL_CLASS}>
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
            className={FILE_CLASS}
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
            className="mt-2 px-4 text-xs tracking-widest text-muted-foreground uppercase"
          >
            PNG, JPG or PDF, up to {MAX_UPLOAD_MB} MB
            {template ? " — leave empty to keep the current file" : null}
          </p>
        </div>
      </fieldset>

      <div
        className={
          row
            ? "flex flex-wrap items-center justify-between gap-4"
            : "space-y-8"
        }
      >
        <p id={statusId} aria-live="polite" className="min-h-8 px-4">
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
          {!oversize && state && "saved" in state ? (
            <span className="inline-block bg-accent px-3 py-1.5 text-sm font-bold tracking-widest text-accent-foreground uppercase">
              Saved
            </span>
          ) : null}
        </p>

        <Button
          type="submit"
          disabled={pending || oversize !== null}
          aria-busy={pending}
          className={cn(
            "h-14 gap-3 text-base tracking-tighter transition-transform hover:scale-[1.02] active:scale-95",
            row ? "px-10" : "w-full"
          )}
        >
          {pending ? pendingLabel : submitLabel}
          <ArrowRight className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
