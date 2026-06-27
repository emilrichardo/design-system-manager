// T007 (003) — Mappers comunes puros: host, límites y resumen. Copias defensivas explícitas (sin
// deep-clone genérico, sin structuredClone, sin librerías). No mutan la entrada; preservan el orden
// de `hits`. `summary.tokens` ausente → `null` (ADR-0011, contracts json-validate/json-envelope).
import type { AnalysisHost } from "../../domain/analysis/design-system-analysis.js";
import type { AnalysisLimitsResult } from "../../domain/traversal/limits.js";
import type { ValidationSummary } from "../../domain/analysis/validation-report.js";
import type { JsonHostV1, JsonLimitsV1, JsonSummaryV1 } from "./dto.js";

/** `AnalysisHost | null` → `JsonHostV1 | null` (copia de campos). */
export function toJsonHost(host: AnalysisHost | null): JsonHostV1 | null {
  if (host === null) return null;
  return { root: host.root, designSystemPath: host.designSystemPath };
}

/** `AnalysisLimitsResult` → `JsonLimitsV1` con `hits` copiados en orden. */
export function toJsonLimits(limits: AnalysisLimitsResult): JsonLimitsV1 {
  return {
    reached: limits.reached,
    partial: limits.partial,
    hits: limits.hits.map((hit) => ({ limit: hit.limit, detail: hit.detail })),
  };
}

/** `ValidationSummary` → `JsonSummaryV1`; `tokens` ausente → `null`. */
export function toJsonSummary(summary: ValidationSummary): JsonSummaryV1 {
  return {
    errors: summary.errors,
    warnings: summary.warnings,
    tokens: summary.tokens ?? null,
  };
}
