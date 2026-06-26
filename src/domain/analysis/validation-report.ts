// T012 — ValidationReport: vista de validez derivada del análisis. `valid` se deriva: false si hay
// errores invalidantes O análisis incompleto por límite. Arrays separados error/warning; sin texto de
// terminal; sin exit codes. Dominio puro.
import type { AnalysisIssue } from "./analysis-issue.js";
import type { StructuralState } from "./structural-state.js";
import type { AnalysisLimitsResult } from "../traversal/limits.js";

export interface ValidationSummary {
  readonly errors: number;
  readonly warnings: number;
  readonly tokens?: number;
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly structuralState: StructuralState;
  readonly checkedDocuments: readonly string[];
  readonly uncheckedDocuments: readonly string[];
  readonly errors: readonly AnalysisIssue[];
  readonly warnings: readonly AnalysisIssue[];
  readonly limits: AnalysisLimitsResult;
  readonly summary: ValidationSummary;
}

export interface ValidationReportInput {
  readonly structuralState: StructuralState;
  readonly checkedDocuments: readonly string[];
  readonly uncheckedDocuments: readonly string[];
  readonly errors: readonly AnalysisIssue[];
  readonly warnings: readonly AnalysisIssue[];
  readonly limits: AnalysisLimitsResult;
  readonly tokens?: number;
}

/**
 * Construye un `ValidationReport`. `valid = (errores === 0) && !limits.partial`: un warning por sí
 * solo NO invalida; un límite duro alcanzado SÍ deja el DS no validado por completo. Función pura:
 * copia los arrays y preserva su orden.
 */
export function validationReport(input: ValidationReportInput): ValidationReport {
  const errors = [...input.errors];
  const warnings = [...input.warnings];
  const valid = errors.length === 0 && !input.limits.partial;
  const summary: ValidationSummary =
    input.tokens === undefined
      ? { errors: errors.length, warnings: warnings.length }
      : { errors: errors.length, warnings: warnings.length, tokens: input.tokens };
  return {
    valid,
    structuralState: input.structuralState,
    checkedDocuments: [...input.checkedDocuments],
    uncheckedDocuments: [...input.uncheckedDocuments],
    errors,
    warnings,
    limits: input.limits,
    summary,
  };
}
