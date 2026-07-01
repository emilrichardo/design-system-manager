// T003 (011) — Validador puro de `fontWeight` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { issueAt } from "./shape-utils.js";

export type FontWeightValue = "normal" | "bold" | number;

export type FontWeightParseResult =
  | { readonly ok: true; readonly value: FontWeightValue }
  | { readonly ok: false; readonly issue: Issue };

export function parseFontWeight(value: unknown, path: string): FontWeightParseResult {
  if (value === "normal" || value === "bold") return { ok: true, value };
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 1000) {
    return { ok: true, value };
  }
  return { ok: false, issue: issueAt("font-weight-shape-invalid", path, `fontWeight inválido en "${path}": debe ser "normal", "bold" o un entero entre 1 y 1000.`) };
}
