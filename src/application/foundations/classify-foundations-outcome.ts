// T025 (004) — Clasificación global foundations desde señales estructuradas.
import { classifyAnalysisOutcome } from "../classify-analysis-outcome.js";
import type { DesignSystemAnalysis } from "../../domain/analysis/design-system-analysis.js";
import type { AnalysisOutcome } from "../analysis-ports.js";
import type { FoundationsInspection } from "./foundations-ports.js";

/**
 * Precedencia: not-found > read-error > structural-partial > foundations-invalid >
 * foundations-partial > valid.
 */
export function classifyFoundationsOutcome(
  analysis: DesignSystemAnalysis,
  inspection: FoundationsInspection | null,
): AnalysisOutcome {
  const structuralOutcome = classifyAnalysisOutcome(analysis);
  if (structuralOutcome === "not-found" || structuralOutcome === "read-error") {
    return structuralOutcome;
  }
  if (analysis.structuralState === "partial") return "partial";
  if (inspection === null) return structuralOutcome === "valid" ? "valid" : "complete-invalid";

  if (inspection.summary.categories.invalid > 0) return "complete-invalid";
  if (
    inspection.summary.categories.partial > 0 ||
    inspection.summary.tokens.unresolved > 0 ||
    inspection.limits.partial
  ) {
    return "partial";
  }
  return "valid";
}
