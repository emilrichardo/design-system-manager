// T037 — Acción del comando `validate`: delega TODO al caso de uso headless. Sin reglas de negocio,
// sin FS, sin JSON.parse, sin prompts, sin process.exit. Devuelve el resultado (la CLI mapea el código).
import type {
  AnalyzeDesignSystemInput,
  ValidateDesignSystemDependencies,
  ValidateDesignSystemResult,
} from "../../application/analysis-ports.js";
import { validateDesignSystem } from "../../application/validate-design-system.js";

export function runValidate(
  executionDir: string,
  deps: ValidateDesignSystemDependencies,
): Promise<ValidateDesignSystemResult> {
  const input: AnalyzeDesignSystemInput = { executionDir };
  return validateDesignSystem(input, deps);
}
