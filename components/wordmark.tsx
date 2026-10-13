import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-xs font-bold tracking-widest uppercase md:text-sm",
        className
      )}
    >
      Certifier
      <span
        aria-hidden="true"
        className="ml-1 inline-block size-2 bg-accent align-baseline"
      />
    </span>
  );
}
