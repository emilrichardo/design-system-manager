// T003/T013 (009) — Tipos de `ViewerTokenV1` (data-model.md, contracts/viewer-token-v1.contract.md) y su
// proyección real (Checkpoint B). Reutiliza las uniones literales de 002 (`AliasState`/`NodeKind`/
// `NodeTrust`/`TypeOrigin`) y 004 (`FoundationCategoryRef`/`FoundationLevel`/`FoundationLevelSource`) sin
// redefinirlas. `projectToken` combina `FoundationTokenInspection` (004, que ya reexpone los campos 002
// que necesita) + `description` (002 `TokenNodeSummary`, ausente en la proyección 004) + `ResolvedTokenRecord`
// (006, valores declarado/resuelto/cadena de alias) — sin recomputar ningún campo.
import type {
  AliasState,
  NodeKind,
  NodeTrust,
  TypeOrigin,
} from "../../domain/analysis/token-node-summary.js";
import type { FoundationCategoryRef } from "../../domain/foundations/category-state.js";
import type { FoundationLevel, FoundationLevelSource } from "../../domain/foundations/foundation-level.js";
import type { FoundationTokenInspection } from "../foundations/foundations-ports.js";
import type { ResolvedTokenRecord } from "../build-export/build-ports.js";

/**
 * Valor DTCG JSON-safe (nunca AST/`Map`/`Set`/bytes/`Error`); alias local documental sobre `unknown`
 * (data-model.md exclusions). No es un tipo nuevo de dominio, solo una anotación de intención.
 */
export type SafeJsonValue = unknown;

/**
 * Proyección compartida de un token (FR-009): la forma de detalle que consume toda vista que lista o
 * inspecciona tokens (Colors/Typography/Spacing/Radius/Borders/Shadows/Motion/Foundations/Aliases/
 * búsqueda). Cada campo es un pass-through de `002`/`004`/`006` para la misma carga de sesión.
 */
export interface ViewerTokenV1 {
  readonly path: string;
  readonly category: FoundationCategoryRef;
  readonly level: FoundationLevel;
  readonly levelSource: FoundationLevelSource;
  readonly declaredType: string | null;
  readonly effectiveType: string | null;
  readonly typeOrigin: TypeOrigin;
  readonly kind: NodeKind;
  readonly declaredValue: SafeJsonValue;
  readonly resolvedValue: SafeJsonValue;
  readonly immediateAliasTarget: string | null;
  readonly aliasChain: readonly string[];
  readonly aliasState: AliasState;
  readonly description: string | null;
  readonly trust: NodeTrust;
}

/** Insumos de `projectToken`, ya calculados en la misma sesión (SC-004). */
export interface ProjectTokenInput {
  readonly foundation: FoundationTokenInspection;
  /** De `002` `TokenNodeSummary.description` (la proyección 004 no lo reexpone). */
  readonly description: string | null;
  /** `undefined` solo si la fuente cambió entre el análisis y la vista de resolución (no debería ocurrir
   * en la misma sesión); se degrada a valores seguros en vez de fallar. */
  readonly resolved: ResolvedTokenRecord | undefined;
}

/** Proyecta `ViewerTokenV1`: cada campo es un pass-through directo de una fuente ya cargada (SC-004). */
export function projectToken(input: ProjectTokenInput): ViewerTokenV1 {
  const { foundation, description, resolved } = input;
  return {
    path: foundation.path,
    category: foundation.category,
    level: foundation.level,
    levelSource: foundation.levelSource,
    declaredType: foundation.declaredType,
    effectiveType: foundation.effectiveType,
    typeOrigin: foundation.typeOrigin,
    kind: foundation.kind,
    declaredValue: resolved !== undefined ? resolved.declaredValue : null,
    resolvedValue: resolved !== undefined ? resolved.resolvedValue : null,
    immediateAliasTarget: resolved !== undefined ? resolved.immediateAliasTarget : foundation.aliasTarget,
    aliasChain: resolved !== undefined ? [...resolved.aliasChain] : [],
    aliasState: foundation.aliasState,
    description,
    trust: foundation.trust,
  };
}
