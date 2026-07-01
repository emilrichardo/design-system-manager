// T006/T015 (009) — Tipos de `ViewerIssueV1` (data-model.md, contracts/viewer-issue-v1.contract.md) y su
// proyección (Checkpoint B, parcial: solo `validation`/`foundations`; `assets`/`aliases`/`build` llegan en
// Checkpoint E). `mapAnalysisIssueToViewerIssue` es un pass-through 1:1 de un `AnalysisIssue` ya existente
// (002/004, misma forma estructural) — nunca un motor de validación nuevo.
import type { AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import type { AliasState } from "../../domain/analysis/token-node-summary.js";

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

/**
 * Insumos por fuente, ya recolectados en la sesión. `validation`/`foundations` son `AnalysisIssue[]`
 * crudos (mapeados aquí mismo); `assets`/`aliases`/`build` (Checkpoint E) llegan YA mapeados a
 * `ViewerIssueV1` por el llamador (cada fuente tiene su propio tipo de issue nativo — `AssetIssue`,
 * estado de alias sintetizado, `stale-build` — ver `mapAssetIssueToViewerIssue`/`buildStaleIssue`).
 */
export interface ProjectIssuesInput {
  readonly validation: readonly AnalysisIssue[];
  readonly foundations: readonly AnalysisIssue[];
  readonly assets?: readonly ViewerIssueV1[];
  readonly aliases?: readonly ViewerIssueV1[];
  readonly build?: readonly ViewerIssueV1[];
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
    ...(input.assets ?? []),
    ...(input.aliases ?? []),
    ...(input.build ?? []),
  ];
}

/** Pass-through 1:1 de un `AssetIssue` (007) — mismos campos, distinto tipo nativo que `AnalysisIssue`. */
export function mapAssetIssueToViewerIssue(issue: { readonly code: string; readonly path: string | null; readonly severity: "error" | "warning"; readonly message: string }): ViewerIssueV1 {
  return { source: "assets", code: issue.code, path: issue.path, severity: issue.severity, message: issue.message };
}

/** Issue sintético para un estado de alias no válido (`002` `AliasState`, sin issue nativo propio). */
export function aliasStateIssue(path: string, state: Exclude<AliasState, "valid" | "n/a">): ViewerIssueV1 {
  const messages: Record<string, string> = {
    missing: "El alias referencia un token inexistente.",
    "to-group": "El alias referencia un grupo, no un token.",
    cyclic: "El alias forma parte de un ciclo de referencias.",
    malformed: "El alias tiene una forma inválida.",
  };
  return { source: "aliases", code: state, path, severity: "error", message: messages[state] ?? `Alias inválido: ${state}.` };
}

/** Issue sintético `stale-build`: siempre `warning` (nunca bloqueante — el Viewer no puede reconstruir). */
export function buildStaleIssue(): ViewerIssueV1 {
  return { source: "build", code: "stale-build", path: null, severity: "warning", message: "El build publicado no refleja la fuente actual de tokens." };
}

/** Forma mínima de un `AssetIssue` (007) suficiente para mapear (evita acoplar este módulo al tipo exacto). */
export interface AssetIssueLike {
  readonly code: string;
  readonly path: string | null;
  readonly severity: "error" | "warning";
  readonly message: string;
}

/**
 * Insumos crudos para el consolidado COMPLETO de issues (T042): `validation`/`foundations` (002/004),
 * `assetConflicts` (007, ya cargados en la misma sesión), `aliasNodes` (002, para sintetizar issues de
 * estado no válido) y `buildStale` (006, comparación de hash ya calculada). Un solo lugar para las 5
 * fuentes, reusado por `build-session.ts` y `build-section-detail.ts` sin duplicar la lógica.
 */
export interface ProjectAllIssuesInput {
  readonly validation: readonly AnalysisIssue[];
  readonly foundations: readonly AnalysisIssue[];
  readonly assetConflicts: readonly AssetIssueLike[];
  readonly aliasNodes: readonly { readonly path: string; readonly aliasState: AliasState }[];
  readonly buildStale: boolean;
}

/** Consolida las 5 fuentes de issues (FR-013), en el orden canónico fijo. */
export function projectAllIssues(input: ProjectAllIssuesInput): readonly ViewerIssueV1[] {
  return projectIssues({
    validation: input.validation,
    foundations: input.foundations,
    assets: input.assetConflicts.map(mapAssetIssueToViewerIssue),
    aliases: input.aliasNodes
      .filter((n): n is { path: string; aliasState: Exclude<AliasState, "valid" | "n/a"> } => n.aliasState !== "valid" && n.aliasState !== "n/a")
      .map((n) => aliasStateIssue(n.path, n.aliasState)),
    build: input.buildStale ? [buildStaleIssue()] : [],
  });
}
