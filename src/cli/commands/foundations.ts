// T040 (004) - Accion del comando `foundations`: delega al caso de uso headless, sin FS/JSON/prompts.
import type { AnalyzeDesignSystemInput } from "../../application/analysis-ports.js";
import type {
  FoundationsResult,
  InspectFoundationsDependencies,
} from "../../application/foundations/foundations-ports.js";
import { inspectFoundations } from "../../application/foundations/inspect-foundations.js";

export function runFoundations(
  executionDir: string,
  deps: InspectFoundationsDependencies,
): Promise<FoundationsResult> {
  const input: AnalyzeDesignSystemInput = { executionDir };
  return inspectFoundations(input, deps);
}
