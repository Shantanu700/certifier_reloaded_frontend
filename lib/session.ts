import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "sessionid";

export const sessionHeader = (sessionId: string) => ({
  Cookie: `${SESSION_COOKIE}=${sessionId}`,
});

/**
 * The visitor's address chain, for the backend's per-visitor rate limits (sign-up, verify): without it every
 * request comes from this server's address. Next keeps an X-Forwarded-For the visitor sent, so this is only
 * as honest as the host in front of Next (Vercel, nginx), which appends the real address.
 */
export async function forwardedFor(): Promise<Record<string, string>> {
  const value = (await headers()).get("x-forwarded-for");
  return value ? { "X-Forwarded-For": value } : {};
}

export const getSessionId = async () =>
  (await cookies()).get(SESSION_COOKIE)?.value;

/**
 * The session cookie only, no API round trip. For callers that hit the API anyway:
 * that call carries the session, so a dead one comes back there as a 401.
 */
export async function requireSession() {
  const sessionId = await getSessionId();
  if (!sessionId) redirect("/login");
  return { sessionId };
}
