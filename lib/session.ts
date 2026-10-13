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
