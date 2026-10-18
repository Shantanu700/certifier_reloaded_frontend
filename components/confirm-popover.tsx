"use client";

import { useCallback, useState, type ReactNode } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DANGER = "border-2 border-destructive/40";

/**
 * A destructive button that asks first. Confirming submits `action` with `fields`
 * (server actions), or calls `onConfirm` (client-only changes). Cancel takes focus
 * when it opens, so an accidental Enter never deletes anything.
 */
export function ConfirmPopover({
  label,
  icon,
  iconOnly,
  triggerClassName,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working…",
  action,
  fields,
  onConfirm,
  align = "start",
}: {
  /** Trigger text; the tooltip and aria-label when `iconOnly`. */
  label: string;
  icon?: ReactNode;
  iconOnly?: boolean;
  triggerClassName?: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  action?: (formData: FormData) => void | Promise<void>;
  /** Hidden inputs submitted with `action`. */
  fields?: ReactNode;
  onConfirm?: () => void;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  // Inside a modal <dialog>, portal into it: the top layer covers anything portalled to <body>.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const findDialog = useCallback((el: HTMLElement | null) => setContainer(el?.closest("dialog") ?? null), []);

  const trigger = (
    <PopoverTrigger asChild>
      <Button
        ref={findDialog}
        type="button"
        variant="destructive"
        size={iconOnly ? "icon-sm" : "sm"}
        aria-label={iconOnly ? label : undefined}
        className={cn(DANGER, triggerClassName)}
      >
        {icon}
        {iconOnly ? null : label}
      </Button>
    </PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <PopoverContent container={container} align={align} role="alertdialog" aria-label={title}>
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1 border-2" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {action ? (
            <form action={action} className="flex-1">
              {fields}
              <SubmitButton variant="destructive" size="sm" pendingLabel={pendingLabel} className={cn(DANGER, "w-full")}>
                {confirmLabel}
              </SubmitButton>
            </form>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className={cn(DANGER, "flex-1")}
              onClick={() => {
                setOpen(false);
                onConfirm?.();
              }}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
