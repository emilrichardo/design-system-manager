import type { AnalysisLimitsResult } from "../traversal/limits.js";
import { noLimitsReached } from "../traversal/limits.js";

export type PresetValidationIssueSeverity = "error" | "warning";

export type PresetValidationIssueCode =
  // envelope / metadata (Checkpoint A + C)
  | "preset-envelope-invalid"
  | "preset-field-unknown"
  | "preset-tokens-empty"
  | "preset-id-invalid"
  | "preset-version-invalid"
  | "preset-name-invalid"
  | "preset-description-invalid"
  | "preset-category-unsupported"
  | "preset-category-duplicate"
  | "preset-category-order-invalid"
  // DTCG / foundations / categories / aliases / limits (Checkpoint C)
  | "preset-dtcg-invalid"
  | "preset-type-mismatch"
  | "preset-foundation-metadata-invalid"
  | "preset-token-unclassified"
  | "preset-token-unresolved"
  | "preset-category-undeclared"
  | "preset-category-unused"
  | "preset-alias-missing"
  | "preset-alias-cycle"
  | "preset-alias-to-group"
  | "preset-reference-external"
  | "preset-limit-exceeded";

export interface PresetValidationIssue {
  readonly code: PresetValidationIssueCode;
  readonly path: string | null;
  readonly severity: PresetValidationIssueSeverity;
  readonly message: string;
}

export interface PresetValidation {
  readonly valid: boolean;
  readonly errors: readonly PresetValidationIssue[];
  readonly warnings: readonly PresetValidationIssue[];
  readonly limits: AnalysisLimitsResult;
}

export function presetValidation(
  errors: readonly PresetValidationIssue[] = [],
  warnings: readonly PresetValidationIssue[] = [],
  limits: AnalysisLimitsResult = noLimitsReached,
): PresetValidation {
  return {
    valid: errors.length === 0 && !limits.partial,
    errors: [...errors],
    warnings: [...warnings],
    limits,
  };
}

export function presetValidationError(
  code: PresetValidationIssueCode,
  message: string,
  path: string | null = null,
): PresetValidationIssue {
  return { code, path, severity: "error", message };
}

export function presetValidationWarning(
  code: PresetValidationIssueCode,
  message: string,
  path: string | null = null,
): PresetValidationIssue {
  return { code, path, severity: "warning", message };
}
