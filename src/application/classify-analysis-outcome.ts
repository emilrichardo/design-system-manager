// T031/T032 (helper) — Clasificación semántica de outcomes a partir de SEÑALES ESTRUCTURADAS
// (host, structuralState, códigos estables de Issue). NUNCA por texto de `message`.
import type { DesignSystemAnalysis } from "../domain/analysis/design-system-analysis.js";
import type { AnalysisOutcome } from "./analysis-ports.js";

/** Códigos OPERATIVOS de lectura/presupuesto ⇒ read-error (no errores semánticos DTCG). */
const OPERATIVE_READ_CODES: ReadonlySet<string> = new Set([
  "read-failed",
  "read-invalid-encoding",
  "read-symlink-external",
  "read-outside-root",
  "read-not-regular-file",
  "read-absent",
  "limit-file-size-exceeded",
  "limit-total-size-exceeded",
]);

/** ¿El host NO pudo resolverse? (issue con document "host"). */
export function isHostUnresolved(analysis: DesignSystemAnalysis): boolean {
  return analysis.errors.some((issue) => issue.document === "host");
}

/**
 * Precedencia: host no resuelto → not-found; luego por `structuralState`
 * (not-initialized→not-found, partial→partial, complete-valid→valid); en `complete-invalid`,
 * si hay un error operativo de lectura/presupuesto → read-error, si no → complete-invalid.
 */
export function classifyAnalysisOutcome(analysis: DesignSystemAnalysis): AnalysisOutcome {
  if (isHostUnresolved(analysis)) return "not-found";
  switch (analysis.structuralState) {
    case "not-initialized":
      return "not-found";
    case "partial":
      return "partial";
    case "complete-valid":
      return "valid";
    case "complete-invalid":
      return analysis.errors.some((i) => OPERATIVE_READ_CODES.has(i.code)) ? "read-error" : "complete-invalid";
  }
}
