"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";

import { saveNaming } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { MAX_RANDOM_LENGTH, NAMING_TYPES, asNamingParts } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { NamingPart } from "@/src/client";

type Row = NamingPart & { id: number };

type PartType = (typeof NAMING_TYPES)[number];

const LABEL =
  "block text-[0.625rem] font-bold tracking-widest text-muted-foreground uppercase";
const FIELD =
  "mt-1 h-10 w-full border-2 border-border bg-transparent px-2 text-sm font-bold tracking-tight outline-none focus:border-accent";

const TYPE_LABEL: Record<PartType, string> = {
  csv_key: "CSV column",
  fixed: "Fixed text",
  sequence: "Sequence",
  random: "Random",
};

function blankPart(type: PartType, columns: string[]): NamingPart {
  switch (type) {
    case "csv_key":
      return { type, key: columns[0] ?? "" };
    case "fixed":
      return { type, value: "-" };
    case "sequence":
      return { type, start: 1, step: 1 };
    case "random":
      return { type, kind: "string", length: 6 };
  }
}

/** What each part will look like in a filename, for the preview line. */
function sample(part: NamingPart) {
  switch (part.type) {
    case "csv_key":
      return `«${part.key || "column"}»`;
    case "fixed":
      return part.value;
    case "sequence":
      return String(part.start ?? 1);
    case "random": {
      const pool = part.kind === "number" ? "8402719364" : "k3ptvzq9wm4hxr7c";
      const length = Math.min(part.length ?? 6, MAX_RANDOM_LENGTH);
      return pool.repeat(Math.ceil(length / pool.length)).slice(0, length);
    }
  }
}

export function NamingEditor({
  templateUuid,
  batchUuid,
  columns,
  initial,
}: {
  templateUuid: string;
  batchUuid: string;
  columns: string[];
  initial: NamingPart[];
}) {
  const nextId = useRef(initial.length);
  const [rows, setRows] = useState<Row[]>(
    initial.map((part, id) => ({ ...part, id }))
  );
  const dragging = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const patch = (id: number, part: NamingPart) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...part, id } : row))
    );

  const move = (from: number | null, to: number) =>
    setRows((current) => {
      if (from === null || from === to || !current[from] || !current[to]) {
        return current;
      }
      const next = [...current];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });

  const add = () =>
    setRows((current) => [
      ...current,
      { ...blankPart("csv_key", columns), id: nextId.current++ },
    ]);

  const preview = rows.map(sample).join("");

  return (
    <form action={saveNaming} className="mt-4 space-y-5">
      <input type="hidden" name="templateUuid" value={templateUuid} />
      <input type="hidden" name="uuid" value={batchUuid} />
      <input
        type="hidden"
        name="naming"
        // asNamingParts also drops the `id` — it only ever copies known fields.
        value={JSON.stringify(asNamingParts(rows))}
      />

      {rows.length ? (
        <ul className="grid gap-px bg-border">
          {rows.map((row, index) => (
            <li
              key={row.id}
              // Native HTML5 drag — rows swap live as you pass a neighbour, so
              // there's nothing to do on drop. Mouse only; the arrows below are
              // the keyboard and touch path.
              draggable
              onDragStart={() => {
                dragging.current = index;
                setDraggingId(row.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                move(dragging.current, index);
                dragging.current = index;
              }}
              onDragEnd={() => {
                dragging.current = null;
                setDraggingId(null);
              }}
              className={cn(
                "flex items-start gap-3 bg-background p-4",
                draggingId === row.id && "opacity-50"
              )}
            >
              <GripVertical
                className="mt-2 size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
                aria-hidden="true"
              />

              <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                <label className="col-span-2">
                  <span className={LABEL}>Part {index + 1}</span>
                  <select
                    value={row.type}
                    onChange={(event) =>
                      patch(row.id, blankPart(event.target.value as PartType, columns))
                    }
                    className={FIELD}
                  >
                    {NAMING_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABEL[type]}
                      </option>
                    ))}
                  </select>
                </label>

                {row.type === "csv_key" ? (
                  <label className="col-span-2">
                    <span className={LABEL}>Column</span>
                    <select
                      required
                      value={row.key}
                      onChange={(event) =>
                        patch(row.id, { type: "csv_key", key: event.target.value })
                      }
                      className={FIELD}
                    >
                      <option value="">— pick a column —</option>
                      {columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {row.type === "fixed" ? (
                  <label className="col-span-2">
                    <span className={LABEL}>Text</span>
                    <input
                      type="text"
                      required
                      value={row.value}
                      onChange={(event) =>
                        patch(row.id, { type: "fixed", value: event.target.value })
                      }
                      className={FIELD}
                    />
                  </label>
                ) : null}

                {row.type === "sequence" ? (
                  <>
                    <label>
                      <span className={LABEL}>Start</span>
                      <input
                        type="number"
                        value={row.start ?? 1}
                        onChange={(event) =>
                          patch(row.id, { ...row, start: Number(event.target.value) })
                        }
                        className={FIELD}
                      />
                    </label>
                    <label>
                      <span className={LABEL}>Step</span>
                      <input
                        type="number"
                        min={1}
                        value={row.step ?? 1}
                        onChange={(event) =>
                          patch(row.id, { ...row, step: Number(event.target.value) })
                        }
                        className={FIELD}
                      />
                    </label>
                  </>
                ) : null}

                {row.type === "random" ? (
                  <>
                    <label>
                      <span className={LABEL}>Kind</span>
                      <select
                        value={row.kind ?? "string"}
                        onChange={(event) =>
                          patch(row.id, {
                            ...row,
                            kind: event.target.value as "string" | "number",
                          })
                        }
                        className={FIELD}
                      >
                        <option value="string">Letters</option>
                        <option value="number">Digits</option>
                      </select>
                    </label>
                    <label>
                      <span className={LABEL}>Length</span>
                      <input
                        type="number"
                        min={1}
                        max={MAX_RANDOM_LENGTH}
                        value={row.length ?? 6}
                        onChange={(event) =>
                          patch(row.id, { ...row, length: Number(event.target.value) })
                        }
                        className={FIELD}
                      />
                    </label>
                  </>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={index === 0}
                  aria-label={`Move part ${index + 1} up`}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={index === rows.length - 1}
                  aria-label={`Move part ${index + 1} down`}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove part ${index + 1}`}
                  onClick={() =>
                    setRows((current) => current.filter((r) => r.id !== row.id))
                  }
                  className="text-destructive"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
          No pattern set — the server names the files. Add a part to build your own.
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus aria-hidden="true" />
          Add part
        </Button>
        <p className="min-w-0 truncate font-mono text-xs text-muted-foreground">
          {preview ? `${preview}.pdf` : null}
        </p>
      </div>

      <SubmitButton pendingLabel="Saving…" className="h-12 w-full">
        Save name pattern
      </SubmitButton>
    </form>
  );
}
