// T006/T015 (009) — Tipos de `ViewerIssueV1` (data-model.md, contracts/viewer-issue-v1.contract.md) y su
// proyección (Checkpoint B, parcial: solo `validation`/`foundations`; `assets`/`aliases`/`build` llegan en
// Checkpoint E). `mapAnalysisIssueToViewerIssue` es un pass-through 1:1 de un `AnalysisIssue` ya existente
// (002/004, misma forma estructural) — nunca un motor de validación nuevo.
import type { AnalysisIssue } from "../../domain/analysis/analysis-issue.js";

/**
 * Fuente cerrada de un issue consolidado (FR-013): qué caso de uso reusado lo produjo. `build` es el
 * único origen con un código Viewer-computado (`stale-build`), y sigue siendo un booleano sobre campos
 * ya existentes de `006` — nunca un motor de validación nuevo.
 */
export type ViewerIssueSource = "validation" | "foundations" | "assets" | "aliases" | "build";

/**
 * Issue consolidado del Viewer. `code`/`path`/`severity`/`message` son siempre un pass-through del
 * código/severidad/mensaje ya seguro del origen (`AnalysisIssue`/`FoundationIssue`/`AssetIssue`/
 * `AliasState`), salvo `stale-build` (el único código propio del Viewer).
 */
export interface ViewerIssueV1 {
  readonly source: ViewerIssueSource;
  readonly code: string;
  readonly path: string | null;
  readonly severity: "error" | "warning";
  readonly message: string;
}

/** Pass-through 1:1: `path` opcional (`Issue` de 001) se normaliza a `null` (nunca `undefined`). */
export function mapAnalysisIssueToViewerIssue(source: ViewerIssueSource, issue: AnalysisIssue): ViewerIssueV1 {
  return { source, code: issue.code, path: issue.path ?? null, severity: issue.severity, message: issue.message };
}

/** Insumos por fuente, ya recolectados en la sesión; `assets`/`aliases`/`build` se añaden en Checkpoint E. */
export interface ProjectIssuesInput {
  readonly validation: readonly AnalysisIssue[];
  readonly foundations: readonly AnalysisIssue[];
  readonly assets?: readonly AnalysisIssue[];
  readonly aliases?: readonly AnalysisIssue[];
  readonly build?: readonly AnalysisIssue[];
}

/**
 * Consolida `ViewerIssueV1[]` agrupado por fuente en el orden canónico fijo
 * (`validation|foundations|assets|aliases|build`), preservando el orden propio de cada fuente dentro de
 * su grupo. Nunca ejecuta un segundo motor de validación (FR-013).
 */
export function projectIssues(input: ProjectIssuesInput): readonly ViewerIssueV1[] {
  return [
    ...input.validation.map((i) => mapAnalysisIssueToViewerIssue("validation", i)),
    ...input.foundations.map((i) => mapAnalysisIssueToViewerIssue("foundations", i)),
    ...(input.assets ?? []).map((i) => mapAnalysisIssueToViewerIssue("assets", i)),
    ...(input.aliases ?? []).map((i) => mapAnalysisIssueToViewerIssue("aliases", i)),
    ...(input.build ?? []).map((i) => mapAnalysisIssueToViewerIssue("build", i)),
  ];
}
