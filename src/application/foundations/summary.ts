// T023 (004) — Agregados foundation puros y deterministas.
import type { AnalysisLimitsResult } from "../../domain/traversal/limits.js";
import type {
  FoundationCategoryInspection,
  FoundationLevelCounts,
  FoundationsSummary,
  FoundationsValidation,
  FoundationTokenInspection,
} from "./foundations-ports.js";
import type { FoundationIssue } from "../../domain/foundations/foundation-issue.js";

export function computeFoundationLevelCounts(
  tokens: readonly FoundationTokenInspection[],
): FoundationLevelCounts {
  let primitive = 0;
  let semantic = 0;
  let unclassified = 0;

  for (const token of tokens) {
    switch (token.level) {
      case "primitive":
        primitive += 1;
        break;
      case "semantic":
        semantic += 1;
        break;
      case "unclassified":
        unclassified += 1;
        break;
    }
  }

  return { total: tokens.length, primitive, semantic, unclassified };
}

export function computeFoundationsSummary(
  categories: readonly FoundationCategoryInspection[],
  unresolved: readonly FoundationTokenInspection[],
  issues: readonly FoundationIssue[],
): FoundationsSummary {
  let absent = 0;
  let partial = 0;
  let complete = 0;
  let invalid = 0;
  let primitive = 0;
  let semantic = 0;
  let unclassified = 0;
  let errors = 0;
  let warnings = 0;

  for (const category of categories) {
    switch (category.state) {
      case "absent":
        absent += 1;
        break;
      case "partial":
        partial += 1;
        break;
      case "complete":
        complete += 1;
        break;
      case "invalid":
        invalid += 1;
        break;
    }
    primitive += category.counts.primitive;
    semantic += category.counts.semantic;
    unclassified += category.counts.unclassified;
  }

  for (const token of unresolved) {
    switch (token.level) {
      case "primitive":
        primitive += 1;
        break;
      case "semantic":
        semantic += 1;
        break;
      case "unclassified":
        unclassified += 1;
        break;
    }
  }

  for (const issue of issues) {
    if (issue.severity === "error") errors += 1;
    else warnings += 1;
  }

  return {
    categories: { absent, partial, complete, invalid },
    tokens: {
      total: primitive + semantic + unclassified,
      primitive,
      semantic,
      unclassified,
      unresolved: unresolved.length,
    },
    errors,
    warnings,
  };
}

export function computeFoundationsValidation(
  issues: readonly FoundationIssue[],
  limits: AnalysisLimitsResult,
): FoundationsValidation {
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return {
    valid: errors.length === 0 && warnings.length === 0 && !limits.partial,
    errors,
    warnings,
    limits,
  };
}
