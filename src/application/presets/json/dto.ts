import type { FoundationLevel } from "../../../domain/foundations/foundation-level.js";
import type { PresetsJsonFormatVersion } from "./format-version.js";

export type PresetsJsonCommandV1 = "preset-list" | "preset-inspect" | "preset-plan" | "preset-apply";

export type PresetsJsonOutcomeV1 =
  | "success"
  | "applied"
  | "unchanged"
  | "invalid-preset"
  | "conflict"
  | "not-found"
  | "read-error"
  | "write-error"
  | "verification-error"
  | "internal-error";

export type PresetsJsonNotFoundResourceV1 = "preset" | "design-system";

export interface PresetsJsonErrorV1 {
  readonly code: string;
  readonly message: string;
}

export interface PresetsJsonEnvelopeV1<Result> {
  readonly formatVersion: PresetsJsonFormatVersion;
  readonly command: PresetsJsonCommandV1;
  readonly outcome: PresetsJsonOutcomeV1;
  readonly result: Result | null;
  readonly error: PresetsJsonErrorV1 | null;
}

export interface PresetJsonCatalogEntryV1 {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly includedCategories: readonly string[];
}

export interface PresetJsonValidationIssueV1 {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly path: string | null;
}

export interface PresetJsonLimitHitV1 {
  readonly limit: string;
  readonly detail: string;
}

export interface PresetJsonLimitsV1 {
  readonly reached: boolean;
  readonly partial: boolean;
  readonly hits: readonly PresetJsonLimitHitV1[];
}

export interface PresetJsonValidationV1 {
  readonly valid: boolean;
  readonly errors: readonly PresetJsonValidationIssueV1[];
  readonly warnings: readonly PresetJsonValidationIssueV1[];
  readonly limits: PresetJsonLimitsV1;
}

export interface PresetJsonTokenInspectionV1 {
  readonly path: string;
  readonly category: string;
  readonly level: FoundationLevel;
  readonly type: string | null;
  readonly aliasTarget: string | null;
  readonly hasDescription: boolean;
}

export interface PresetJsonConflictV1 {
  readonly code: string;
  readonly path: string | null;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly blocksWrite: boolean;
  readonly proposedAction: string;
}

export type PresetJsonChangeOperationV1 = "create" | "update" | "unchanged" | "conflict" | "skip";

export interface PresetJsonChangeV1 {
  readonly path: string;
  readonly nodeKind: "group" | "token";
  readonly category: string;
  readonly level: FoundationLevel;
  readonly operation: PresetJsonChangeOperationV1;
  readonly reason: string;
  readonly blocksWrite: boolean;
  readonly conflict: PresetJsonConflictV1 | null;
}

export interface PresetJsonSummaryV1 {
  readonly create: number;
  readonly update: number;
  readonly unchanged: number;
  readonly conflict: number;
  readonly skip: number;
  readonly total: number;
  readonly blockingConflicts: number;
  readonly wouldWrite: boolean;
}

export interface PresetJsonApplicationPlanV1 {
  readonly preset: PresetJsonCatalogEntryV1;
  readonly targetFile: string;
  readonly writable: boolean;
  readonly changes: readonly PresetJsonChangeV1[];
  readonly conflicts: readonly PresetJsonConflictV1[];
  readonly summary: PresetJsonSummaryV1;
}

export interface PresetJsonVerificationV1 {
  readonly checked: boolean;
  readonly valid: boolean;
  readonly contributedTokensPresent: boolean;
  readonly newStructuralErrors: readonly PresetJsonConflictV1[];
}

export interface PresetJsonBackupV1 {
  readonly relativePath: string;
}

export interface PresetJsonListResultV1 {
  readonly presets: readonly PresetJsonCatalogEntryV1[];
  readonly validation: PresetJsonValidationV1 | null;
}

export interface PresetJsonInspectResultV1 {
  readonly preset: PresetJsonCatalogEntryV1 | null;
  readonly tokens: readonly PresetJsonTokenInspectionV1[];
  readonly validation: PresetJsonValidationV1 | null;
}

export interface PresetJsonPlanResultV1 {
  readonly preset: PresetJsonCatalogEntryV1 | null;
  readonly targetFile: string | null;
  readonly plan: PresetJsonApplicationPlanV1 | null;
  readonly notFoundResource: PresetsJsonNotFoundResourceV1 | null;
  readonly error: PresetsJsonErrorV1 | null;
}

export interface PresetJsonApplyResultV1 {
  readonly preset: PresetJsonCatalogEntryV1 | null;
  readonly targetFile: string | null;
  readonly plan: PresetJsonApplicationPlanV1 | null;
  readonly summary: PresetJsonSummaryV1;
  readonly wrote: boolean;
  readonly verification: PresetJsonVerificationV1 | null;
  readonly notFoundResource: PresetsJsonNotFoundResourceV1 | null;
  readonly backup: PresetJsonBackupV1 | null;
  readonly error: PresetsJsonErrorV1 | null;
}
