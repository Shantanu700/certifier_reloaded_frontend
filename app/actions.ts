"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { templateFileUrl } from "@/components/template-preview";
import {
  ALIGNMENTS,
  BOX_TYPES,
  FONTS,
  type BoxDraft,
  type ImageBoxDraft,
} from "@/lib/boxes";
import { asNamingParts } from "@/lib/api";
import { flashCookie, type FlashType } from "@/lib/flash";
import { SESSION_COOKIE, requireUser, sessionHeader } from "@/lib/session";
import {
  deleteCanvaConnection,
  deleteCertificateBatches,
  deleteCertificates,
  deleteCertificateTemplate,
  deleteCertificateTemplateBoxes,
  deleteCertificateTemplateImageBoxes,
  deleteCoreLogin,
  getCanvaConnect,
  postCertificateBatchesExport,
  postCertificateBatchesGenerate,
  postCertificateBatchesIssue,
  postCertificateBatchesMatch,
  postCertificateBatchesRevoke,
  postCertificatesRevoke,
  postCertificateTemplate,
  postCertificateTemplateBatches,
  postCertificateTemplateBoxes,
  postCertificateTemplateCanvaSync,
  postCertificateTemplateImageBoxes,
  postCertificateTemplateImportCanva,
  postCertificateTemplateIssueOne,
  postCoreGoogle,
  postCoreLogin,
  postCoreRegister,
  postCoreUploadUrl,
  postCoreVerifyEmailResend,
  putCertificates,
  putCoreProfile,
  putCertificateBatchesMapping,
  putCertificateBatchesNaming,
  retrieveCertificateBatchExportProgress,
  retrieveCertificateBatchProgress,
  putCertificateTemplate,
  putCertificateTemplateBoxes,
  putCertificateTemplateImageBoxes,
  type CanvaTemplateImportResult,
  type PresignUploadRequest,
  type PresignUploadResponse,
  type RoleEnum,
  type TemplateBox,
  type TemplateImageBox,
} from "@/src/client";

export type LoginState = { error: string; username: string } | null;

function sessionIdFrom(response: Response | undefined) {
  const cookie = response?.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.split(";", 1)[0].slice(SESSION_COOKIE.length + 1);
}

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    if ("msg" in error && typeof error.msg === "string") return error.msg;
    if ("detail" in error && Array.isArray(error.detail)) return error.detail.join(" ");
    // SerializerError (418) bodies are DRF field errors: { field: ["message", ...] }
    const first = Object.values(error).flat().find((v) => typeof v === "string");
    if (first) return first;
  }
  return fallback;
}

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Username and password are both required.", username };
  }

  let result;
  try {
    result = await postCoreLogin({
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
    });
  } catch {
    return { error: "Can't reach the server. Try again in a moment.", username };
  }

  if (result.error) {
    console.error("login failed", result.response?.status, result.error);
    return {
      error: messageFrom(result.error, "Sign-in failed. Please try again."),
      username,
    };
  }

  return { error: await startSession(result.response, "Signed in."), username };
}

/** Copies the backend's sessionid onto our origin and lands on /home; returns an error otherwise. */
async function startSession(response: Response | undefined, welcome: string) {
  const sessionId = sessionIdFrom(response);
  if (!sessionId) return "The server didn't return a session.";

  (await cookies()).set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  await flash("success", welcome);
  redirect("/home");
}

export async function register(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const username = field("username");
  const password = String(formData.get("password") ?? "");
  const role = asRole(formData.get("role"));

  if (!role) return { error: "Choose whether you issue or receive certificates.", username };
  if (password !== String(formData.get("confirmPassword") ?? "")) {
    return { error: "Those two passwords don't match.", username };
  }

  let result;
  try {
    result = await postCoreRegister({
      body: { username, name: field("name"), email: field("email"), password, role },
    });
  } catch {
    return { error: "Can't reach the server. Try again in a moment.", username };
  }

  if (result.error) {
    console.error("register failed", result.response?.status, result.error);
    return {
      error: messageFrom(result.error, "Sign-up failed. Please try again."),
      username,
    };
  }

  return {
    error: await startSession(
      result.response,
      "Account created. Check your inbox for a link to verify your email."
    ),
    username,
  };
}

const asRole = (value: unknown): RoleEnum | undefined =>
  value === "issuer" || value === "recipient" ? value : undefined;

/**
 * Called from the Google button's callback with the ID token (credential) Google hands the browser.
 * `role` is sent from sign-up mode; the backend only needs it when the account is new.
 */
export async function googleLogin(idToken: string, role?: string): Promise<string> {
  const chosen = asRole(role);
  let result;
  try {
    result = await postCoreGoogle({ body: { id_token: idToken, ...(chosen && { role: chosen }) } });
  } catch {
    return "Can't reach the server. Try again in a moment.";
  }

  if (result.error) {
    console.error("google login failed", result.response?.status, result.error);
    return messageFrom(result.error, "Google sign-in failed. Please try again.");
  }

  return startSession(result.response, "Signed in with Google.");
}

export async function logout() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    try {
      await deleteCoreLogin({ headers: sessionHeader(sessionId) });
    } catch {}
  }

  store.delete(SESSION_COOKIE);
  store.set(...flashCookie("info", "Signed out."));
  redirect("/login");
}

export type TemplateState = { error: string } | { saved: true } | null;

/**
 * Step 1 of the client-direct S3 upload. The browser can't call this endpoint
 * itself — the sessionid cookie is httpOnly on our origin — so it hops through
 * here. Only the bytes (step 2) go straight from the browser to S3.
 */
export async function presignUpload(
  body: PresignUploadRequest
): Promise<PresignUploadResponse | { error: string }> {
  const { sessionId } = await requireUser();

  let result;
  try {
    result = await postCoreUploadUrl({ body, headers: sessionHeader(sessionId) });
  } catch {
    return { error: "Can't reach the server. Try again in a moment." };
  }

  if (result.error || !result.data) {
    console.error("presign failed", result.response?.status, result.error);
    return { error: messageFrom(result.error, "Couldn't start that upload.") };
  }

  return result.data;
}

export async function uploadTemplate(
  _prev: TemplateState,
  formData: FormData
): Promise<TemplateState> {
  const { sessionId } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const upload = String(formData.get("upload") ?? "");

  if (!name) return { error: "Give the template a name." };
  if (!upload) return { error: "Choose a PDF or image to upload." };

  let result;
  try {
    result = await postCertificateTemplate({
      body: { name, upload },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return { error: "Can't reach the server. Try again in a moment." };
  }

  if (result.error || !result.data?.uuid) {
    console.error("template upload failed", result.response?.status, result.error);
    return { error: messageFrom(result.error, "Upload failed. Please try again.") };
  }

  revalidatePath("/templates");
  await flash("success", "Template uploaded.");
  redirect(`/templates/${result.data.uuid}`);
}

export async function updateTemplate(
  _prev: TemplateState,
  formData: FormData
): Promise<TemplateState> {
  const { sessionId } = await requireUser();
  const uuid = String(formData.get("uuid") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const upload = String(formData.get("upload") ?? "");

  if (!uuid) return { error: "Missing template reference. Reload and try again." };
  if (!name) return { error: "Give the template a name." };

  let result;
  try {
    result = await putCertificateTemplate({
      path: { uuid },
      body: upload ? { name, upload } : { name },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return { error: "Can't reach the server. Try again in a moment." };
  }

  if (result.error) {
    console.error("template update failed", result.response?.status, result.error);
    return { error: messageFrom(result.error, "Save failed. Please try again.") };
  }

  revalidatePath("/templates");
  revalidatePath(`/templates/${uuid}`);
  await flash("success", "Changes saved.");
  return { saved: true };
}

export async function deleteTemplate(formData: FormData) {
  const { sessionId } = await requireUser();
  const uuid = String(formData.get("uuid") ?? "");
  if (!uuid) redirect("/templates");

  let error: unknown;
  try {
    const result = await deleteCertificateTemplate({
      path: { uuid },
      headers: sessionHeader(sessionId),
    });
    error = result.error;
  } catch {
    error = { msg: "Can't reach the server. Try again in a moment." };
  }

  if (error) {
    console.error("template delete failed", error);
    return fail(`/templates/${uuid}`, messageFrom(error, "Delete failed. Please try again."));
  }

  revalidatePath("/templates");
  await flash("success", "Template deleted.");
  redirect("/templates");
}

const CANVA_PAGE = "/templates/canva";

/** Sends the browser to Canva's consent screen; Canva comes back to /canva/callback. */
export async function connectCanva() {
  const { sessionId } = await requireUser();

  let url: string | undefined;
  let message = "Couldn't start the Canva sign-in.";
  try {
    const result = await getCanvaConnect({ headers: sessionHeader(sessionId) });
    url = result.data?.authorize_url;
    if (result.error) message = messageFrom(result.error, message);
  } catch {
    message = "Can't reach the server. Try again in a moment.";
  }

  if (!url) return fail(CANVA_PAGE, message);
  redirect(url);
}

export async function disconnectCanva() {
  const { sessionId } = await requireUser();

  let error: unknown;
  try {
    error = (await deleteCanvaConnection({ headers: sessionHeader(sessionId) })).error;
  } catch {
    error = { msg: "Can't reach the server. Try again in a moment." };
  }

  if (error) return fail(CANVA_PAGE, messageFrom(error, "Couldn't disconnect Canva."));
  await flash("success", "Canva disconnected.");
  redirect(CANVA_PAGE);
}

export async function importCanvaDesign(formData: FormData) {
  const { sessionId } = await requireUser();
  const design_id = String(formData.get("design_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const page = Math.max(1, Math.trunc(Number(formData.get("page"))) || 1);
  // The slider's value; the backend enforces its 800–4000 px bounds and defaults when absent.
  const width = Math.trunc(Number(formData.get("width"))) || undefined;
  // Land back on the same search results if the import fails.
  const back = String(formData.get("back") ?? "").startsWith(CANVA_PAGE)
    ? String(formData.get("back"))
    : CANVA_PAGE;

  if (!design_id) return fail(back, "Pick a Canva design to import.");
  if (!name) return fail(back, "Give the template a name.");

  let imported: CanvaTemplateImportResult | undefined;
  let error: unknown;
  try {
    const result = await postCertificateTemplateImportCanva({
      body: { design_id, name, page, width },
      headers: sessionHeader(sessionId),
    });
    imported = result.data;
    error = result.error;
  } catch {
    error = { msg: "Can't reach the server. Try again in a moment." };
  }

  const uuid = imported?.template.uuid;
  if (error || !imported || !uuid) {
    console.error("canva import failed", error);
    return fail(back, messageFrom(error, "Import failed. Please try again."));
  }

  revalidatePath("/templates");
  // Canva may refuse to upscale (Free-plan limit); say so rather than quietly delivering less.
  if (imported.downscaled) {
    await flash(
      "warning",
      `Imported at ${imported.width} × ${imported.height} px: your Canva plan didn't allow a larger export.`
    );
  } else {
    await flash("success", `Imported “${name}” from Canva.`);
  }
  redirect(`/templates/${uuid}`);
}

export async function syncFromCanva(formData: FormData) {
  const { sessionId } = await requireUser();
  const uuid = String(formData.get("uuid") ?? "");
  if (!uuid) redirect("/templates");

  let error: unknown;
  try {
    error = (
      await postCertificateTemplateCanvaSync({
        path: { uuid },
        headers: sessionHeader(sessionId),
      })
    ).error;
  } catch {
    error = { msg: "Can't reach the server. Try again in a moment." };
  }

  if (error) {
    console.error("canva sync failed", error);
    return fail(`/templates/${uuid}?settings=1`, messageFrom(error, "Refresh failed. Please try again."));
  }

  revalidatePath("/templates");
  revalidatePath(`/templates/${uuid}`);
  await flash("success", "Refreshed from Canva.");
  redirect(`/templates/${uuid}`);
}


export type BoxState = { box: TemplateBox } | { error: string };

function invalidRect(draft: ImageBoxDraft) {
  if (!/^[-a-zA-Z0-9_]{1,100}$/.test(draft.key)) {
    return "Keys can only use letters, numbers, hyphens and underscores.";
  }
  for (const field of ["x", "y", "width", "height"] as const) {
    if (!Number.isInteger(draft[field]) || draft[field] < 0) {
      return "Position and size must be whole numbers of pixels.";
    }
  }
  if (draft.width < 1 || draft.height < 1) return "A box needs a size.";
}

function invalidBox(draft: BoxDraft) {
  const problem = invalidRect(draft);
  if (problem) return problem;
  if (!FONTS.includes(draft.font)) return "Unknown font.";
  if (!Number.isInteger(draft.font_size) || draft.font_size < 1) {
    return "Font size must be at least 1.";
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(draft.font_color)) {
    return "Colour must be a hex value like #101010.";
  }
  if (!ALIGNMENTS.includes(draft.alignment)) return "Unknown alignment.";
  if (!BOX_TYPES.includes(draft.type)) return "Unknown box type.";
}

export async function saveBox(
  templateUuid: string,
  draft: BoxDraft
): Promise<BoxState> {
  const { sessionId } = await requireUser();

  const problem = invalidBox(draft);
  if (problem) return { error: problem };

  const { uuid, ...body } = draft;

  let result;
  try {
    result = uuid
      ? await putCertificateTemplateBoxes({
          path: { template_uuid: templateUuid, uuid },
          body,
          headers: sessionHeader(sessionId),
        })
      : await postCertificateTemplateBoxes({
          path: { template_uuid: templateUuid },
          body,
          headers: sessionHeader(sessionId),
        });
  } catch {
    return { error: "Can't reach the server. Try again in a moment." };
  }

  if (result.error || !result.data) {
    console.error("box save failed", result.response?.status, result.error);
    return { error: messageFrom(result.error, "Couldn't save that box.") };
  }

  revalidatePath(`/templates/${templateUuid}`);
  return { box: result.data };
}

export async function deleteBox(
  templateUuid: string,
  uuid: string
): Promise<{ error: string } | null> {
  const { sessionId } = await requireUser();

  let result;
  try {
    result = await deleteCertificateTemplateBoxes({
      path: { template_uuid: templateUuid, uuid },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return { error: "Can't reach the server. Try again in a moment." };
  }

  if (result.error) {
    console.error("box delete failed", result.response?.status, result.error);
    return { error: messageFrom(result.error, "Couldn't delete that box.") };
  }

  revalidatePath(`/templates/${templateUuid}`);
  return null;
}

export type ImageBoxState =
  | { box: TemplateImageBox; imageUrl?: string }
  | { error: string };

export async function saveImageBox(
  templateUuid: string,
  draft: ImageBoxDraft,
  upload?: string
): Promise<ImageBoxState> {
  const { sessionId } = await requireUser();

  const problem = invalidRect(draft);
  if (problem) return { error: problem };

  const { uuid, ...rect } = draft;
  if (!uuid && !upload) return { error: "Choose an image for this box." };

  let result;
  try {
    result = uuid
      ? await putCertificateTemplateImageBoxes({
          path: { template_uuid: templateUuid, uuid },
          body: upload ? { ...rect, upload } : rect,
          headers: sessionHeader(sessionId),
        })
      : await postCertificateTemplateImageBoxes({
          path: { template_uuid: templateUuid },
          body: { ...rect, upload: upload! },
          headers: sessionHeader(sessionId),
        });
  } catch {
    return { error: "Can't reach the server. Try again in a moment." };
  }

  if (result.error || !result.data) {
    console.error("image box save failed", result.response?.status, result.error);
    return { error: messageFrom(result.error, "Couldn't save that image box.") };
  }

  revalidatePath(`/templates/${templateUuid}`);
  return { box: result.data, imageUrl: templateFileUrl(result.data.image) };
}

export async function deleteImageBox(
  templateUuid: string,
  uuid: string
): Promise<{ error: string } | null> {
  const { sessionId } = await requireUser();

  let result;
  try {
    result = await deleteCertificateTemplateImageBoxes({
      path: { template_uuid: templateUuid, uuid },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return { error: "Can't reach the server. Try again in a moment." };
  }

  if (result.error) {
    console.error("image box delete failed", result.response?.status, result.error);
    return { error: messageFrom(result.error, "Couldn't delete that image box.") };
  }

  revalidatePath(`/templates/${templateUuid}`);
  return null;
}

function stepUrl(templateUuid: string, step: string, batchUuid?: string) {
  return `/templates/${templateUuid}?step=${step}${batchUuid ? `&batch=${batchUuid}` : ""}`;
}

/** Queues a toast for the page the action is about to redirect to (see lib/flash.ts). */
async function flash(type: FlashType, message: string) {
  (await cookies()).set(...flashCookie(type, message));
}

/** Error toast, then redirect. Call as `return fail(...)` so TypeScript narrows after it. */
async function fail(url: string, message: string): Promise<never> {
  await flash("error", message);
  redirect(url);
}

export async function uploadBatch(templateUuid: string, upload: string) {
  const { sessionId } = await requireUser();
  if (!templateUuid) redirect("/templates");
  const here = stepUrl(templateUuid, "csv");

  if (!upload) return fail(here, "Choose a CSV to upload.");

  let result;
  try {
    result = await postCertificateTemplateBatches({
      path: { template_uuid: templateUuid },
      body: { upload },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return fail(here, "Can't reach the server. Try again in a moment.");
  }

  if (result.error || !result.data?.uuid) {
    console.error("batch upload failed", result.response?.status, result.error);
    return fail(here, messageFrom(result.error, "That CSV wasn't accepted."));
  }

  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "CSV uploaded.");
  redirect(stepUrl(templateUuid, "mapping", result.data.uuid));
}

export async function saveMapping(formData: FormData) {
  const { sessionId } = await requireUser();
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = stepUrl(templateUuid, "mapping", uuid);

  const mapping: Record<string, string> = {};
  for (const [field, value] of formData.entries()) {
    if (!field.startsWith("map:") || typeof value !== "string" || !value) continue;
    mapping[field.slice(4)] = value;
  }

  let result;
  try {
    result = await putCertificateBatchesMapping({
      path: { uuid },
      body: { mapping },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return fail(here, "Can't reach the server. Try again in a moment.");
  }

  if (result.error) {
    console.error("mapping save failed", result.response?.status, result.error);
    return fail(here, messageFrom(result.error, "Couldn't save that mapping."));
  }

  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "Mapping saved.");
  redirect(stepUrl(templateUuid, "generate", uuid));
}

export async function saveNaming(formData: FormData) {
  const { sessionId } = await requireUser();
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = stepUrl(templateUuid, "mapping", uuid);

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("naming") ?? "[]"));
  } catch {
    return fail(here, "That name pattern didn't come through. Try again.");
  }
  const parts = asNamingParts(parsed);

  let result;
  try {
    result = await putCertificateBatchesNaming({
      path: { uuid },
      body: { naming_convention: parts.length ? parts : null },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return fail(here, "Can't reach the server. Try again in a moment.");
  }

  if (result.error) {
    console.error("naming save failed", result.response?.status, result.error);
    return fail(here, messageFrom(result.error, "Couldn't save that name pattern."));
  }

  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "File name pattern saved.");
  redirect(here);
}

export async function generateBatch(formData: FormData) {
  const { sessionId } = await requireUser();
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = stepUrl(templateUuid, "generate", uuid);

  let result;
  try {
    result = await postCertificateBatchesGenerate({
      path: { uuid },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return fail(here, "Can't reach the server. Try again in a moment.");
  }

  if (result.error) {
    console.error("generate failed", result.response?.status, result.error);
    return fail(here, messageFrom(result.error, "Couldn't start generation."));
  }

  revalidatePath(`/templates/${templateUuid}`);
  await flash("info", "Generation started. Progress updates below.");
  redirect(here);
}

export async function batchProgress(uuid: string) {
  const { sessionId } = await requireUser();
  try {
    const result = await retrieveCertificateBatchProgress({
      path: { uuid },
      headers: sessionHeader(sessionId),
    });
    return result.data ?? null;
  } catch {
    return null;
  }
}

export async function exportBatch(formData: FormData) {
  const { sessionId } = await requireUser();
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = stepUrl(templateUuid, "generate", uuid);

  let result;
  try {
    result = await postCertificateBatchesExport({
      path: { uuid },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return fail(here, "Can't reach the server. Try again in a moment.");
  }

  if (result.error) {
    console.error("export failed", result.response?.status, result.error);
    return fail(here, messageFrom(result.error, "Couldn't start the export."));
  }

  revalidatePath(`/templates/${templateUuid}`);
  await flash("info", "Building the zip. The download link appears when it's ready.");
  redirect(here);
}

export async function exportProgress(uuid: string) {
  const { sessionId } = await requireUser();
  try {
    const result = await retrieveCertificateBatchExportProgress({
      path: { uuid },
      headers: sessionHeader(sessionId),
    });
    return result.data ?? null;
  } catch {
    return null;
  }
}

export async function deleteBatch(formData: FormData) {
  const { sessionId } = await requireUser();
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = stepUrl(templateUuid, "generate", uuid);

  let error: unknown;
  try {
    const result = await deleteCertificateBatches({
      path: { uuid },
      headers: sessionHeader(sessionId),
    });
    error = result.error;
  } catch {
    error = { msg: "Can't reach the server. Try again in a moment." };
  }

  if (error) {
    console.error("batch delete failed", error);
    return fail(here, messageFrom(error, "Delete failed. Please try again."));
  }

  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "Batch deleted.");
  redirect(stepUrl(templateUuid, "csv"));
}

/** The issue step URL the form came from (keeps its filter and page), or the step itself. */
function issueBack(formData: FormData, templateUuid: string, batchUuid: string) {
  const back = String(formData.get("back") ?? "");
  // Only our own template pages: never redirect to a URL a form field could point elsewhere.
  return back.startsWith(`/templates/${templateUuid}?`) ? back : stepUrl(templateUuid, "issue", batchUuid);
}

/** `value:<box key>` fields → { key: text }. */
function boxValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [field, value] of formData.entries()) {
    if (field.startsWith("value:") && typeof value === "string") values[field.slice(6)] = value.trim();
  }
  return values;
}

async function issuanceCall(
  here: string,
  call: (headers: { Cookie: string }) => Promise<{ error?: unknown }>,
  fallback: string
) {
  const { sessionId } = await requireUser();
  let error: unknown;
  try {
    error = (await call(sessionHeader(sessionId))).error;
  } catch {
    error = { msg: "Can't reach the server. Try again in a moment." };
  }
  if (error) {
    console.error("issuance call failed", error);
    return fail(here, messageFrom(error, fallback));
  }
}

export async function matchRecipients(formData: FormData) {
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = issueBack(formData, templateUuid, uuid);

  const match_fields: Record<string, string> = {};
  for (const [field, value] of formData.entries()) {
    if (field.startsWith("match:") && typeof value === "string" && value) match_fields[field.slice(6)] = value;
  }
  if (!Object.keys(match_fields).length) return fail(here, "Pick at least one column to match on.");

  await issuanceCall(
    here,
    (headers) =>
      postCertificateBatchesMatch({
        path: { uuid },
        body: { match_fields, overwrite: formData.get("overwrite") === "on" },
        headers,
      }),
    "Matching failed. Please try again."
  );
  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "Recipients matched. Check the list, then issue.");
  redirect(stepUrl(templateUuid, "issue", uuid));
}

export async function issueBatch(formData: FormData) {
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = issueBack(formData, templateUuid, uuid);

  await issuanceCall(here, (headers) => postCertificateBatchesIssue({ path: { uuid }, headers }), "Couldn't issue.");
  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "Certificates issued. Recipients can see them now.");
  redirect(here);
}

export async function revokeBatch(formData: FormData) {
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = issueBack(formData, templateUuid, uuid);

  await issuanceCall(here, (headers) => postCertificateBatchesRevoke({ path: { uuid }, headers }), "Couldn't revoke.");
  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "Every issued certificate in this batch is revoked.");
  redirect(here);
}

/** Assign (or clear, with a blank recipient) one draft certificate's recipient. */
export async function assignCertificate(formData: FormData) {
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const batch = String(formData.get("batch") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = issueBack(formData, templateUuid, batch);
  const recipient = String(formData.get("recipient") ?? "").trim();

  await issuanceCall(
    here,
    (headers) => putCertificates({ path: { uuid }, body: { recipient: recipient || null }, headers }),
    "Couldn't change the recipient."
  );
  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", recipient ? "Recipient assigned." : "Recipient removed.");
  redirect(here);
}

/** Save edited box text from the edit dialog; the backend re-renders the certificate. */
export async function editCertificate(formData: FormData) {
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const batch = String(formData.get("batch") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = issueBack(formData, templateUuid, batch);
  // On failure, reopen the dialog so the typed values are one click away.
  const dialog = `${here}&edit=${uuid}`;

  await issuanceCall(
    dialog,
    (headers) => putCertificates({ path: { uuid }, body: { values: boxValues(formData) }, headers }),
    "Couldn't save those changes."
  );
  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "Certificate updated.");
  redirect(here);
}

export async function deleteCertificate(formData: FormData) {
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const batch = String(formData.get("batch") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = issueBack(formData, templateUuid, batch);

  await issuanceCall(here, (headers) => deleteCertificates({ path: { uuid }, headers }), "Delete failed.");
  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "Certificate deleted.");
  redirect(here);
}

export async function revokeCertificate(formData: FormData) {
  const templateUuid = String(formData.get("templateUuid") ?? "");
  const batch = String(formData.get("batch") ?? "");
  const uuid = String(formData.get("uuid") ?? "");
  if (!templateUuid || !uuid) redirect("/templates");
  const here = issueBack(formData, templateUuid, batch);

  await issuanceCall(here, (headers) => postCertificatesRevoke({ path: { uuid }, headers }), "Couldn't revoke.");
  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", "Certificate revoked.");
  redirect(here);
}

/** Render one certificate from typed values and issue it; it lands in the template's "Issued by hand" batch. */
export async function issueOne(formData: FormData) {
  const templateUuid = String(formData.get("templateUuid") ?? "");
  if (!templateUuid) redirect("/templates");
  const here = stepUrl(templateUuid, "csv");
  const recipient = String(formData.get("recipient") ?? "").trim();
  if (!recipient) return fail(here, "Enter the recipient's email or username.");

  await issuanceCall(
    here,
    (headers) =>
      postCertificateTemplateIssueOne({
        path: { uuid: templateUuid },
        body: { recipient, values: boxValues(formData) },
        headers,
      }),
    "Couldn't issue that certificate."
  );
  revalidatePath(`/templates/${templateUuid}`);
  await flash("success", `Certificate issued to ${recipient}.`);
  redirect(stepUrl(templateUuid, "issue", "manual"));
}

// `values` echoes a failed submission: React resets the form after an action, and the
// typed values would otherwise vanish.
export type ProfileState = { error: string; values: Record<string, string> } | { saved: true } | null;

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { sessionId } = await requireUser();
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const values = Object.fromEntries(
    ["name", "roll_number", "phone", "date_of_birth", "institution"].map((name) => [name, field(name)])
  );

  let result;
  try {
    result = await putCoreProfile({
      body: { ...values, name: values.name, date_of_birth: values.date_of_birth || null },
      headers: sessionHeader(sessionId),
    });
  } catch {
    return { error: "Can't reach the server. Try again in a moment.", values };
  }

  if (result.error) {
    console.error("profile save failed", result.response?.status, result.error);
    return { error: messageFrom(result.error, "Couldn't save your profile."), values };
  }

  revalidatePath("/profile");
  return { saved: true };
}

export async function resendVerification() {
  const { sessionId } = await requireUser();

  let error: unknown;
  let message = "Verification email sent.";
  try {
    const result = await postCoreVerifyEmailResend({ headers: sessionHeader(sessionId) });
    error = result.error;
    if (result.data?.msg) message = result.data.msg;
  } catch {
    error = { msg: "Can't reach the server. Try again in a moment." };
  }

  if (error) return fail("/profile", messageFrom(error, "Couldn't send the email."));
  await flash("success", message);
  redirect("/profile");
}
