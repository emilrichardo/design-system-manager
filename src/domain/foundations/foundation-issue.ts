// T004 (004) — Códigos estables de issues propios de foundations (dominio puro). Reutilizan la forma
// `AnalysisIssue` de 002 (no se duplica el tipo). Aquí solo se definen los códigos y su severidad por
// defecto; la EMISIÓN llega en checkpoints posteriores. No se duplican códigos de alias/DTCG de 002
// (missing/cycle/to-group/dtcg-type-not-deeply-inspected se reutilizan por referencia).
import type { AnalysisIssue, Severity } from "../analysis/analysis-issue.js";

/** Un issue de foundations es, estructuralmente, un `AnalysisIssue` de 002 (mismo contrato). */
export type FoundationIssue = AnalysisIssue;

/** Códigos estables introducidos por 004 (no colisionan con los de 001/002). */
export const FOUNDATION_ISSUE_CODES = Object.freeze({
  levelInvalid: "foundation-level-invalid",
  forbiddenDependency: "foundation-forbidden-dependency",
  tokenUnclassified: "foundation-token-unclassified",
  categoryUnresolved: "foundation-category-unresolved",
  typeMismatch: "foundation-type-mismatch",
} as const);

export type FoundationIssueCode =
  (typeof FOUNDATION_ISSUE_CODES)[keyof typeof FOUNDATION_ISSUE_CODES];

/** Severidad por defecto de cada código (coincide con los contratos). */
export const FOUNDATION_ISSUE_SEVERITY: Readonly<Record<FoundationIssueCode, Severity>> =
  Object.freeze({
    "foundation-level-invalid": "error",
    "foundation-forbidden-dependency": "error",
    "foundation-token-unclassified": "warning",
    "foundation-category-unresolved": "warning",
    "foundation-type-mismatch": "warning",
  });
