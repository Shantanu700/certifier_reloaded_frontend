import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Hover/focus name for an icon button. The trigger is a span this renders, not the
 * button itself, so server-rendered children never pass through Slot.
 */
export function Tip({ label, className, children }: { label: string; className?: string; children?: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", className)}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
