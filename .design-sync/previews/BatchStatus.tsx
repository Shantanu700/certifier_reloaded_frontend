import { BatchStatus } from "certifier_reloaded_frontend";

const batch = (generation_status: string, processed_rows = 0, total_rows = 0) =>
  ({ uuid: "b1", generation_status, processed_rows, total_rows }) as never;

export const Statuses = () => (
  <div className="flex flex-wrap items-center gap-3">
    <BatchStatus batch={batch("pending")} />
    <BatchStatus batch={batch("queued")} />
    <BatchStatus batch={batch("processing")} />
    <BatchStatus batch={batch("completed")} />
    <BatchStatus batch={batch("failed")} />
  </div>
);

/** With row counts: the batch list shows progress inline in the pill. */
export const WithProgress = () => (
  <div className="flex flex-wrap items-center gap-3">
    <BatchStatus batch={batch("processing", 128, 500)} />
    <BatchStatus batch={batch("completed", 500, 500)} />
    <BatchStatus batch={batch("failed", 312, 500)} />
  </div>
);

/** In situ: a batch row from the template wizard. */
export const InBatchRow = () => (
  <div className="flex w-full items-center justify-between gap-4 border-2 border-border px-4 py-3">
    <span className="text-xs font-bold tracking-widest uppercase">
      graduates-2026.csv
    </span>
    <BatchStatus batch={batch("processing", 128, 500)} />
  </div>
);
