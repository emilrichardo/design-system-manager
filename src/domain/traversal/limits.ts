// T002/T007 — Límites seguros de análisis (ADR-0009). Valores canónicos, inmutables, NO configurables
// públicamente en 002. Dominio puro: sin Node/fs. La cota de presentación de CLI
// (MAX_INSPECT_TERMINAL_TOKEN_ROWS = 200) NO vive aquí: es un concern del reporter (Fase 8), no del
// dominio de análisis.

/** Límites duros del análisis (ADR-0009). Superarlos produce un Issue `limit-*-exceeded`. */
export const ANALYSIS_LIMITS = {
  /** Tamaño máximo por archivo: 5 MiB. */
  maxFileBytes: 5 * 1024 * 1024,
  /** Tamaño máximo acumulado leído: 16 MiB. */
  maxTotalBytes: 16 * 1024 * 1024,
  /** Profundidad máxima del árbol (raíz = 0). */
  maxDepth: 32,
  /** Número máximo de nodos. */
  maxNodes: 100_000,
  /** Longitud máxima de una ruta de token. */
  maxPathLength: 512,
  /** Longitud máxima de una referencia de alias. */
  maxAliasLength: 256,
  /** Número máximo de issues acumulados. */
  maxIssues: 1_000,
} as const;

/** Identificador estable de cada límite (se usa en los códigos `limit-<kind>-exceeded`). */
export type AnalysisLimitKind =
  | "file-size"
  | "total-size"
  | "depth"
  | "nodes"
  | "path-len"
  | "alias-len"
  | "issues";

/** Un límite duro alcanzado, con detalle seguro (sin secretos). */
export interface AnalysisLimitHit {
  readonly limit: AnalysisLimitKind;
  readonly detail: string;
}

/** Resultado de los límites tras el análisis. `partial` ⇒ análisis incompleto (DS no validado del todo). */
export interface AnalysisLimitsResult {
  readonly reached: boolean;
  readonly hits: readonly AnalysisLimitHit[];
  readonly partial: boolean;
}

/** Ningún límite alcanzado (análisis completo). */
export const noLimitsReached: AnalysisLimitsResult = { reached: false, hits: [], partial: false };

/**
 * Construye un `AnalysisLimitsResult` a partir de los límites alcanzados. Cualquier `hit` ⇒
 * `reached` y `partial` verdaderos (un límite duro deja el análisis incompleto). Función pura:
 * no muta la entrada y preserva el orden recibido.
 */
export function analysisLimitsResult(
  hits: readonly AnalysisLimitHit[] = [],
): AnalysisLimitsResult {
  const reached = hits.length > 0;
  return { reached, hits: [...hits], partial: reached };
}
