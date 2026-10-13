"use client";

import { presignUpload } from "@/app/actions";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/uploads";
import type { CategoryEnum } from "@/src/client";

export type Uploaded = { upload: string } | { error: string };

/**
 * The whole client-direct upload: presign, push the bytes to S3, hand back the
 * uuid for the caller to confirm against the API.
 *
 * Returns a union rather than throwing, because callers run this next to server
 * actions that redirect() — and redirect throws a control-flow exception that a
 * try/catch around the upload would swallow.
 *
 * ponytail: a failed confirm leaves the S3 object orphaned. Nothing here caches
 * the uuid, so a retry re-runs all three steps; the backend sweeps the strays.
 */
export async function uploadFile(
  file: File,
  category: CategoryEnum
): Promise<Uploaded> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `That file is over the ${MAX_UPLOAD_MB} MB limit.` };
  }

  // File.type is whatever the browser guessed: empty for some files, and a .csv
  // picked in Chrome on Windows reports application/vnd.ms-excel. The backend
  // validates the *declared* type at presign, so declare it from the category
  // we already know instead of trusting the guess.
  const content_type = category === "csv_batch" ? "text/csv" : file.type;
  if (!content_type) {
    return { error: "Couldn't tell what kind of file that is." };
  }

  const presigned = await presignUpload({
    filename: file.name,
    content_type,
    category,
  });
  if ("error" in presigned) return presigned;

  let response;
  try {
    // A raw PUT of the bytes — no FormData, no multipart. `headers` comes back
    // from the presign and must be sent verbatim: the signature is computed over
    // it, so adding or dropping one gets the request rejected. No credentials —
    // the signature in the URL is the authorization.
    response = await fetch(presigned.url, {
      method: "PUT",
      headers: presigned.headers,
      body: file,
    });
  } catch {
    return { error: "Couldn't reach file storage. Check your connection." };
  }

  if (!response.ok) {
    console.error("s3 upload rejected", response.status);
    return { error: `Storage rejected that file (${response.status}).` };
  }

  return { upload: presigned.upload_uuid };
}
