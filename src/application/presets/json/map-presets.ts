import type {
  PresetApplicationPlanResult,
  PresetInspectionResult,
  PresetListResult,
} from "../preset-ports.js";
import type {
  PresetApplyResult,
  PresetCatalogEntry,
  PresetInspection,
  PresetValidation,
} from "../../../domain/presets/index.js";
import type { ApplicationConflict } from "../../../domain/changes/application-conflict.js";
import type { ApplicationPlan } from "../../../domain/changes/application-plan.js";
import { PRESET_APPLICATION_TARGET_FILE } from "../../../domain/presets/preset-application-plan.js";
import { PRESETS_JSON_FORMAT_VERSION } from "./format-version.js";
import type {
  PresetJsonApplicationPlanV1,
  PresetJsonApplyResultV1,
  PresetJsonCatalogEntryV1,
  PresetJsonChangeV1,
  PresetJsonConflictV1,
  PresetJsonInspectResultV1,
  PresetJsonListResultV1,
  PresetJsonPlanResultV1,
  PresetJsonSummaryV1,
  PresetJsonValidationV1,
  PresetsJsonEnvelopeV1,
} from "./dto.js";

export function toPresetListJsonEnvelope(
  result: PresetListResult,
): PresetsJsonEnvelopeV1<PresetJsonListResultV1> {
  return {
    formatVersion: PRESETS_JSON_FORMAT_VERSION,
    command: "preset-list",
    outcome: result.outcome,
    result: {
      presets: result.presets.map(mapCatalogEntry),
      validation: result.validation === null ? null : mapValidation(result.validation),
    },
    error: null,
  };
}

export function toPresetInspectJsonEnvelope(
  result: PresetInspectionResult,
): PresetsJsonEnvelopeV1<PresetJsonInspectResultV1> {
  if (result.inspection === null) {
    return {
      formatVersion: PRESETS_JSON_FORMAT_VERSION,
      command: "preset-inspect",
      outcome: result.outcome,
      result: { preset: null, tokens: [], validation: null },
      error: null,
    };
  }

  return {
    formatVersion: PRESETS_JSON_FORMAT_VERSION,
    command: "preset-inspect",
    outcome: result.outcome,
    result: mapInspection(result.inspection),
    error: null,
  };
}

export function toPresetPlanJsonEnvelope(
  result: PresetApplicationPlanResult,
): PresetsJsonEnvelopeV1<PresetJsonPlanResultV1> {
  return {
    formatVersion: PRESETS_JSON_FORMAT_VERSION,
    command: "preset-plan",
    outcome: result.outcome,
    result: mapPlanResult(result),
    error: null,
  };
}

export function toPresetApplyJsonEnvelope(
  result: PresetApplyResult,
): PresetsJsonEnvelopeV1<PresetJsonApplyResultV1> {
  return {
    formatVersion: PRESETS_JSON_FORMAT_VERSION,
    command: "preset-apply",
    outcome: result.outcome,
    result: {
      preset: result.preset === null ? null : mapCatalogEntry(result.preset),
      targetFile: result.targetFile,
      plan: result.plan === null ? null : mapPlan(result.plan),
      summary: mapSummary(result.summary),
      wrote: result.wrote,
      verification:
        result.verification === null
          ? null
          : {
              checked: result.verification.checked,
              valid: result.verification.valid,
              contributedTokensPresent: result.verification.contributedTokensPresent,
              newStructuralErrors: result.verification.newStructuralErrors.map(mapConflict),
            },
      notFoundResource: result.notFoundResource,
      backup: result.backup === null ? null : { relativePath: result.backup.relativePath },
      error: result.error === null ? null : { code: result.error.code, message: result.error.message },
    },
    error: null,
  };
}

function mapPlanResult(result: PresetApplicationPlanResult): PresetJsonPlanResultV1 {
  if (result.plan === null) {
    return {
      preset: null,
      targetFile: null,
      plan: null,
      notFoundResource: "notFoundResource" in result ? result.notFoundResource : null,
      error: result.outcome === "read-error" ? { code: "preset-read-error", message: "Preset target could not be read." } : null,
    };
  }

  return {
    preset: mapCatalogEntry(result.plan.preset),
    targetFile: result.plan.targetFile,
    plan: mapPlan(result.plan),
    notFoundResource: "notFoundResource" in result ? result.notFoundResource : null,
    error: null,
  };
}

function mapInspection(inspection: PresetInspection): PresetJsonInspectResultV1 {
  return {
    preset: mapCatalogEntry(inspection.metadata),
    tokens: inspection.tokens.map((token) => ({
      path: token.path,
      category: token.category,
      level: token.level,
      type: token.type,
      aliasTarget: token.aliasTarget,
      hasDescription: token.hasDescription,
    })),
    validation: mapValidation(inspection.validation),
  };
}

function mapPlan(plan: {
  readonly preset: PresetCatalogEntry;
  readonly targetFile: typeof PRESET_APPLICATION_TARGET_FILE;
  readonly plan: ApplicationPlan;
}): PresetJsonApplicationPlanV1 {
  return {
    preset: mapCatalogEntry(plan.preset),
    targetFile: plan.targetFile,
    writable: plan.plan.writable,
    changes: plan.plan.changeSet.changes.map((change): PresetJsonChangeV1 => ({
      path: change.path,
      nodeKind: change.nodeKind,
      category: change.category,
      level: change.level,
      operation: change.operation,
      reason: change.reason,
      blocksWrite: change.blocksWrite,
      conflict: change.conflict === null ? null : mapConflict(change.conflict),
    })),
    conflicts: plan.plan.conflicts.map(mapConflict),
    summary: mapSummary(plan.plan.summary),
  };
}

function mapCatalogEntry(entry: PresetCatalogEntry): PresetJsonCatalogEntryV1 {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    version: entry.version,
    includedCategories: [...entry.includedCategories],
  };
}

function mapValidation(validation: PresetValidation): PresetJsonValidationV1 {
  return {
    valid: validation.valid,
    errors: validation.errors.map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
      path: issue.path,
    })),
    warnings: validation.warnings.map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
      path: issue.path,
    })),
    limits: {
      reached: validation.limits.reached,
      partial: validation.limits.partial,
      hits: validation.limits.hits.map((hit) => ({ limit: hit.limit, detail: hit.detail })),
    },
  };
}

function mapConflict(conflict: ApplicationConflict): PresetJsonConflictV1 {
  return {
    code: conflict.code,
    path: conflict.path,
    severity: conflict.severity,
    message: conflict.message,
    blocksWrite: conflict.blocksWrite,
    proposedAction: conflict.proposedAction,
  };
}

function mapSummary(summary: PresetJsonSummaryV1): PresetJsonSummaryV1 {
  return {
    create: summary.create,
    update: summary.update,
    unchanged: summary.unchanged,
    conflict: summary.conflict,
    skip: summary.skip,
    total: summary.total,
    blockingConflicts: summary.blockingConflicts,
    wouldWrite: summary.wouldWrite,
  };
}
