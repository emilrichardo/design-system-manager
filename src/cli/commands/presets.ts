// T093 + T097 (005) — Acciones del grupo `presets` (adapters delgados). Delegan en los casos de uso
// headless; sin lógica de negocio, sin FS/JSON/exit-codes/prompts. `apply` recalcula el plan
// internamente (no depende de la salida de un `plan` previo): `applyPreset` valida + analiza + planifica
// y solo entonces escribe. El id crudo de Commander se marca como `PresetId`; el catálogo es la fuente
// de verdad de existencia (un id desconocido produce `not-found`).
import type {
  ApplyPresetDependencies,
  InspectPresetDependencies,
  ListPresetsDependencies,
  PlanPresetApplicationDependencies,
  PresetApplicationPlanResult,
  PresetApplyInput,
  PresetInspectionResult,
  PresetListResult,
} from "../../application/presets/preset-ports.js";
import type { PresetApplyResult } from "../../domain/presets/preset-apply-result.js";
import type { PresetId } from "../../domain/presets/preset-id.js";
import { listPresets } from "../../application/presets/list-presets.js";
import { inspectPreset } from "../../application/presets/inspect-preset.js";
import { planPresetApplication } from "../../application/presets/plan-preset-application.js";
import { applyPreset } from "../../application/presets/apply-preset.js";
import { planPackApplication } from "../../application/presets/plan-pack-application.js";
import { applyPack } from "../../application/presets/apply-pack.js";

export function runPresetsList(deps: ListPresetsDependencies): Promise<PresetListResult> {
  return listPresets(deps);
}

export function runPresetsInspect(id: string, deps: InspectPresetDependencies): Promise<PresetInspectionResult> {
  return inspectPreset({ id: id as PresetId }, deps);
}

export function runPresetsPlan(
  id: string,
  executionDir: string,
  deps: PlanPresetApplicationDependencies,
): Promise<PresetApplicationPlanResult> {
  return planPresetApplication({ id: id as PresetId, executionDir }, deps);
}

export function runPresetsApply(
  id: string,
  executionDir: string,
  deps: ApplyPresetDependencies,
): Promise<PresetApplyResult> {
  const input: PresetApplyInput = { id: id as PresetId, executionDir };
  return applyPreset(input, deps);
}

// 011 T009 — `packs`: mismo motor add-only/atómico de `005`; solo añade la precondición de preset base
// (contracts/preset-web-complete.md R2). Devuelve los MISMOS tipos que `presets plan/apply` (reutiliza
// reporters/JSON existentes sin nuevas ramas de outcome).
export function runPacksPlan(
  id: string,
  executionDir: string,
  deps: PlanPresetApplicationDependencies,
): Promise<PresetApplicationPlanResult> {
  return planPackApplication({ id: id as PresetId, executionDir }, deps);
}

export function runPacksApply(
  id: string,
  executionDir: string,
  deps: ApplyPresetDependencies,
): Promise<PresetApplyResult> {
  const input: PresetApplyInput = { id: id as PresetId, executionDir };
  return applyPack(input, deps);
}
