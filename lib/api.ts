import type { NamingPart } from "@/src/client";

export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const { results } = data as { results?: unknown };
    if (Array.isArray(results)) return results as T[];
    return [data as T];
  }
  return [];
}

export const IN_FLIGHT = ["queued", "processing"];

export const PAGE_SIZES = [10, 50, 100];

export type PageInfo = {
  count: number;
  page: number;
  size: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export const asPageNumber = (value: unknown) =>
  Math.max(1, Math.trunc(Number(value)) || 1);

export const asPageSize = (value: unknown) =>
  PAGE_SIZES.includes(Number(value)) ? Number(value) : PAGE_SIZES[0];

export function asStrings(data: unknown): string[] {
  return Array.isArray(data) ? data.filter((v) => typeof v === "string") : [];
}

export function asMapping(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => typeof v === "string")
  ) as Record<string, string>;
}

export const NAMING_TYPES = ["csv_key", "fixed", "sequence", "random"] as const;

export const MAX_RANDOM_LENGTH = 64;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const whole = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : undefined;
};

export function asNamingParts(data: unknown): NamingPart[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((raw): NamingPart[] => {
    if (!raw || typeof raw !== "object") return [];
    const part = raw as Record<string, unknown>;

    switch (part.type) {
      case "csv_key": {
        const key = text(part.key);
        return key ? [{ type: "csv_key", key }] : [];
      }
      case "fixed": {
        const value = typeof part.value === "string" ? part.value : "";
        return value ? [{ type: "fixed", value }] : [];
      }
      case "sequence": {
        const start = whole(part.start);
        const step = whole(part.step);
        return [
          {
            type: "sequence",
            ...(start === undefined ? {} : { start }),
            ...(step === undefined ? {} : { step }),
          },
        ];
      }
      case "random": {
        const length = whole(part.length);
        return [
          {
            type: "random",
            ...(part.kind === "string" || part.kind === "number"
              ? { kind: part.kind }
              : {}),
            ...(length !== undefined && length >= 1 && length <= MAX_RANDOM_LENGTH
              ? { length }
              : {}),
          },
        ];
      }
      default:
        return [];
    }
  });
}
