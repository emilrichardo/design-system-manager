// T010 (009) — `buildViewerSession`: única carga por sesión. Invoca `readBuildSnapshot` (006, que ya
// ejecuta el análisis 002 y embebe la proyección de foundations 004 y la vista de resolución de tokens),
// `listPresets` (005), `listAssets` (007) y `readBuildManifest` (006) como máximo una vez cada uno.
// `deps.analyze` (002) NUNCA se invoca aquí — sería una segunda lectura/parseo/análisis de la misma
// fuente (Execution Rules, "una sola carga por sesión"). Cero escrituras: todos los puertos usados son
// de lectura.
//
// Límite conocido y deliberado: `readBuildSnapshot` (006) exige que el DOCUMENTO DE TOKENS exista para
// producir un snapshot; si no existe (aunque `neuraz-ds.config.json` sí), el reader devuelve `not-found`
// incluso cuando el `structuralState` subyacente de 002 sería `partial`. No se corrige llamando también a
// `deps.analyze` (sería una segunda lectura/análisis) ni leyendo bytes crudos aquí (la capa de aplicación
// no puede tocar `node:fs`, ver `scripts/arch-guard.mjs`). El Viewer trata "sin documento de tokens" como
// `not-found`: no hay contenido DTCG que proyectar. Cuando el documento de tokens SÍ existe, la
// clasificación (`partial`/`complete-invalid`/`valid`) se deriva fielmente del `analysis` embebido en el
// snapshot — ver `tests/application/viewer/session-states.test.ts`.
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import { deriveEmptyState, type ViewerSessionV1 } from "./session.js";
import { loadClassifiedSnapshot } from "./snapshot-session.js";
import { deriveBuildStatus, projectOverview } from "./overview.js";
import { projectNavigation, type ViewerCategoryNavEntry } from "./navigation.js";
import { projectAllIssues } from "./issue.js";
import type { ViewerSessionDependencies } from "./ports.js";

/** Cuenta nodos-grupo (objetos sin `$value`) sobre el documento YA parseado de la sesión: una pasada
 * estructural pura en memoria, no una segunda lectura/parseo/análisis del archivo. */
function countGroups(node: unknown): number {
  if (typeof node !== "object" || node === null || Array.isArray(node)) return 0;
  let total = 0;
  for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
    if (key.startsWith("$")) continue;
    if (typeof child !== "object" || child === null || Array.isArray(child)) continue;
    if (Object.prototype.hasOwnProperty.call(child, "$value")) continue; // es un token, no un grupo
    total += 1 + countGroups(child);
  }
  return total;
}

export async function buildViewerSession(
  input: { readonly executionDir: string },
  deps: ViewerSessionDependencies,
): Promise<ViewerSessionV1> {
  const loaded = await loadClassifiedSnapshot(input, deps);
  if (!loaded.ok) return { state: loaded.state, host: { initialized: loaded.state !== "not-found" }, overview: null, navigation: null };

  // `ViewerSessionV1` solo expone overview/navigation (agregados); el detalle por sección (tokens de una
  // categoría, vía `projectFoundationCategory`/`resolvedTokenView`) se proyecta a demanda vía
  // `build-section-detail.ts`, con su propia (única) carga por request — nunca reutilizando esta.
  const { analysis, foundationProjection, sourceHash } = loaded.snapshot;
  const baseState = loaded.snapshot.state;

  const [presetsResult, assetsResult, previousManifest] = await Promise.all([
    deps.listPresets(),
    deps.listAssets(),
    deps.readBuildManifest(),
  ]);

  const aliasNodes = analysis.nodes.filter((n) => n.kind === "alias");
  const validAliases = aliasNodes.filter((n) => n.aliasState === "valid").length;

  const parsedTokensDoc = analysis.documents[MANAGED_FILES.tokens]?.parsed;
  const groupsTotal = countGroups(parsedTokensDoc);

  const categoryById = new Map<FoundationCategoryId, ViewerCategoryNavEntry>(
    (foundationProjection?.categories ?? []).map((c) => [c.id, { count: c.counts.total, state: baseState }]),
  );

  const build = deriveBuildStatus(previousManifest, sourceHash);

  const issues = projectAllIssues({
    validation: [...analysis.errors, ...analysis.warnings],
    foundations: foundationProjection ? [...foundationProjection.validation.errors, ...foundationProjection.validation.warnings] : [],
    assetConflicts: assetsResult.conflicts,
    aliasNodes: aliasNodes,
    buildStale: build.stale,
  });

  const overview = projectOverview({
    state: baseState,
    errorCount: analysis.errors.length,
    warningCount: analysis.warnings.length,
    tokens: foundationProjection?.summary.tokens ?? { total: 0, primitive: 0, semantic: 0, unclassified: 0 },
    groupsTotal,
    aliases: { total: aliasNodes.length, valid: validAliases, broken: aliasNodes.length - validAliases },
    categories: foundationProjection?.summary.categories ?? { absent: 0, partial: 0, complete: 0, invalid: 0 },
    assets: assetsResult.summary,
    presets: { total: presetsResult.presets.length, outcome: presetsResult.outcome },
    issuesTotal: issues.length,
    build,
  });

  const state = deriveEmptyState(baseState, {
    tokensTotal: overview.tokens.total,
    assetsTotal: overview.assets.totalAssets,
    presetsTotal: overview.presets.total,
  });

  const navigation = projectNavigation(overview, categoryById, state);

  return { state, host: { initialized: true }, overview, navigation };
}
