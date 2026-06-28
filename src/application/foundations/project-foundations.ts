// T024 (004) — Proyección foundation completa desde el análisis único de 002 + metadata ya parseada.
import { analysisWarning } from "../../domain/analysis/analysis-issue.js";
import type { AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import type { DesignSystemAnalysis } from "../../domain/analysis/design-system-analysis.js";
import {
  FOUNDATION_CATEGORIES,
  type FoundationCategoryId,
} from "../../domain/foundations/foundation-category.js";
import { computeCategoryState } from "../../domain/foundations/category-state.js";
import { FOUNDATION_ISSUE_CODES, type FoundationIssue } from "../../domain/foundations/foundation-issue.js";
import type { FoundationLevelResolution } from "../../domain/foundations/foundation-level.js";
import { foundationTypeCompatibility } from "../../domain/foundations/foundation-type-compatibility.js";
import type {
  FoundationCategoryInspection,
  FoundationsInspection,
  FoundationTokenInspection,
} from "./foundations-ports.js";
import type { FoundationMetadataProjection } from "./metadata-pass.js";
import { projectFoundationToken } from "./project-foundation-token.js";
import { validateFoundationDependencies } from "./validate-dependencies.js";
import {
  computeFoundationLevelCounts,
  computeFoundationsSummary,
  computeFoundationsValidation,
} from "./summary.js";

const FALLBACK_LEVEL: FoundationLevelResolution = Object.freeze({
  level: "unclassified",
  source: "none",
  sourcePath: null,
  valid: true,
});

const REUSED_ANALYSIS_CODES: ReadonlySet<string> = new Set([
  "alias-missing",
  "alias-to-group",
  "alias-cyclic",
  "alias-malformed",
  "alias-too-long",
  "dtcg-type-not-deeply-inspected",
]);

const CATEGORY_INVALID_WARNING_CODES: ReadonlySet<string> = new Set([
  FOUNDATION_ISSUE_CODES.typeMismatch,
]);

function tokenIssueKey(issue: FoundationIssue): string {
  return `${issue.severity}\u0000${issue.code}\u0000${issue.document ?? ""}\u0000${issue.path ?? ""}`;
}

function uniqueIssues(issues: readonly FoundationIssue[]): readonly FoundationIssue[] {
  const seen = new Set<string>();
  const unique: FoundationIssue[] = [];
  for (const issue of issues) {
    const key = tokenIssueKey(issue);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(issue);
    }
  }
  return unique;
}

function reusedFoundationIssue(issue: AnalysisIssue): boolean {
  return issue.document === "tokens" && REUSED_ANALYSIS_CODES.has(issue.code);
}

function issueBelongsToCategory(issue: FoundationIssue, category: FoundationCategoryId): boolean {
  if (issue.path === undefined) return false;
  return issue.path === category || issue.path.startsWith(`${category}.`);
}

function tokenIssues(tokens: readonly FoundationTokenInspection[]): readonly FoundationIssue[] {
  const issues: FoundationIssue[] = [];
  for (const token of tokens) {
    if (token.level === "unclassified" && token.levelSource === "none") {
      issues.push(analysisWarning(
        FOUNDATION_ISSUE_CODES.tokenUnclassified,
        `Token foundation sin clasificación en "${token.path}".`,
        { document: "tokens", path: token.path },
      ));
    }
    if (token.category === "unresolved") {
      issues.push(analysisWarning(
        FOUNDATION_ISSUE_CODES.categoryUnresolved,
        `Token foundation con categoría no resuelta en "${token.path}".`,
        { document: "tokens", path: token.path },
      ));
      continue;
    }
    if (foundationTypeCompatibility(token.category, token.effectiveType) === "mismatch") {
      issues.push(analysisWarning(
        FOUNDATION_ISSUE_CODES.typeMismatch,
        `Token foundation "${token.path}" tiene un tipo incompatible con la categoría "${token.category}".`,
        { document: "tokens", path: token.path },
      ));
    }
  }
  return issues;
}

function isCategoryInvalid(issues: readonly FoundationIssue[]): boolean {
  return issues.some(
    (issue) => issue.severity === "error" || CATEGORY_INVALID_WARNING_CODES.has(issue.code),
  );
}

function isCategoryPartial(
  tokens: readonly FoundationTokenInspection[],
  issues: readonly FoundationIssue[],
  analysis: DesignSystemAnalysis,
): boolean {
  return (
    analysis.limits.partial ||
    tokens.some((token) => token.level === "unclassified") ||
    issues.some((issue) => issue.code === "dtcg-type-not-deeply-inspected")
  );
}

export function projectFoundations(
  analysis: DesignSystemAnalysis,
  metadata: FoundationMetadataProjection,
): FoundationsInspection {
  const tokens = analysis.nodes.map((node) => {
    const resolution = metadata.levels.get(node.path) ?? FALLBACK_LEVEL;
    return projectFoundationToken(node, resolution);
  });

  const inheritedIssues = [
    ...analysis.errors.filter(reusedFoundationIssue),
    ...analysis.warnings.filter(reusedFoundationIssue),
  ];
  const ownIssues = tokenIssues(tokens);
  const dependencyIssues = validateFoundationDependencies(tokens);
  const allIssues = uniqueIssues([
    ...inheritedIssues,
    ...metadata.issues,
    ...ownIssues,
    ...dependencyIssues,
  ]);

  const unresolved = tokens.filter((token) => token.category === "unresolved");
  const categories: FoundationCategoryInspection[] = FOUNDATION_CATEGORIES.map((definition) => {
    const categoryTokens = tokens.filter((token) => token.category === definition.id);
    const categoryIssues = allIssues.filter((issue) => issueBelongsToCategory(issue, definition.id));
    const state = computeCategoryState({
      tokenCount: categoryTokens.length,
      invalid: isCategoryInvalid(categoryIssues),
      partial: isCategoryPartial(categoryTokens, categoryIssues, analysis),
    });
    return {
      id: definition.id,
      definition,
      state,
      validationDepth: definition.validationDepth,
      counts: computeFoundationLevelCounts(categoryTokens),
      tokens: categoryTokens,
      issues: categoryIssues,
    };
  });

  const summary = computeFoundationsSummary(categories, unresolved, allIssues);
  return {
    host: analysis.host,
    structuralState: analysis.structuralState,
    categories,
    unresolved,
    summary,
    validation: computeFoundationsValidation(allIssues, analysis.limits),
    limits: analysis.limits,
  };
}
