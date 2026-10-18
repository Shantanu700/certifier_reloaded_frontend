import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { fetchWithLength } from "@/lib/fetch-with-length";
import { flashCookie } from "@/lib/flash";
import { getSessionId, sessionHeader } from "@/lib/session";
import { postCanvaCallback } from "@/src/client";

const CANVA_PAGE = "/templates/canva";

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

  (await cookies()).set(
    ...(message ? flashCookie("error", message) : flashCookie("success", "Canva connected."))
  );
  // redirect() throws, so it stays outside the try above.
  redirect(CANVA_PAGE);
}
