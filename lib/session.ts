import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "sessionid";

export const sessionHeader = (sessionId: string) => ({
  Cookie: `${SESSION_COOKIE}=${sessionId}`,
});

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
