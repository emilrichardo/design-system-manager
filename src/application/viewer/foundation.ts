// T003 (009) — Tipos de `ViewerFoundationV1` (data-model.md, contracts/viewer-foundation-v1.contract.md).
// Solo tipos en Checkpoint A; `projectFoundationCategory` llega en Checkpoint B. Reutiliza
// `FoundationCategoryId`/`FoundationCategoryState`/`FoundationLevelCounts` de 004 sin redefinirlos.
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import type { FoundationCategoryState } from "../../domain/foundations/category-state.js";
import type { FoundationLevelCounts } from "../foundations/foundations-ports.js";
import type { ViewerTokenV1 } from "./token.js";
import type { ViewerIssueV1 } from "./issue.js";

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
