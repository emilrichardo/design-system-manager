import type { AnalysisLimitsResult } from "../traversal/limits.js";
import { noLimitsReached } from "../traversal/limits.js";

export type PresetValidationIssueSeverity = "error" | "warning";

export type PresetValidationIssueCode =
  | "preset-envelope-invalid"
  | "preset-id-invalid"
  | "preset-version-invalid"
  | "preset-name-invalid"
  | "preset-description-invalid"
  | "preset-category-unsupported"
  | "preset-category-duplicate"
  | "preset-category-order-invalid";

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
