// T006 (009) — Tipos de `ViewerIssueV1` (data-model.md, contracts/viewer-issue-v1.contract.md). Solo
// tipos en Checkpoint A; `projectIssues` llega en Checkpoint B (parcial) y se completa en Checkpoint E.

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
