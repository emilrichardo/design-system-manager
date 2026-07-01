// T003 (011) — Validador puro de `cubicBezier` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { isFiniteNumber, issueAt } from "./shape-utils.js";

export type CubicBezierValue = readonly [number, number, number, number];

export type CubicBezierParseResult =
  | { readonly ok: true; readonly value: CubicBezierValue }
  | { readonly ok: false; readonly issue: Issue };

export function parseCubicBezier(value: unknown, path: string): CubicBezierParseResult {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((n) => isFiniteNumber(n))) {
    return { ok: false, issue: issueAt("cubic-bezier-shape-invalid", path, `cubicBezier inválido en "${path}": debe ser un array de 4 números finitos.`) };
  }
  const [x1, y1, x2, y2] = value as [number, number, number, number];
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    return { ok: false, issue: issueAt("cubic-bezier-shape-invalid", path, `cubicBezier fuera de rango en "${path}": x1/x2 deben estar en [0,1].`) };
  }
  return { ok: true, value: [x1, y1, x2, y2] };
}
