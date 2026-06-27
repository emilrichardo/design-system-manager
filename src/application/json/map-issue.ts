// T006 (003) — Mapper puro `AnalysisIssue` → `JsonIssueV1`. Copia EXPLÍCITA de los cinco campos
// públicos; `document`/`path` ausentes → `null`. NUNCA propaga `context`, stack, objetos `Error` ni
// detalles crudos de AJV/Zod (ADR-0011, contract json-issue-v1). No muta; determinista.
import type { AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import type { JsonIssueV1 } from "./dto.js";

/** Proyecta un `AnalysisIssue` al DTO público estable de cinco campos. */
export function toJsonIssue(issue: AnalysisIssue): JsonIssueV1 {
  return {
    severity: issue.severity,
    code: issue.code,
    message: issue.message,
    document: issue.document ?? null,
    path: issue.path ?? null,
  };
}
