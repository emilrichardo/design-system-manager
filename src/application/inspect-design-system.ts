// T032 — Caso de uso headless `inspectDesignSystem`. Proyecta el análisis compartido a una inspección
// recuperable (incluso en estados inválidos/parciales) y notifica al reporter. Mismo análisis que
// validate (una sola llamada a `deps.analyze(input)`); NO lee/parsea/recorre; sin exit codes/terminal.
import type { DesignSystemInspection } from "../domain/analysis/design-system-inspection.js";
import type {
  AnalyzeDesignSystemInput,
  InspectDesignSystemDependencies,
  InspectDesignSystemResult,
} from "./analysis-ports.js";
import { createDesignSystemInspection } from "./create-design-system-inspection.js";
import { classifyAnalysisOutcome, isHostUnresolved } from "./classify-analysis-outcome.js";

export async function inspectDesignSystem(
  input: AnalyzeDesignSystemInput,
  deps: InspectDesignSystemDependencies,
): Promise<InspectDesignSystemResult> {
  const analysis = await deps.analyze(input);

  const outcome = classifyAnalysisOutcome(analysis);
  const hostResolved = !isHostUnresolved(analysis);
  // `not-found` no produce inspección (no se inventan datos); el resto sí (recuperable).
  const inspection = outcome === "not-found" ? null : createDesignSystemInspection(analysis);

  if (hostResolved) await deps.reporter.hostResolved(analysis.host);
  await deps.reporter.structuralStateDetected(analysis.structuralState);
  if (inspection !== null) await deps.reporter.inspected(inspection);

  const result: InspectDesignSystemResult =
    outcome === "not-found"
      ? { outcome, host: hostResolved ? analysis.host : null, inspection: null, hostError: null }
      : { outcome, host: analysis.host, inspection: inspection as DesignSystemInspection };

  await deps.reporter.completed(result);
  return result;
}
