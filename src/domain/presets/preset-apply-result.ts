import type { ApplicationConflict } from "../changes/application-conflict.js";
import type { PresetCatalogEntry } from "./preset-envelope.js";
import type { PresetApplicationPlan, PresetApplicationSummary } from "./preset-application-plan.js";
import type { PresetNotFoundResource } from "./preset-application-plan.js";
import { PRESET_APPLICATION_TARGET_FILE } from "./preset-application-plan.js";

export type PresetApplyOutcome =
  | "applied"
  | "unchanged"
  | "conflict"
  | "invalid-preset"
  | "not-found"
  | "read-error"
  | "write-error"
  | "verification-error";

export interface PresetVerification {
  readonly checked: boolean;
  readonly valid: boolean;
  readonly contributedTokensPresent: boolean;
  readonly newStructuralErrors: readonly ApplicationConflict[];
}

export interface PresetApplyResultError {
  readonly code: string;
  readonly message: string;
}

export interface PresetApplyResult {
  readonly outcome: PresetApplyOutcome;
  readonly preset: PresetCatalogEntry | null;
  readonly targetFile: typeof PRESET_APPLICATION_TARGET_FILE | null;
  readonly plan: PresetApplicationPlan | null;
  readonly summary: PresetApplicationSummary;
  readonly wrote: boolean;
  readonly verification: PresetVerification | null;
  readonly notFoundResource: PresetNotFoundResource | null;
  readonly backup: { readonly relativePath: string } | null;
  readonly error: PresetApplyResultError | null;
}
