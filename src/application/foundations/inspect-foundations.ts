// T028 (004) — Caso de uso headless foundations. Orquesta el análisis único de 002 y las funciones
// puras de foundations; no lee archivos, no parsea JSON, no conoce CLI/JSON/ANSI/exit codes.
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import type { DesignSystemAnalysis } from "../../domain/analysis/design-system-analysis.js";
import { isHostUnresolved } from "../classify-analysis-outcome.js";
import { projectFoundationMetadata } from "./metadata-pass.js";
import { projectFoundations } from "./project-foundations.js";
import { classifyFoundationsOutcome } from "./classify-foundations-outcome.js";
import type {
  FoundationsInspection,
  FoundationsResult,
  InspectFoundationsDependencies,
} from "./foundations-ports.js";
import type { AnalyzeDesignSystemInput } from "../analysis-ports.js";

function shouldInspectFoundations(analysis: DesignSystemAnalysis): boolean {
  return !isHostUnresolved(analysis) && analysis.structuralState !== "not-initialized";
}

export async function inspectFoundations(
  input: AnalyzeDesignSystemInput,
  deps: InspectFoundationsDependencies,
): Promise<FoundationsResult> {
  const analysis = await deps.analyze(input);
  const projectMetadata = deps.projectMetadata ?? projectFoundationMetadata;
  const projectInspection = deps.projectInspection ?? projectFoundations;
  const classifyOutcome = deps.classifyOutcome ?? classifyFoundationsOutcome;

  let inspection: FoundationsInspection | null = null;
  if (shouldInspectFoundations(analysis)) {
    const parsed = analysis.documents[MANAGED_FILES.tokens]?.parsed;
    const metadata = projectMetadata(parsed);
    inspection = projectInspection(analysis, metadata);
  }

  const outcome = classifyOutcome(analysis, inspection);
  const hostResolved = !isHostUnresolved(analysis);
  let result: FoundationsResult;

  if (outcome === "not-found") {
    result = { outcome, host: hostResolved ? analysis.host : null, inspection: null, hostError: null };
  } else {
    const recoverableInspection = inspection as FoundationsInspection;
    switch (outcome) {
      case "valid":
        result = { outcome, host: analysis.host, inspection: recoverableInspection };
        break;
      case "complete-invalid":
        result = { outcome, host: analysis.host, inspection: recoverableInspection };
        break;
      case "partial":
        result = { outcome, host: analysis.host, inspection: recoverableInspection };
        break;
      case "read-error":
        result = { outcome, host: analysis.host, inspection: recoverableInspection };
        break;
    }
  }

  await deps.reporter.completed(result);
  return result;
}
