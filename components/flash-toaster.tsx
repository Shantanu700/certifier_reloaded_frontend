"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { FLASH_COOKIE, type Flash } from "@/lib/flash";

/** Shows the flash a server action left behind, once, then clears it. */
export function FlashToaster({ flash }: { flash: Flash | null }) {
  useEffect(() => {
    if (!flash) return;
    // The id doubles as Sonner's toast id, so a re-run (Strict Mode, a
    // re-render before the cookie is gone) updates the same toast, not a second.
    toast[flash.type](flash.message, {
      id: flash.id,
      duration: flash.type === "error" ? 8000 : 4000,
    });
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/`;
  }, [flash]);

  return <Toaster position="bottom-right" />;
}
