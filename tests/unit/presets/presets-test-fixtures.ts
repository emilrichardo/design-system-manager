import { applicationPlan } from "../../../src/domain/changes/application-plan.js";
import { presetConflict } from "../../../src/domain/presets/preset-conflict.js";
import { createPresetMetadata, type PresetCatalogEntry, type PresetInspection } from "../../../src/domain/presets/preset-envelope.js";
import { presetValidation, presetValidationError } from "../../../src/domain/presets/preset-validation.js";
import { PRESET_APPLICATION_TARGET_FILE, type PresetApplicationPlan } from "../../../src/domain/presets/preset-application-plan.js";
import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import type { TokenChange } from "../../../src/domain/changes/token-change.js";
import type { PresetApplyResult } from "../../../src/domain/presets/preset-apply-result.js";

export function presetEntry(overrides: Partial<PresetCatalogEntry> = {}): PresetCatalogEntry {
  const result = createPresetMetadata({
    id: "neutral-base",
    name: "Neutral Base",
    description: "Portable neutral base.",
    version: "1.0.0",
    includedCategories: ["color", "spacing"],
  });
  if (!result.ok) throw new Error("fixture preset metadata must be valid");
  return { ...result.value, ...overrides };
}

export const validationIssue = presetValidationError("preset-envelope-invalid", "Preset envelope is invalid.", "tokens");

export const invalidPresetValidation = presetValidation([validationIssue], [], noLimitsReached);

export const validPresetValidation = presetValidation([], [], noLimitsReached);

export const createChange: TokenChange = {
  path: "color.base.primary",
  nodeKind: "token",
  category: "color",
  level: "primitive",
  operation: "create",
  reason: "missing",
  blocksWrite: false,
  conflict: null,
  proposedToken: { "$value": "#ffffff", "$type": "color" },
};

export const conflict = presetConflict("preset-value-differs", "color.base.primary");

export const conflictChange: TokenChange = {
  path: "color.base.primary",
  nodeKind: "token",
  category: "color",
  level: "primitive",
  operation: "conflict",
  reason: "value differs",
  blocksWrite: true,
  conflict,
  proposedToken: { "$value": "#000000", "$type": "color" },
};

export function presetPlan(changes: readonly TokenChange[] = [createChange]): PresetApplicationPlan {
  return {
    preset: presetEntry(),
    targetFile: PRESET_APPLICATION_TARGET_FILE,
    plan: applicationPlan(changes, changes.flatMap((change) => (change.conflict === null ? [] : [change.conflict]))),
    hostState: "complete-valid",
    notFoundResource: null,
  };
}

export function presetInspection(): PresetInspection {
  return {
    metadata: presetEntry(),
    tokens: [
      {
        path: "color.base.primary",
        category: "color",
        level: "primitive",
        type: "color",
        aliasTarget: null,
        hasDescription: true,
      },
      {
        path: "spacing.2",
        category: "spacing",
        level: "semantic",
        type: "dimension",
        aliasTarget: "spacing.1",
        hasDescription: false,
      },
    ],
    validation: validPresetValidation,
  };
}

export function applyResult(overrides: Partial<PresetApplyResult> = {}): PresetApplyResult {
  const plan = presetPlan();
  return {
    outcome: "applied",
    preset: presetEntry(),
    targetFile: PRESET_APPLICATION_TARGET_FILE,
    plan,
    summary: plan.plan.summary,
    wrote: true,
    verification: {
      checked: true,
      valid: true,
      contributedTokensPresent: true,
      newStructuralErrors: [],
    },
    notFoundResource: null,
    backup: null,
    error: null,
    ...overrides,
  };
}
