"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";

// Mirrors MATCH_FIELDS in the backend's modules/certificates/services.py.
const MATCH_FIELDS = [
  { value: "email", label: "Email" },
  { value: "roll_number", label: "Roll / enrolment number" },
  { value: "date_of_birth", label: "Date of birth" },
  { value: "phone", label: "Phone" },
  { value: "institution", label: "Institution" },
  { value: "username", label: "Username" },
] as const;

const LABEL = "block text-[0.625rem] font-bold tracking-widest text-muted-foreground uppercase";
const SELECT = "mt-1 h-10 px-2";

type Row = { id: number; field: string; column: string };

/**
 * Rows of "recipient detail ↔ CSV column" for matching. Each detail can be used once.
 * Submits `match:<field>=<column>` fields, which matchRecipients reads.
 */
export function MatchFieldsEditor({
  columns,
  saved,
}: {
  columns: string[];
  saved: Record<string, string>;
}) {
  const initial = Object.entries(saved).map(([field, column], id) => ({ id, field, column }));
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : [{ id: 0, field: "email", column: "" }]);
  const nextId = useRef(rows.length);

  const used = new Set(rows.map((row) => row.field));
  const unused = MATCH_FIELDS.filter((f) => !used.has(f.value));
  const update = (id: number, changes: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)));
  const columnOptions = columns.map((column) => ({ value: column, label: column }));

  return (
    <div className="space-y-3">
      {rows.length ? (
        <ul className="grid gap-px bg-border">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-end gap-3 bg-background p-3">
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <label>
                  <span className={LABEL}>Recipient detail</span>
                  <SelectField
                    value={row.field}
                    onValueChange={(field) => update(row.id, { field })}
                    className={SELECT}
                    // This row's own field plus the ones no other row has taken.
                    options={MATCH_FIELDS.filter((f) => f.value === row.field || !used.has(f.value))}
                  />
                </label>
                <label>
                  <span className={LABEL}>CSV column</span>
                  <SelectField
                    required
                    value={row.column}
                    onValueChange={(column) => update(row.id, { column })}
                    placeholder="Pick a column"
                    className={SELECT}
                    options={columnOptions}
                  />
                </label>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove detail ${index + 1}`}
                onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}
                className="mb-1 text-destructive"
              >
                <Trash2 aria-hidden="true" />
              </Button>
              <input type="hidden" name={`match:${row.field}`} value={row.column} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
          Add at least one detail to match on.
        </p>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!unused.length}
        onClick={() => setRows((current) => [...current, { id: nextId.current++, field: unused[0].value, column: "" }])}
      >
        <Plus aria-hidden="true" />
        Add detail
      </Button>
    </div>
  );
}
