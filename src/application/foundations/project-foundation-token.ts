// T017 (004) — Proyección PURA de un token foundation (capa de aplicación). Une un `TokenNodeSummary`
// ya inspeccionado por 002 (datos por path: tipos/alias/trust) con su `FoundationLevelResolution`
// (nivel efectivo de la pasada de metadata, T011) y la categoría resuelta por path (T013) →
// `FoundationTokenInspection`. NO recibe el AST ni `$extensions`; NO lee `parsed`; NO invoca
// `projectFoundationMetadata`; NO resuelve alias/targets/`$type`; NO recalcula trust ni estadísticas;
// NO emite issues (la agregación por categoría/validación llega en checkpoints posteriores). Reutiliza
// tal cual los campos de 002 (sin reinterpretarlos) y devuelve un objeto nuevo (no muta el nodo).
import type { TokenNodeSummary } from "../../domain/analysis/token-node-summary.js";
import type { FoundationLevelResolution } from "../../domain/foundations/foundation-level.js";
import { resolveFoundationCategory } from "../../domain/foundations/resolve-foundation-category.js";
import type { FoundationTokenInspection } from "./foundations-ports.js";

/**
 * Proyecta un token a su vista foundation. La categoría se deriva del primer segmento canónico del
 * path (`"unresolved"` si no coincide). El nivel/source/sourcePath provienen de la resolución ya
 * calculada (token-source ⇒ sourcePath `null`; group/invalid ⇒ path del declarante). Pura y
 * determinista; no muta `node` ni `resolution`.
 */
export function projectFoundationToken(
  node: TokenNodeSummary,
  resolution: FoundationLevelResolution,
): FoundationTokenInspection {
  return {
    path: node.path,
    category: resolveFoundationCategory(node.path),
    level: resolution.level,
    levelSource: resolution.source,
    levelSourcePath: resolution.sourcePath,
    declaredType: node.declaredType,
    effectiveType: node.effectiveType,
    typeOrigin: node.typeOrigin,
    typeSourcePath: node.typeSourcePath,
    kind: node.kind,
    aliasTarget: node.aliasTarget,
    aliasState: node.aliasState,
    trust: node.trust,
  };
}
