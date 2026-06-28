import type {
  PresetApplyResult,
  PresetCatalogEntry,
  PresetEnvelope,
  PresetId,
  PresetInspection,
  PresetValidation,
} from "../../domain/presets/index.js";
import type { PresetApplicationPlan } from "../../domain/presets/preset-application-plan.js";

export interface PresetCatalogPort {
  list(): Promise<readonly PresetCatalogEntry[]>;
  get(id: PresetId): Promise<PresetEnvelope | null>;
}

export interface PresetValidationPort {
  validate(envelope: PresetEnvelope): PresetValidation;
}

export interface PresetListResult {
  readonly outcome: "success" | "invalid-preset";
  readonly presets: readonly PresetCatalogEntry[];
  readonly validation: PresetValidation | null;
}

export interface PresetInspectInput {
  readonly id: PresetId;
}

export type PresetInspectionResult =
  | { readonly outcome: "success"; readonly inspection: PresetInspection }
  | { readonly outcome: "not-found"; readonly inspection: null };

export interface PresetPlanInput {
  readonly id: PresetId;
  readonly executionDir: string;
}

export type PresetApplicationPlanResult =
  | { readonly outcome: "success" | "unchanged" | "conflict"; readonly plan: PresetApplicationPlan }
  | { readonly outcome: "invalid-preset" | "not-found" | "read-error"; readonly plan: PresetApplicationPlan | null };

export interface PresetApplyInput {
  readonly id: PresetId;
  readonly executionDir: string;
}

export interface ListPresetsDependencies {
  readonly catalog: PresetCatalogPort;
}

export interface InspectPresetDependencies {
  readonly catalog: PresetCatalogPort;
  readonly validator: PresetValidationPort;
}

export interface PlanPresetApplicationDependencies {
  readonly catalog: PresetCatalogPort;
}

export interface ApplyPresetDependencies {
  readonly catalog: PresetCatalogPort;
}

export type ListPresets = (deps: ListPresetsDependencies) => Promise<PresetListResult>;
export type InspectPreset = (
  input: PresetInspectInput,
  deps: InspectPresetDependencies,
) => Promise<PresetInspectionResult>;
export type PlanPresetApplication = (
  input: PresetPlanInput,
  deps: PlanPresetApplicationDependencies,
) => Promise<PresetApplicationPlanResult>;
export type ApplyPreset = (
  input: PresetApplyInput,
  deps: ApplyPresetDependencies,
) => Promise<PresetApplyResult>;
