// T003 (011) — Validador puro de `duration` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { isFiniteNumber, issueAt } from "./shape-utils.js";

export const DURATION_UNITS = ["ms", "s"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export interface DurationValue {
  readonly value: number;
  readonly unit: DurationUnit;
}

export type DurationParseResult =
  | { readonly ok: true; readonly value: DurationValue }
  | { readonly ok: false; readonly issue: Issue };

const UNIT_SET: ReadonlySet<string> = new Set(DURATION_UNITS);

export function isDurationUnit(value: unknown): value is DurationUnit {
  return typeof value === "string" && UNIT_SET.has(value);
}

export function parseDuration(value: unknown, path: string): DurationParseResult {
  if (value === null || typeof value !== "object") {
    return { ok: false, issue: issueAt("duration-shape-invalid", path, `Duration no es un objeto en "${path}".`) };
  }
  const obj = value as Record<string, unknown>;
  if (!isFiniteNumber(obj.value)) {
    return { ok: false, issue: issueAt("duration-shape-invalid", path, `"value" no es un número finito en "${path}".`) };
  }
  if (!isDurationUnit(obj.unit)) {
    return { ok: false, issue: issueAt("duration-shape-invalid", path, `"unit" inválida en "${path}": debe ser una de ${DURATION_UNITS.join(", ")}.`) };
  }
  return { ok: true, value: { value: obj.value, unit: obj.unit } };
}
