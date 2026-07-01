// T003 (011) — Validador puro de `dimension` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { isFiniteNumber, issueAt } from "./shape-utils.js";

export const DIMENSION_UNITS = ["px", "rem", "em", "%"] as const;
export type DimensionUnit = (typeof DIMENSION_UNITS)[number];

export interface DimensionValue {
  readonly value: number;
  readonly unit: DimensionUnit;
}

export type DimensionParseResult =
  | { readonly ok: true; readonly value: DimensionValue }
  | { readonly ok: false; readonly issue: Issue };

const UNIT_SET: ReadonlySet<string> = new Set(DIMENSION_UNITS);

export function isDimensionUnit(value: unknown): value is DimensionUnit {
  return typeof value === "string" && UNIT_SET.has(value);
}

export function parseDimension(value: unknown, path: string): DimensionParseResult {
  if (value === null || typeof value !== "object") {
    return { ok: false, issue: issueAt("dimension-shape-invalid", path, `Dimension no es un objeto en "${path}".`) };
  }
  const obj = value as Record<string, unknown>;
  if (!isFiniteNumber(obj.value)) {
    return { ok: false, issue: issueAt("dimension-shape-invalid", path, `"value" no es un número finito en "${path}".`) };
  }
  if (!isDimensionUnit(obj.unit)) {
    return { ok: false, issue: issueAt("dimension-shape-invalid", path, `"unit" inválida en "${path}": debe ser una de ${DIMENSION_UNITS.join(", ")}.`) };
  }
  return { ok: true, value: { value: obj.value, unit: obj.unit } };
}
