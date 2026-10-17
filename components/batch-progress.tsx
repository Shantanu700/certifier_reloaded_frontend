"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Download } from "lucide-react";

import { batchProgress, exportProgress } from "@/app/actions";
import { templateFileUrl } from "@/components/template-preview";
import { IN_FLIGHT } from "@/lib/api";
import type {
  CertificateBatchExportProgress,
  CertificateBatchProgress,
} from "@/src/client";

const POLL_MS = 1000;

export function BatchProgress({
  uuid,
  initial,
}: {
  uuid: string;
  initial: CertificateBatchProgress;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initial);
  const running = IN_FLIGHT.includes(progress.generation_status);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      const next = await batchProgress(uuid);
      if (!next) return;
      setProgress(next);
      if (!IN_FLIGHT.includes(next.generation_status)) router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [running, uuid, router]);

  const { processed_rows: done, total_rows: total } = progress;
  if (!total) {
    return running ? <Waiting>Waiting for the first row…</Waiting> : null;
  }

  return <Bar label="Certificates generated" done={done} total={total} />;
}

export function ExportProgress({
  uuid,
  initial,
}: {
  uuid: string;
  initial: CertificateBatchExportProgress;
}) {
  const [progress, setProgress] = useState(initial);
  const status = progress.export_status ?? "pending";
  const running = IN_FLIGHT.includes(status);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      const next = await exportProgress(uuid);
      if (next) setProgress(next);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [running, uuid]);

  if (status === "failed") {
    return (
      <p role="alert">
        <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
          {progress.export_error_message || "The export failed."}
        </span>
      </p>
    );
  }

  const url = templateFileUrl(progress.export_file);
  if (status === "completed" && url) {
    return (
      <a
        href={url}
        className="tap inline-flex shrink-0 items-center gap-2 text-[0.6875rem] font-bold tracking-widest uppercase underline underline-offset-4 hover:bg-accent hover:text-accent-foreground hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Download zip
        <Download className="size-3.5" aria-hidden="true" />
      </a>
    );
  }

  if (!running) return null;

  const { export_processed_rows: done, total_rows: total } = progress;
  if (!total) return <Waiting>Packing the zip…</Waiting>;

  return <Bar label="Certificates packed" done={done ?? 0} total={total} />;
}

function Waiting({ children }: { children: string }) {
  return (
    <p className="text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function Bar({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const pct = Math.min(100, Math.round((done / total) * 100));

  return (
    <div>
      <div className="flex items-baseline justify-between text-[0.6875rem] font-bold tracking-widest uppercase">
        <span>
          {done} / {total} rows
        </span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        className="mt-2 h-4 w-full border-2 border-border bg-background"
      >
        <div
          className="h-full bg-accent transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
