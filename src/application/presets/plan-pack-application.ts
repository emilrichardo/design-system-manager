// T009 (011) — `packs plan <id>`: reutiliza `planPresetApplication` (005) sin cambios de contrato;
// solo añade la precondición "el preset base del pack ya está completamente aplicado" (R2 de
// contracts/preset-web-complete.md). Devuelve el MISMO tipo `PresetApplicationPlanResult` que
// `planPresetApplication` (outcome `invalid-preset`, `plan: null`) para reutilizar reporters/JSON
// existentes sin tocar sus contratos; la razón detallada no viaja en este DTO (limitación conocida:
// no hay campo de mensaje en `invalid-preset` para `plan`, a diferencia de `apply`).
import { requiredBasePreset } from "../../domain/presets/pack-registry.js";
import { planPresetApplication } from "./plan-preset-application.js";
import type { PlanPresetApplicationDependencies, PresetApplicationPlanResult, PresetPlanInput } from "./preset-ports.js";

export async function planPackApplication(
  input: PresetPlanInput,
  deps: PlanPresetApplicationDependencies,
): Promise<PresetApplicationPlanResult> {
  const basePresetId = requiredBasePreset(input.id);
  if (basePresetId !== null) {
    const baseResult = await planPresetApplication({ id: basePresetId, executionDir: input.executionDir }, deps);
    if (baseResult.outcome !== "unchanged") {
      return { outcome: "invalid-preset", plan: null };
    }
  }
  return planPresetApplication(input, deps);
}
