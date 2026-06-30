// T140 (006) — Acción `neuraz-ds build` (adapter delgado). Delega en el caso de uso headless
// `buildDesignSystem`; sin lógica de negocio, sin FS/JSON/exit-codes/prompts. Un solo caso de uso por
// invocación. La selección de reporter (humano/JSON) y el mapeo a exit code ocurren en el programa.
import type { BuildResult } from "../../domain/build-export/build-result.js";
import type { BuildDesignSystemDependencies } from "../../application/build-export/build-design-system.js";
import { buildDesignSystem } from "../../application/build-export/build-design-system.js";

export function runBuild(executionDir: string, deps: BuildDesignSystemDependencies): Promise<BuildResult> {
  return buildDesignSystem({ executionDir }, deps);
}
