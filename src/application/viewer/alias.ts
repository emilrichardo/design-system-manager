// T005 (009) — Tipos de `ViewerAliasV1`/`ViewerRenameMoveImpactV1` (data-model.md,
// contracts/viewer-alias-v1.contract.md). Solo tipos en Checkpoint A; `projectAlias` y
// `projectRenameMoveImpactPreview` llegan en Checkpoint E. Reutiliza `AliasState`/`NodeKind` de `002`
// y `MutationIssueCode` de `008` sin redefinirlos.
import type { AliasState, NodeKind } from "../../domain/analysis/token-node-summary.js";
import type { MutationIssueCode } from "../../domain/token-mutations/outcome.js";
import { createTokenMutationCommand } from "../../domain/token-mutations/command.js";
import { lastSegment, parentPath } from "../../domain/token-mutations/paths.js";
import type { ViewerPlanRenameMoveImpact } from "./ports.js";

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

/**
 * Proyecta `ViewerAliasV1` desde un `TokenNodeSummary`-like (002) + `chain` (006, ya resuelta) +
 * `dependents` (008 `AnalyzedTokenSource.dependentsOf`, misma sesión). `impactPreview` empieza `null`
 * (nunca precomputado); se adjunta a demanda vía `projectRenameMoveImpactPreview`.
 */
export function projectAlias(input: {
  readonly path: string;
  readonly kind: NodeKind;
  readonly immediateTarget: string | null;
  readonly chain: readonly string[];
  readonly dependents: readonly string[];
  readonly state: AliasState;
}): ViewerAliasV1 {
  return {
    path: input.path,
    origin: { kind: input.kind },
    immediateTarget: input.immediateTarget,
    chain: input.chain,
    dependents: input.dependents,
    state: input.state,
    impactPreview: null,
  };
}

/**
 * Calcula un `ViewerRenameMoveImpactV1` para un rename/move HIPOTÉTICO, reusando el plan read-only de
 * `008` (`planRenameMoveImpact`, ligado a `deps.readAnalyzedTokenSource` — nunca `applyTokenMutation`).
 * El comando sintético y su plan/diff resultante NUNCA se persisten; se descartan al devolver el
 * resultado. `blockingReason` reutiliza los códigos de `008` (`MutationIssueCode`) sin inventar ninguno.
 */
export async function projectRenameMoveImpactPreview(
  alias: ViewerAliasV1,
  hypotheticalNewPath: string,
  kind: "rename" | "move",
  planRenameMoveImpact: ViewerPlanRenameMoveImpact,
): Promise<ViewerAliasV1> {
  if (kind === "move" && parentPath(hypotheticalNewPath) === null) {
    // Sin grupo padre nombrable (destino en la raíz): 008 no modela un "grupo raíz" movible; bloqueado
    // sin necesidad de invocar el plan (nada que planificar).
    return { ...alias, impactPreview: { hypotheticalNewPath, wouldRewriteReferences: [], blocked: true, blockingReason: null } };
  }
  const command = createTokenMutationCommand([
    kind === "rename"
      ? { kind: "rename-token", path: alias.path, newName: lastSegment(hypotheticalNewPath) }
      : { kind: "move-token", path: alias.path, newParent: parentPath(hypotheticalNewPath) as string },
  ]);
  const result = await planRenameMoveImpact(command);
  const blocked = result.outcome !== "planned";
  const rewritten = result.diff?.entries.find((e) => e.kind === "renamed" || e.kind === "moved");
  const impactPreview: ViewerRenameMoveImpactV1 = {
    hypotheticalNewPath,
    wouldRewriteReferences: rewritten?.references ?? [],
    blocked,
    blockingReason: blocked ? (result.conflicts[0]?.code ?? null) : null,
  };
  return { ...alias, impactPreview };
}
