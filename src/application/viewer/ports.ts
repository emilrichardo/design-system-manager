// T007 (009) — `ViewerSessionDependencies`: los puertos de sesión del Viewer sobre los casos de uso ya
// cerrados de `002`–`008`. Capa de aplicación: solo contratos, sin Node/Commander/infraestructura
// concreta. Cada campo es, como máximo, invocado una vez por sesión (FR-003/SC-002; ver `build-session.ts`
// en Checkpoint B).
import type { AnalyzeUseCase } from "../analysis-ports.js";
import type { SourceSnapshotReader as BuildSourceSnapshotReader } from "../build-export/build-ports.js";
import type { AssetListResult, AssetInspectResult } from "../assets/asset-ports.js";
import type { PresetListResult } from "../presets/preset-ports.js";
import type { SourceSnapshotPort as MutationSourceSnapshotPort } from "../token-mutations/ports.js";
import type { TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";

/** Bound `listAssets` (007): sin dependencias explícitas visibles al Viewer, ya cerradas por composición. */
export type ViewerListAssets = () => Promise<AssetListResult>;

/** Bound `inspectAsset` (007). */
export type ViewerInspectAsset = (input: { readonly logicalPath: string }) => Promise<AssetInspectResult>;

/** Bound `listPresets` (005). */
export type ViewerListPresets = () => Promise<PresetListResult>;

/**
 * Bound, read-only `planTokenMutation` (008): construye un plan/diff sintético y descartable a partir
 * de un comando `rename-token`/`move-token` hipotético. NUNCA invoca `applyTokenMutation`; el resultado
 * nunca se persiste (data-model.md `ViewerRenameMoveImpactV1`).
 */
export type ViewerPlanRenameMoveImpact = (
  command: TokenMutationCommandV1,
) => Promise<TokenMutationResultV1>;

/**
 * Dependencias de una sesión del Viewer. Cada puerto referencia, sin redefinir, la superficie pública ya
 * cerrada del use case correspondiente:
 * - `analyze` (002): análisis único del Design System.
 * - `readBuildSnapshot` (006): snapshot semántico único, que ya embebe la proyección de foundations (004)
 *   y la vista de resolución de tokens; evita una segunda lectura/análisis foundation independiente.
 * - `listPresets` (005), `listAssets`/`inspectAsset` (007): lecturas read-only ya existentes.
 * - `readAnalyzedTokenSource` (008): vista analizada de la fuente (`AnalyzedTokenSource`, incluida
 *   `dependentsOf`), reutilizada para Aliases; `planRenameMoveImpact` reusa el planner read-only de 008.
 */
export interface ViewerSessionDependencies {
  readonly analyze: AnalyzeUseCase;
  readonly readBuildSnapshot: BuildSourceSnapshotReader;
  readonly listPresets: ViewerListPresets;
  readonly listAssets: ViewerListAssets;
  readonly inspectAsset: ViewerInspectAsset;
  readonly readAnalyzedTokenSource: MutationSourceSnapshotPort;
  readonly planRenameMoveImpact: ViewerPlanRenameMoveImpact;
}
