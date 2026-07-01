// T032/T039/T040/T042 (009) — Carga + clasificación compartida entre `buildViewerSession` (overview
// agregado) y `buildViewerSectionDetail` (detalle por sección): ambos hacen su PROPIA única carga por
// request/refresh (cada HTTP request es su propia "sesión"), pero comparten esta clasificación pura para
// no duplicar la lógica de outcome. No introduce una segunda lectura dentro de una misma llamada.
import { classifyAnalysisOutcome } from "../classify-analysis-outcome.js";
import type { DesignSystemAnalysis } from "../../domain/analysis/design-system-analysis.js";
import type { FoundationsInspection } from "../foundations/foundations-ports.js";
import type { ResolvedTokenView } from "../build-export/build-ports.js";
import { deriveEmptyState, mapAnalysisOutcomeToViewerState, type ViewerResolvedStateV1 } from "./session.js";
import type { ViewerSessionDependencies } from "./ports.js";

export interface ClassifiedSnapshot {
  readonly state: ViewerResolvedStateV1;
  readonly analysis: DesignSystemAnalysis;
  readonly foundationProjection: FoundationsInspection | null;
  readonly resolvedTokenView: ResolvedTokenView;
  readonly sourceHash: string;
}

export type LoadSnapshotResult =
  | { readonly ok: true; readonly snapshot: ClassifiedSnapshot }
  | { readonly ok: false; readonly state: Extract<ViewerResolvedStateV1, "not-found" | "read-error"> };

/**
 * Lee el snapshot (`readBuildSnapshot`, 006) y clasifica su outcome (002) — ver el límite conocido en
 * `build-session.ts` sobre "sin documento de tokens ⇒ not-found". `deps.analyze` NUNCA se invoca aquí.
 */
export async function loadClassifiedSnapshot(input: { readonly executionDir: string }, deps: ViewerSessionDependencies): Promise<LoadSnapshotResult> {
  const snapshot = await deps.readBuildSnapshot.read(input);
  if (snapshot.outcome === "not-found") return { ok: false, state: "not-found" };
  if (snapshot.outcome !== "ready") return { ok: false, state: "read-error" };

  const { analysis, foundationProjection, resolvedTokenView, sourceHash } = snapshot.snapshot;
  const outcome = classifyAnalysisOutcome(analysis);
  const state = mapAnalysisOutcomeToViewerState(outcome);
  if (state === "not-found" || state === "read-error") return { ok: false, state };
  return { ok: true, snapshot: { state, analysis, foundationProjection, resolvedTokenView, sourceHash } };
}

export { deriveEmptyState };
