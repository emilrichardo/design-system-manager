// T031 (helper) — Proyección pura DesignSystemAnalysis → ValidationReport. No muta el análisis.
// checked/unchecked se derivan del estado estructurado de cada ParsedDocument (no del texto de issues).
import type { DesignSystemAnalysis } from "../domain/analysis/design-system-analysis.js";
import type { ValidationReport } from "../domain/analysis/validation-report.js";
import { MANAGED_FILES } from "../domain/plan/managed-files.js";

const ORDER: readonly string[] = [MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens];

/**
 * Deriva el `ValidationReport`. `valid` se toma de `analysis.valid` (regla centralizada en la tubería:
 * `complete-valid` ⇔ sin errores y no parcial). Un documento es `checked` si fue leído+parseado
 * (`trust !== "unavailable"`), incluso si su validación produjo errores; `unchecked` en caso contrario.
 */
export function createValidationReport(analysis: DesignSystemAnalysis): ValidationReport {
  const checkedDocuments: string[] = [];
  const uncheckedDocuments: string[] = [];
  for (const rel of ORDER) {
    const doc = analysis.documents[rel];
    if (doc !== undefined && doc.trust !== "unavailable") checkedDocuments.push(rel);
    else uncheckedDocuments.push(rel);
  }
  return {
    valid: analysis.valid,
    structuralState: analysis.structuralState,
    checkedDocuments,
    uncheckedDocuments,
    errors: [...analysis.errors],
    warnings: [...analysis.warnings],
    limits: analysis.limits,
    summary: {
      errors: analysis.errors.length,
      warnings: analysis.warnings.length,
      tokens: analysis.statistics.total,
    },
  };
}
