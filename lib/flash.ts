// One-shot toast messages that survive a server action's redirect().
//
// The action sets a short-lived cookie; setting a cookie in a server action
// makes Next re-render the layouts, so app/layout.tsx reads it and hands it to
// <FlashToaster>, which shows it once and clears it. Not httpOnly on purpose:
// the browser deletes it after showing, and it only ever holds UI copy.
// No server-only imports here, so the client toaster can share the types.

export type FlashType = "success" | "error" | "warning" | "info";
export type Flash = { id: string; type: FlashType; message: string };

export const FLASH_COOKIE = "flash";

const TYPES: readonly FlashType[] = ["success", "error", "warning", "info"];

/** Arguments for `(await cookies()).set(...)`. */
export function flashCookie(type: FlashType, message: string) {
  const value: Flash = { id: crypto.randomUUID(), type, message };
  return [
    FLASH_COOKIE,
    JSON.stringify(value),
    { path: "/", maxAge: 60, sameSite: "lax" as const },
  ] as const;
}

export function parseFlash(raw: string | undefined): Flash | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Flash>;
    return typeof value.id === "string" &&
      typeof value.message === "string" &&
      TYPES.includes(value.type as FlashType)
      ? (value as Flash)
      : null;
  } catch {
    return null;
  }
}
