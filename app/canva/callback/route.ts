import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getSessionId, sessionHeader } from "@/lib/session";
import { postCanvaCallback } from "@/src/client";

const CANVA_PAGE = "/templates/canva";

/**
 * Inside route handlers (not pages or server actions) Next 16.3's patched
 * fetch sends a Request object's body chunked, without Content-Length, and
 * Django reads that as an empty body. Re-issue it as url + init so the
 * length survives.
 */
const fetchWithLength = (async (input: RequestInfo | URL) => {
  const request = input as Request;
  return fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: await request.text(),
  });
}) as typeof fetch;

/**
 * Canva's OAuth redirect lands here (a top-level GET, so our lax sessionid
 * cookie comes along). The code is useless without the PKCE verifier, which
 * only Django holds, so all this does is hand code + state to the backend.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  const sessionId = await getSessionId();
  if (!sessionId) redirect("/login");

  let message: string | undefined;
  if (!code || !state) {
    message = params.get("error") === "access_denied"
      ? "Canva access wasn't granted."
      : "Canva didn't complete the sign-in. Try connecting again.";
  } else {
    try {
      const result = await postCanvaCallback({
        body: { code, state },
        headers: sessionHeader(sessionId),
        fetch: fetchWithLength,
      });
      if (result.error) {
        const { msg } = result.error as { msg?: unknown };
        message = typeof msg === "string" ? msg : "Couldn't connect Canva. Try again.";
      }
    } catch {
      message = "Can't reach the server. Try again in a moment.";
    }
  }

  // redirect() throws, so it stays outside the try above.
  redirect(message ? `${CANVA_PAGE}?error=${encodeURIComponent(message)}` : CANVA_PAGE);
}
