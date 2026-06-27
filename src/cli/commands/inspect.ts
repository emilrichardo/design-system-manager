// T037 — Acción del comando `inspect`: delega TODO al caso de uso headless. Sin FS/traversal/prompts.
import type {
  AnalyzeDesignSystemInput,
  InspectDesignSystemDependencies,
  InspectDesignSystemResult,
} from "../../application/analysis-ports.js";
import { inspectDesignSystem } from "../../application/inspect-design-system.js";

export function runInspect(
  executionDir: string,
  deps: InspectDesignSystemDependencies,
): Promise<InspectDesignSystemResult> {
  const input: AnalyzeDesignSystemInput = { executionDir };
  return inspectDesignSystem(input, deps);
}
