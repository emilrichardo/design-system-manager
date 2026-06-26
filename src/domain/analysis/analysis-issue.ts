// T003 — AnalysisIssue (C4): tipo aditivo retrocompatible que EXTIENDE el `Issue` de `001` sin
// mutarlo. `Issue` aporta { code, message, path? }; 002 añade severidad, documento y contexto seguro.
// Dominio puro: sin Node/fs/zod/ajv/CLI. `code` es estable; NUNCA se usa el texto de AJV/Zod como código.
import type { Issue } from "../issue.js";

/** Severidad de un issue de análisis. `error` puede invalidar; `warning` no invalida por sí solo. */
export type Severity = "error" | "warning";

/** Documento administrado al que se asocia el issue, cuando se conoce. */
export type ManagedDocument = "config" | "manifest" | "tokens" | "host" | "structure";

/** Issue de análisis: `Issue` de 001 + severidad/documento/contexto. Estructuralmente es un `Issue`. */
export interface AnalysisIssue extends Issue {
  readonly severity: Severity;
  readonly document?: ManagedDocument;
  /** Contexto seguro opcional (sin secretos). No es un identificador. */
  readonly context?: Record<string, unknown>;
}

/** Campos opcionales de un issue de análisis (reutilizan `path` de `Issue`, sin duplicarlo). */
export interface AnalysisIssueOptions {
  readonly path?: string;
  readonly document?: ManagedDocument;
  readonly context?: Record<string, unknown>;
}

function build(
  severity: Severity,
  code: string,
  message: string,
  opts: AnalysisIssueOptions = {},
): AnalysisIssue {
  const issue: { -readonly [K in keyof AnalysisIssue]?: AnalysisIssue[K] } = {
    code,
    message,
    severity,
  };
  if (opts.path !== undefined) issue.path = opts.path;
  if (opts.document !== undefined) issue.document = opts.document;
  if (opts.context !== undefined) issue.context = opts.context;
  return issue as AnalysisIssue;
}

/** Crea un issue de severidad `error`. */
export function analysisError(
  code: string,
  message: string,
  opts?: AnalysisIssueOptions,
): AnalysisIssue {
  return build("error", code, message, opts);
}

/** Crea un issue de severidad `warning`. */
export function analysisWarning(
  code: string,
  message: string,
  opts?: AnalysisIssueOptions,
): AnalysisIssue {
  return build("warning", code, message, opts);
}

export function isError(issue: AnalysisIssue): boolean {
  return issue.severity === "error";
}

export function isWarning(issue: AnalysisIssue): boolean {
  return issue.severity === "warning";
}
