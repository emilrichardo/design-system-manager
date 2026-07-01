// T007 (009) — `ViewerSessionDependencies`: los puertos de sesión del Viewer sobre los casos de uso ya
// cerrados de `002`–`008`. Capa de aplicación: solo contratos, sin Node/Commander/infraestructura
// concreta. Cada campo es, como máximo, invocado una vez por sesión (FR-003/SC-002; ver `build-session.ts`
// en Checkpoint B).
import type { AnalyzeUseCase } from "../analysis-ports.js";
import type { SourceSnapshotReader as BuildSourceSnapshotReader } from "../build-export/build-ports.js";
import type { PreviousBuildManifestInput } from "../build-export/ownership.js";
import type { AssetListResult, AssetInspectResult } from "../assets/asset-ports.js";
import type { PresetListResult } from "../presets/preset-ports.js";
import type { SourceSnapshotPort as MutationSourceSnapshotPort } from "../token-mutations/ports.js";
import type { TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";
import type { BrandSourceSnapshot } from "../../domain/brand/index.js";

/** Bound `listAssets` (007): sin dependencias explícitas visibles al Viewer, ya cerradas por composición. */
export type ViewerListAssets = () => Promise<AssetListResult>;

/** Bound `inspectAsset` (007). */
export type ViewerInspectAsset = (input: { readonly logicalPath: string }) => Promise<AssetInspectResult>;

/** Bound `listPresets` (005). */
export type ViewerListPresets = () => Promise<PresetListResult>;

/**
 * Lee el build manifest previo (`design-system/build/manifest.json`), sin re-analizar la fuente de
 * tokens; devuelve la forma cruda ya existente en 006 (`ownership.ts`) — la validación/derivación de
 * `ViewerBuildStatusV1` (formats/stale) es una función pura separada en Checkpoint B, no este puerto.
 */
export type ViewerReadBuildManifest = () => Promise<PreviousBuildManifestInput>;

/**
 * Bound, read-only `planTokenMutation` (008): construye un plan/diff sintético y descartable a partir
 * de un comando `rename-token`/`move-token` hipotético. NUNCA invoca `applyTokenMutation`; el resultado
 * nunca se persiste (data-model.md `ViewerRenameMoveImpactV1`).
 */
export type ViewerPlanRenameMoveImpact = (
  command: TokenMutationCommandV1,
) => Promise<TokenMutationResultV1>;

/**
 * T022 (011) — Bound, read-only `readBrandSource` (D): lee los 4 documentos `design-system/brand/**`
 * sin tocar tokens ni assets. Devuelve `BrandSourceSnapshot` con `status: "absent"` cuando no hay
 * Brand System (proyectos 001-010), de modo que la vista `brand` muestre "Brand System: absent" sin
 * fallar ni inventar información (FR-017).
 */
export type ViewerReadBrandSource = () => Promise<BrandSourceSnapshot>;

/**
 * Dependencias de una sesión del Viewer. Cada puerto referencia, sin redefinir, la superficie pública ya
 * cerrada del use case correspondiente:
 * - `analyze` (002): análisis único del Design System.
 * - `readBuildSnapshot` (006): snapshot semántico único, que ya embebe la proyección de foundations (004)
 *   y la vista de resolución de tokens; evita una segunda lectura/análisis foundation independiente.
 * - `listPresets` (005), `listAssets`/`inspectAsset` (007): lecturas read-only ya existentes.
 * - `readAnalyzedTokenSource` (008): vista analizada de la fuente (`AnalyzedTokenSource`, incluida
 *   `dependentsOf`), reutilizada para Aliases; `planRenameMoveImpact` reusa el planner read-only de 008.
 * - `readBrandSource` (D, 011): lectura read-only de `design-system/brand/**` para las vistas
 *   `brand`/`quality` (nunca toca tokens/assets; ausente es válido).
 */
export interface ViewerSessionDependencies {
  /** No se invoca en `buildViewerSession`: `readBuildSnapshot` ya ejecuta el mismo análisis 002
   * internamente. Se mantiene tipado por si un adapter futuro necesita el `AnalyzeUseCase` puro (p. ej.
   * un fallback de test); invocarlo junto a `readBuildSnapshot` en la misma sesión sería una segunda
   * lectura/parseo/análisis y está prohibido (Execution Rules, "una sola carga por sesión"). */
  readonly analyze: AnalyzeUseCase;
  readonly readBuildSnapshot: BuildSourceSnapshotReader;
  readonly listPresets: ViewerListPresets;
  readonly listAssets: ViewerListAssets;
  readonly inspectAsset: ViewerInspectAsset;
  readonly readBuildManifest: ViewerReadBuildManifest;
  readonly readAnalyzedTokenSource: MutationSourceSnapshotPort;
  readonly planRenameMoveImpact: ViewerPlanRenameMoveImpact;
  /** T022 (011) — opcional para no romper fakes existentes que todavía no lo cablean; las vistas
   * `brand`/`quality` lo tratan como `absent` cuando falta (degradación explícita, nunca error). */
  readonly readBrandSource?: ViewerReadBrandSource;
}
