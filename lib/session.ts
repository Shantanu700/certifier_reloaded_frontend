import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCoreLogin } from "@/src/client";

export const SESSION_COOKIE = "sessionid";

export const sessionHeader = (sessionId: string) => ({
  Cookie: `${SESSION_COOKIE}=${sessionId}`,
});

export const getSessionId = async () =>
  (await cookies()).get(SESSION_COOKIE)?.value;

export async function requireUser() {
  const sessionId = await getSessionId();

  let user;
  if (sessionId) {
    try {
      user = (await getCoreLogin({ headers: sessionHeader(sessionId) })).data;
    } catch {}
  }
  if (!user || !sessionId) redirect("/login");

  return { user, sessionId };
}

/** Issuer-only pages: a recipient has nothing to do there, so send them to their certificates. */
export async function requireIssuer() {
  const session = await requireUser();
  if (session.user.role === "recipient") redirect("/certificates");
  return session;
}
