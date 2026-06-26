// T043 — Acción del comando `init`: delega TODO al caso de uso. Sin reglas de negocio, sin FS,
// sin construir documentos, sin decidir estados, sin process.exit.
import type { InitializeDependencies } from "../../application/ports.js";
import { initializeDesignSystem } from "../../application/initialize-design-system.js";
import type { InitializationResult } from "../../domain/result/initialization-result.js";

export function runInit(
  executionDir: string,
  deps: InitializeDependencies,
): Promise<InitializationResult> {
  return initializeDesignSystem({ executionDir }, deps);
}
