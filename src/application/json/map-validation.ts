// T008 (003) — Mapper puro `ValidationReport` → `JsonValidationV1` (proyección compartida por
// validate-result e inspect.validation; SIN host). Reutiliza tal cual los datos ya calculados por
// 002: NO recalcula validez, NO recuenta tokens, NO reconstruye checked/unchecked, NO reordena
// issues, NO expone `context`. Copias defensivas de arrays; orden preservado (ADR-0011).
import type { ValidationReport } from "../../domain/analysis/validation-report.js";
import type { JsonValidationV1 } from "./dto.js";
import { toJsonIssue } from "./map-issue.js";
import { toJsonLimits, toJsonSummary } from "./map-common.js";

/** Proyecta un `ValidationReport` al DTO común de validación (sin `host`). */
export function toJsonValidation(report: ValidationReport): JsonValidationV1 {
  return {
    valid: report.valid,
    structuralState: report.structuralState,
    checkedDocuments: [...report.checkedDocuments],
    uncheckedDocuments: [...report.uncheckedDocuments],
    summary: toJsonSummary(report.summary),
    errors: report.errors.map(toJsonIssue),
    warnings: report.warnings.map(toJsonIssue),
    limits: toJsonLimits(report.limits),
  };
}
