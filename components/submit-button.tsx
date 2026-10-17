"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      {...props}
    >
      {pending ? (
        <>
          <Loader size="18px" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
