// T003 (011) — Validador puro de `number` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { isFiniteNumber, issueAt } from "./shape-utils.js";

export type NumberParseResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly issue: Issue };

export function parseNumberToken(value: unknown, path: string): NumberParseResult {
  if (!isFiniteNumber(value)) {
    return { ok: false, issue: issueAt("number-shape-invalid", path, `Valor no es un número finito en "${path}".`) };
  }
  return { ok: true, value };
}
