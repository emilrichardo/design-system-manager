// T003 (011) — Validador puro de `gradient` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { isConcreteSrgbColor, isFiniteNumber, issueAt } from "./shape-utils.js";

export interface GradientStopValue {
  readonly color: unknown;
  readonly position: number;
}

export type GradientValue = readonly GradientStopValue[];

export type GradientParseResult =
  | { readonly ok: true; readonly value: GradientValue }
  | { readonly ok: false; readonly issue: Issue };

export function parseGradient(value: unknown, path: string): GradientParseResult {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, issue: issueAt("gradient-shape-invalid", path, `gradient inválido en "${path}": debe ser un array no vacío de stops.`) };
  }
  const stops: GradientStopValue[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object") {
      return { ok: false, issue: issueAt("gradient-shape-invalid", path, `gradient stop inválido en "${path}".`) };
    }
    const obj = entry as Record<string, unknown>;
    if (!isConcreteSrgbColor(obj.color)) {
      return { ok: false, issue: issueAt("gradient-shape-invalid", path, `gradient stop.color no es un color sRGB concreto válido en "${path}".`) };
    }
    if (!isFiniteNumber(obj.position) || obj.position < 0 || obj.position > 1) {
      return { ok: false, issue: issueAt("gradient-shape-invalid", path, `gradient stop.position debe estar en [0,1] en "${path}".`) };
    }
    stops.push({ color: obj.color, position: obj.position });
  }
  return { ok: true, value: stops };
}
