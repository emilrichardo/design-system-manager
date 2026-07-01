// T005 (009) — Tipos de `ViewerAliasV1`/`ViewerRenameMoveImpactV1` (data-model.md,
// contracts/viewer-alias-v1.contract.md). Solo tipos en Checkpoint A; `projectAlias` y
// `projectRenameMoveImpactPreview` llegan en Checkpoint E. Reutiliza `AliasState`/`NodeKind` de `002`
// y `MutationIssueCode` de `008` sin redefinirlos.
import type { AliasState, NodeKind } from "../../domain/analysis/token-node-summary.js";
import type { MutationIssueCode } from "../../domain/token-mutations/outcome.js";

/**
 * Previsualización de impacto de un rename/move hipotético (FR-015). Sourced de un plan `008`
 * descartado, en memoria, jamás persistido; `blocked`/`blockingReason` reutilizan el vocabulario de
 * `MutationIssueCode` de `008` en vez de inventar códigos propios del Viewer.
 */
export interface ViewerRenameMoveImpactV1 {
  readonly hypotheticalNewPath: string;
  readonly wouldRewriteReferences: readonly string[];
  readonly blocked: boolean;
  readonly blockingReason: MutationIssueCode | null;
}

/**
 * Proyección centrada en alias de un token (FR-015): origen, target inmediato, cadena completa,
 * dependientes y estado de alias — todo pass-through de `002`/`006`/`008` para la misma sesión.
 * `impactPreview` es `null` hasta que el usuario lo solicita explícitamente (nunca precomputado).
 */
export interface ViewerAliasV1 {
  readonly path: string;
  readonly origin: { readonly kind: NodeKind };
  readonly immediateTarget: string | null;
  readonly chain: readonly string[];
  readonly dependents: readonly string[];
  readonly state: AliasState;
  readonly impactPreview: ViewerRenameMoveImpactV1 | null;
}
