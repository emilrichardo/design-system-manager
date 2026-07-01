// T009 (011) — `packs apply <id>`: reutiliza `applyPreset` (005) sin cambios de contrato; nunca escribe
// si el pack requiere un preset base que aún no está completamente aplicado (R2). Devuelve el MISMO tipo
// `PresetApplyResult` que `applyPreset` (outcome `invalid-preset`, `wrote: false`, razón en `error`).
import { requiredBasePreset } from "../../domain/presets/pack-registry.js";
import { planPresetApplication } from "./plan-preset-application.js";
import { applyPreset } from "./apply-preset.js";
import type { ApplyPresetDependencies, PresetApplyInput } from "./preset-ports.js";
import type { PresetApplyResult } from "../../domain/presets/preset-apply-result.js";

const EMPTY_SUMMARY = Object.freeze({
  create: 0,
  update: 0,
  unchanged: 0,
  conflict: 0,
  skip: 0,
  total: 0,
  blockingConflicts: 0,
  wouldWrite: false,
});

export async function applyPack(input: PresetApplyInput, deps: ApplyPresetDependencies): Promise<PresetApplyResult> {
  const basePresetId = requiredBasePreset(input.id);
  if (basePresetId !== null) {
    const baseResult = await planPresetApplication({ id: basePresetId, executionDir: input.executionDir }, deps);
    if (baseResult.outcome !== "unchanged") {
      return {
        outcome: "invalid-preset",
        preset: null,
        targetFile: null,
        plan: null,
        summary: EMPTY_SUMMARY,
        wrote: false,
        verification: null,
        notFoundResource: null,
        backup: null,
        error: {
          code: "pack-base-preset-not-applied",
          message: `El pack "${input.id}" requiere que "${basePresetId}" esté completamente aplicado antes de continuar (outcome del preset base: "${baseResult.outcome}").`,
        },
      };
    }
  }
  return applyPreset(input, deps);
}
