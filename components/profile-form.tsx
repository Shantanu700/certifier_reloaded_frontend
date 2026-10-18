"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { updateProfile } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import type { Profile } from "@/src/client";

const LABEL_CLASS = "block text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase";
const FIELD_CLASS =
  "mt-1 h-11 w-full border-b-2 border-border bg-transparent px-2 text-base font-bold tracking-tight outline-none focus:border-accent";

const FIELDS = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name", required: true },
  { name: "roll_number", label: "Roll / enrolment number", type: "text", autoComplete: "off" },
  { name: "institution", label: "Institution", type: "text", autoComplete: "organization" },
  { name: "phone", label: "Phone (10 digits)", type: "tel", autoComplete: "tel-national" },
  { name: "date_of_birth", label: "Date of birth", type: "date", autoComplete: "bday" },
] as const;

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, null);

  useEffect(() => {
    if (state && "error" in state) toast.error(state.error);
    if (state && "saved" in state) toast.success("Profile saved.");
  }, [state]);

  return (
    <form action={action} className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {FIELDS.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className={LABEL_CLASS}>
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            required={"required" in f}
            maxLength={f.name === "institution" || f.name === "name" ? 255 : 100}
            defaultValue={(state && "values" in state ? state.values[f.name] : profile[f.name]) ?? ""}
            className={FIELD_CLASS}
          />
        </div>
      ))}
      <SubmitButton pendingLabel="Saving…" className="h-12 sm:col-span-2">
        Save profile
      </SubmitButton>
    </form>
  );
}
