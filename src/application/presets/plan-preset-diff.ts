// T047 (005) — Motor PURO y determinista de diff (capa de aplicación). Recibe candidatos normalizados
// y el estado host normalizado (ambos ya analizados; NO lee filesystem, NO resuelve host, NO escribe) y
// clasifica cada path como create/update/unchanged/conflict/skip, reutilizando la equivalencia genérica
// de `domain/changes` y los conflictos estables de `domain/presets`. El orden final lo fija
// `createTokenChangeSet` (sin segunda política de orden). Un conflicto bloqueante deja el plan no
// escribible (bloqueo total); los cambios seguros se conservan para preview. No construye el documento
// candidato (Checkpoint H) ni resuelve dependencias foundation primitive→semantic (fuera del contrato
// de conflictos v1).
import type { ManagedNode, ManagedDifference } from "../../domain/changes/equivalence.js";
import { managedDifference } from "../../domain/changes/equivalence.js";
import type { TokenChange } from "../../domain/changes/token-change.js";
import type { ApplicationConflict } from "../../domain/changes/application-conflict.js";
import type { ApplicationPlan } from "../../domain/changes/application-plan.js";
import { applicationPlan } from "../../domain/changes/application-plan.js";
import { createTokenChangeSet } from "../../domain/changes/token-change-set.js";
import type { PresetConflictCode } from "../../domain/presets/preset-conflict.js";
import { PRESET_CONFLICT_CODES, presetConflict } from "../../domain/presets/preset-conflict.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";

/** Entrada del diff: candidatos del preset (incl. grupos padre) + host indexado por path. */
export interface PresetDiffInput {
  readonly candidates: readonly ManagedNode[];
  readonly host: ReadonlyMap<string, ManagedNode>;
}

export interface PresetDiffResult {
  readonly plan: ApplicationPlan;
}

const DIFFERENCE_CODE: Readonly<Record<Exclude<ManagedDifference, null>, PresetConflictCode>> = {
  value: PRESET_CONFLICT_CODES.valueDiffers,
  alias: PRESET_CONFLICT_CODES.aliasDiffers,
  type: PRESET_CONFLICT_CODES.typeDiffers,
  level: PRESET_CONFLICT_CODES.levelDiffers,
};

function conflictChange(node: ManagedNode, category: FoundationCategoryId, code: PresetConflictCode): TokenChange {
  const conflict = presetConflict(code, node.path);
  return {
    path: node.path,
    nodeKind: node.nodeKind,
    category,
    level: node.level,
    operation: "conflict",
    reason: code,
    blocksWrite: conflict.blocksWrite,
    conflict,
    proposedToken: null,
  };
}

function plainChange(
  node: ManagedNode,
  category: FoundationCategoryId,
  operation: "create" | "unchanged" | "skip",
  reason: string,
): TokenChange {
  return { path: node.path, nodeKind: node.nodeKind, category, level: node.level, operation, reason, blocksWrite: false, conflict: null, proposedToken: null };
}

function descriptionUpdate(node: ManagedNode, category: FoundationCategoryId): TokenChange {
  return {
    path: node.path,
    nodeKind: "token",
    category,
    level: node.level,
    operation: "update",
    reason: "preset-description-missing",
    blocksWrite: false,
    conflict: null,
    proposedToken: node.description === null ? null : { $description: node.description },
  };
}

/** Clasifica un único candidato de token contra su nodo host equivalente (mismo path, ambos token). */
function diffToken(candidate: ManagedNode, host: ManagedNode, category: FoundationCategoryId): TokenChange {
  const difference = managedDifference(candidate, host);
  if (difference !== null) return conflictChange(candidate, category, DIFFERENCE_CODE[difference]);

  // Campos administrados equivalentes: política de `$description`.
  if (candidate.description === null) return plainChange(candidate, category, "unchanged", "managed-equivalent");
  if (host.description === null) return descriptionUpdate(candidate, category);
  if (host.description === candidate.description) return plainChange(candidate, category, "unchanged", "managed-equivalent");
  return plainChange(candidate, category, "skip", PRESET_CONFLICT_CODES.descriptionDiffers);
}

/** Clasifica un candidato contra el host (ausente/colisión token-grupo/grupo existente/diff de token). */
function diffCandidate(candidate: ManagedNode, host: ReadonlyMap<string, ManagedNode>, category: FoundationCategoryId): TokenChange {
  const existing = host.get(candidate.path);
  if (existing === undefined) return plainChange(candidate, category, "create", "path-absent");

  if (existing.nodeKind !== candidate.nodeKind) {
    const code = candidate.nodeKind === "token" ? PRESET_CONFLICT_CODES.tokenVsGroup : PRESET_CONFLICT_CODES.groupVsToken;
    return conflictChange(candidate, category, code);
  }
  if (candidate.nodeKind === "group") return plainChange(candidate, category, "unchanged", "group-exists");
  return diffToken(candidate, existing, category);
}

/**
 * Calcula el plan de cambios determinista para los candidatos contra el host. No muta las entradas. Un
 * candidato sin categoría resoluble se omite (un preset validado no los produce).
 */
export function planPresetDiff(input: PresetDiffInput): PresetDiffResult {
  const changes: TokenChange[] = [];
  for (const candidate of input.candidates) {
    if (candidate.category === "unresolved") continue;
    changes.push(diffCandidate(candidate, input.host, candidate.category));
  }

  const built = createTokenChangeSet(changes);
  const ordered = built.ok ? built.changeSet.changes : changes;
  const conflicts: readonly ApplicationConflict[] = ordered
    .map((change) => change.conflict)
    .filter((conflict): conflict is ApplicationConflict => conflict !== null);

  return { plan: applicationPlan(ordered, conflicts) };
}
