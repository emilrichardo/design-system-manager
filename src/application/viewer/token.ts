// T003 (009) — Tipos de `ViewerTokenV1` (data-model.md, contracts/viewer-token-v1.contract.md). Solo
// tipos en Checkpoint A; `projectToken` llega en Checkpoint B. Reutiliza las uniones literales de 002
// (`AliasState`/`NodeKind`/`NodeTrust`/`TypeOrigin`) y 004 (`FoundationCategoryRef`/`FoundationLevel`/
// `FoundationLevelSource`) sin redefinirlas.
import type {
  AliasState,
  NodeKind,
  NodeTrust,
  TypeOrigin,
} from "../../domain/analysis/token-node-summary.js";
import type { FoundationCategoryRef } from "../../domain/foundations/category-state.js";
import type { FoundationLevel, FoundationLevelSource } from "../../domain/foundations/foundation-level.js";

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
