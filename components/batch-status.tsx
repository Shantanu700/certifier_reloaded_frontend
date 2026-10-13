import { cn } from "@/lib/utils";
import type { CertificateBatch } from "@/src/client";

const TONE: Record<string, string> = {
  completed: "bg-accent text-accent-foreground border-accent",
  failed: "bg-destructive text-background border-destructive",
};

export function BatchStatus({
  batch,
  className,
}: {
  batch: CertificateBatch;
  className?: string;
}) {
  const status = batch.generation_status ?? "pending";
  const total = batch.total_rows ?? 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border-2 border-border px-2.5 py-1 text-[0.6875rem] font-bold tracking-widest uppercase",
        TONE[status],
        className
      )}
    >
      {status}
      {total ? (
        <span className="opacity-70">
          {batch.processed_rows ?? 0}/{total}
        </span>
      ) : null}
    </span>
  );
}
