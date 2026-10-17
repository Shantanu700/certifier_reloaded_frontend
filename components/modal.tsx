"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/** Native <dialog>: Escape, focus trap and inert background come from the platform. */
export function Modal({
  closeHref,
  label,
  children,
}: {
  closeHref: string;
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      data-motion
      // Navigate after the 250ms exit (globals.css `dialog[data-motion]`), or the
      // route change unmounts the dialog mid-fade.
      onClose={() => setTimeout(() => router.push(closeHref), 250)}
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close();
      }}
      // `hidden open:flex`, not `flex`: an author display rule outranks the UA's
      // dialog:not([open]) { display: none } and would leak the closed dialog inline.
      className="m-auto hidden max-h-[85dvh] w-[min(42rem,92vw)] flex-col border-2 border-border bg-background p-0 text-foreground backdrop:bg-foreground/50 open:flex"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-border pl-6 md:pl-8">
        <h2 className="text-lg leading-none font-bold tracking-tighter uppercase">
          {label}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="flex size-12 shrink-0 items-center justify-center border-l-2 border-border transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="overflow-y-auto p-6 md:p-8">{children}</div>
    </dialog>
  );
}
