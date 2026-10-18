import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { fetchWithLength } from "@/lib/fetch-with-length";
import { flashCookie } from "@/lib/flash";
import { getSessionId } from "@/lib/session";
import { postCoreVerifyEmail } from "@/src/client";

/** The link in the verification email lands here; the token alone proves it, logged in or not. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  let message: string | undefined;
  if (!token) {
    message = "That verification link is incomplete. Ask for a new one from your profile.";
  } else {
    try {
      const result = await postCoreVerifyEmail({ body: { token }, fetch: fetchWithLength });
      if (result.error) {
        const { msg } = result.error as { msg?: unknown };
        message = typeof msg === "string" ? msg : "Couldn't verify your email. Try again.";
      }
    } catch {
      message = "Can't reach the server. Try again in a moment.";
    }
  }

  (await cookies()).set(
    ...(message ? flashCookie("error", message) : flashCookie("success", "Email verified."))
  );
  // redirect() throws, so it stays outside the try above.
  redirect((await getSessionId()) ? "/profile" : "/login");
}
