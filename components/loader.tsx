import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * The stepping-squares loader (`.loader` in app/globals.css), in currentColor.
 * Pass `label` when it is the only sign of loading (it becomes a status);
 * leave it off when sitting next to text that already says so.
 *
 * Keep `size` a whole multiple of 6px (12 beside small labels, 18 in buttons,
 * 60 for pages): the squares are a sixth of it, and fractional squares blur
 * into a grey smudge at small sizes.
 */
export function Loader({
  size = "18px",
  label,
  className,
}: {
  size?: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("loader", className)}
      style={{ "--loader-size": size } as CSSProperties}
      {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })}
    />
  );
}

/** Full-area loader for route `loading.tsx` files. */
export function PageLoader() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center">
      <div className="loader-delay">
        <Loader size="60px" label="Loading" />
      </div>
    </div>
  );
}
