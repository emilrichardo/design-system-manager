// T003/T014 (009) — Tipos de `ViewerFoundationV1` (data-model.md, contracts/viewer-foundation-v1.contract.md)
// y su proyección real (Checkpoint B). Reutiliza `FoundationCategoryId`/`FoundationCategoryState`/
// `FoundationLevelCounts` de 004 sin redefinirlos. `projectFoundationCategory` reusa
// `FoundationCategoryInspection` (004) + `projectToken` por token, preservando el orden de documento que
// 004 ya garantiza (sin una segunda pasada sobre el árbol DTCG).
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import type { FoundationCategoryState } from "../../domain/foundations/category-state.js";
import type { FoundationCategoryInspection, FoundationLevelCounts } from "../foundations/foundations-ports.js";
import type { ResolvedTokenRecord } from "../build-export/build-ports.js";
import { projectToken, type ViewerTokenV1 } from "./token.js";
import { mapAnalysisIssueToViewerIssue, type ViewerIssueV1 } from "./issue.js";

/**
 * Proyección de una categoría foundation (base de Foundations, y de Spacing/Radius/Borders/Shadows/
 * Motion; Colors/Typography la extienden con `ViewerColorV1`/`ViewerTypographyV1`). `tokens` preserva
 * el orden de documento ya garantizado por `004`; no hay una quinta forma de contrato por categoría.
 */
export interface ViewerFoundationV1 {
  readonly id: FoundationCategoryId;
  readonly state: FoundationCategoryState;
  readonly counts: FoundationLevelCounts;
  readonly tokens: readonly ViewerTokenV1[];
  readonly issues: readonly ViewerIssueV1[];
}

/**
 * Proyecta `ViewerFoundationV1` desde la `FoundationCategoryInspection` (004) de la misma sesión.
 * `descriptionByPath`/`resolvedByPath` vienen de `002`/`006` para la misma carga (sin recomputar nada).
 */
export function projectFoundationCategory(
  inspection: FoundationCategoryInspection,
  descriptionByPath: ReadonlyMap<string, string | null>,
  resolvedByPath: ReadonlyMap<string, ResolvedTokenRecord>,
): ViewerFoundationV1 {
  return {
    id: inspection.id,
    state: inspection.state,
    counts: inspection.counts,
    tokens: inspection.tokens.map((foundation) =>
      projectToken({ foundation, description: descriptionByPath.get(foundation.path) ?? null, resolved: resolvedByPath.get(foundation.path) }),
    ),
    issues: inspection.issues.map((issue) => mapAnalysisIssueToViewerIssue("foundations", issue)),
  };
}
