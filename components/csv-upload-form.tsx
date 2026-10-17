"use client";

import { useState } from "react";

import { uploadBatch } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { FILE_CLASS } from "@/components/template-form";
import { uploadFile } from "@/lib/upload-client";
import { MAX_UPLOAD_MB } from "@/lib/uploads";

const LABEL =
  "block text-[0.625rem] font-bold tracking-widest text-muted-foreground uppercase";

/**
 * Client component because the CSV now goes browser → S3 before the API ever
 * hears about it. Server-side failures arrive as an error toast from
 * uploadBatch (lib/flash.ts); only the upload leg needs local state.
 */
export function CsvUploadForm({ templateUuid }: { templateUuid: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData: FormData) => {
        const file = formData.get("file");
        if (!(file instanceof File) || file.size === 0) {
          setError("Choose a CSV to upload.");
          return;
        }
        const uploaded = await uploadFile(file, "csv_batch");
        if ("error" in uploaded) {
          setError(uploaded.error);
          return;
        }
        setError(null);
        // Not wrapped in try/catch — uploadBatch redirects, and redirect()
        // works by throwing.
        await uploadBatch(templateUuid, uploaded.upload);
      }}
      className="mt-4 space-y-4"
    >
      <div>
        <label htmlFor="batch-file" className={LABEL}>
          CSV file
        </label>
        <input
          id="batch-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby="batch-file-hint"
          className={FILE_CLASS}
        />
        <p
          id="batch-file-hint"
          className="mt-2 text-xs tracking-widest text-muted-foreground uppercase"
        >
          First row is the column names, up to {MAX_UPLOAD_MB} MB
        </p>
      </div>

      <p aria-live="polite">
        {error ? (
          <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
            {error}
          </span>
        ) : null}
      </p>

      <SubmitButton pendingLabel="Uploading…" className="h-12 w-full">
        Upload CSV
      </SubmitButton>
    </form>
  );
}
