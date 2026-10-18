"use client";

import { useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Radix forbids "" as an item value, but "Not mapped"-style choices submit "". The
// sentinel lives only inside the dropdown; forms and callbacks always see "".
const NONE = "__none__";

export type SelectOption = { value: string; label: string };

/**
 * The app's dropdown: the themed shadcn Select with a native-select-shaped API.
 * Works uncontrolled in server-rendered forms (`name` + `defaultValue`, submitted
 * through a hidden input) or controlled (`value` + `onValueChange`).
 */
export function SelectField({
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  options,
  emptyLabel,
  placeholder,
  required,
  disabled,
  size,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: readonly SelectOption[];
  /** Adds a first choice that means "nothing" and submits "". */
  emptyLabel?: string;
  /** Shown while nothing is chosen and there's no `emptyLabel`. */
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  "aria-label"?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const current = value ?? own;

  return (
    <>
      <Select
        value={current === "" && emptyLabel ? NONE : current}
        onValueChange={(next) => {
          const real = next === NONE ? "" : next;
          if (value === undefined) setOwn(real);
          onValueChange?.(real);
        }}
        required={required}
        disabled={disabled}
      >
        <SelectTrigger id={id} size={size} aria-label={ariaLabel} className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {emptyLabel ? <SelectItem value={NONE}>{emptyLabel}</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {name ? <input type="hidden" name={name} value={current} /> : null}
    </>
  );
}
