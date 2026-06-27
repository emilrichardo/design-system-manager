// T031 — Caso de uso headless `validateDesignSystem`. Proyecta el análisis compartido a un resultado
// público discriminado y notifica al reporter. NO resuelve host, NO lee, NO parsea, NO recorre, NO usa
// exit codes ni terminal. Llama exactamente UNA vez a `deps.analyze(input)`.
import type {
  AnalyzeDesignSystemInput,
  ValidateDesignSystemDependencies,
  ValidateDesignSystemResult,
} from "./analysis-ports.js";
import { createValidationReport } from "./create-validation-report.js";
import { classifyAnalysisOutcome, isHostUnresolved } from "./classify-analysis-outcome.js";

export async function validateDesignSystem(
  input: AnalyzeDesignSystemInput,
  deps: ValidateDesignSystemDependencies,
): Promise<ValidateDesignSystemResult> {
  // Excepción inesperada del analyzer: se propaga (no se enmascara como read-error).
  const analysis = await deps.analyze(input);

  const report = createValidationReport(analysis);
  const outcome = classifyAnalysisOutcome(analysis);
  const hostResolved = !isHostUnresolved(analysis);

  // Eventos: hostResolved (solo si el host se resolvió) → structuralStateDetected → validated → completed.
  if (hostResolved) await deps.reporter.hostResolved(analysis.host);
  await deps.reporter.structuralStateDetected(analysis.structuralState);
  await deps.reporter.validated(report);

  const result: ValidateDesignSystemResult =
    outcome === "not-found"
      ? { outcome, host: hostResolved ? analysis.host : null, report, hostError: null }
      : { outcome, host: analysis.host, report };

  await deps.reporter.completed(result);
  return result;
}
