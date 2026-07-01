// T003 (011) — Validador puro de `fontFamily` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { issueAt } from "./shape-utils.js";

export type FontFamilyValue = string | readonly string[];

export type FontFamilyParseResult =
  | { readonly ok: true; readonly value: FontFamilyValue }
  | { readonly ok: false; readonly issue: Issue };

export function parseFontFamily(value: unknown, path: string): FontFamilyParseResult {
  if (typeof value === "string") {
    if (value.length === 0) {
      return { ok: false, issue: issueAt("font-family-shape-invalid", path, `fontFamily vacío en "${path}".`) };
    }
    return { ok: true, value };
  }
  if (Array.isArray(value) && value.length > 0 && value.every((f) => typeof f === "string" && f.length > 0)) {
    return { ok: true, value: value as readonly string[] };
  }
  return { ok: false, issue: issueAt("font-family-shape-invalid", path, `fontFamily inválido en "${path}": debe ser un string no vacío o un array de strings no vacíos.`) };
}
