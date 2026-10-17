"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

import { Loader } from "@/components/loader";
import { cn } from "@/lib/utils";

// The wizard route is dynamic (cookies), so Next skips prefetching it entirely
// and every step click is a cold round trip. Without this the tab is a dead
// input until the server answers. useLinkStatus has to be read from a
// descendant of the Link, hence the inner component.
function Fade({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span aria-busy={pending} className="relative block">
      <span
        className={cn(
          "flex flex-col gap-1 transition-opacity duration-150 ease-out",
          pending && "opacity-40"
        )}
      >
        {children}
      </span>
      {pending ? <Loader size="12px" className="absolute top-0 right-0" /> : null}
    </span>
  );
}

export function StepLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      <Fade>{children}</Fade>
    </Link>
  );
}
