// T034 (004) - Mapper puro FoundationsResult -> envelope JSON foundations v1. No reutiliza DTOs ni
// mappers JSON de 003 y no aplica cotas de presentacion.
import type { AnalysisHost } from "../../../domain/analysis/design-system-analysis.js";
import type { AnalysisLimitsResult } from "../../../domain/traversal/limits.js";
import type { FoundationCategoryInspection, FoundationsResult, FoundationTokenInspection } from "../foundations-ports.js";
import { FOUNDATIONS_JSON_FORMAT_VERSION } from "./format-version.js";
import type {
  FoundationsJsonEnvelopeV1,
  JsonFoundationCategoryV1,
  JsonFoundationIssueV1,
  JsonFoundationTokenV1,
  JsonFoundationValidationDepthV1,
  JsonFoundationsHostV1,
  JsonFoundationsLimitsV1,
  JsonFoundationsResultV1,
} from "./dto.js";
import type { FoundationIssue } from "../../../domain/foundations/foundation-issue.js";

function toJsonHost(host: AnalysisHost | null): JsonFoundationsHostV1 | null {
  if (host === null) return null;
  return { root: host.root, designSystemPath: host.designSystemPath };
}

function toJsonLimits(limits: AnalysisLimitsResult): JsonFoundationsLimitsV1 {
  return {
    reached: limits.reached,
    partial: limits.partial,
    hits: limits.hits.map((hit) => ({ limit: hit.limit, detail: hit.detail })),
  };
}

function toJsonValidationDepth(depth: FoundationCategoryInspection["validationDepth"]): JsonFoundationValidationDepthV1 {
  return depth === "deep" ? "deep" : "shallow";
}

function toJsonFoundationIssue(issue: FoundationIssue): JsonFoundationIssueV1 {
  return {
    severity: issue.severity,
    code: issue.code,
    message: issue.message,
    document: issue.document ?? null,
    path: issue.path ?? null,
  };
}

function toJsonFoundationToken(token: FoundationTokenInspection): JsonFoundationTokenV1 {
  return {
    path: token.path,
    category: token.category,
    level: token.level,
    levelSource: token.levelSource,
    levelSourcePath: token.levelSourcePath,
    effectiveType: token.effectiveType,
    kind: token.kind,
    aliasTarget: token.aliasTarget,
    aliasState: token.aliasState,
    trust: token.trust,
  };
}

function toJsonFoundationCategory(category: FoundationCategoryInspection): JsonFoundationCategoryV1 {
  return {
    id: category.id,
    state: category.state,
    validationDepth: toJsonValidationDepth(category.validationDepth),
    counts: {
      total: category.counts.total,
      primitive: category.counts.primitive,
      semantic: category.counts.semantic,
      unclassified: category.counts.unclassified,
    },
    tokens: category.tokens.map(toJsonFoundationToken),
    issues: category.issues.map(toJsonFoundationIssue),
  };
}

function toJsonFoundationsResult(
  result: Exclude<FoundationsResult, { outcome: "not-found" }>,
): JsonFoundationsResultV1 {
  const { inspection } = result;
  return {
    host: toJsonHost(result.host),
    structuralState: inspection.structuralState,
    categories: inspection.categories
      .map(toJsonFoundationCategory)
      .sort((a, b) => {
        const left = inspection.categories.find((category) => category.id === a.id)?.definition.displayOrder ?? 0;
        const right = inspection.categories.find((category) => category.id === b.id)?.definition.displayOrder ?? 0;
        return left - right;
      }),
    unresolved: inspection.unresolved.map(toJsonFoundationToken),
    summary: {
      categories: {
        absent: inspection.summary.categories.absent,
        partial: inspection.summary.categories.partial,
        complete: inspection.summary.categories.complete,
        invalid: inspection.summary.categories.invalid,
      },
      tokens: {
        total: inspection.summary.tokens.total,
        primitive: inspection.summary.tokens.primitive,
        semantic: inspection.summary.tokens.semantic,
        unclassified: inspection.summary.tokens.unclassified,
        unresolved: inspection.summary.tokens.unresolved,
      },
      errors: inspection.summary.errors,
      warnings: inspection.summary.warnings,
    },
    validation: {
      valid: inspection.validation.valid,
      errors: inspection.validation.errors.map(toJsonFoundationIssue),
      warnings: inspection.validation.warnings.map(toJsonFoundationIssue),
      limits: toJsonLimits(inspection.validation.limits),
    },
    limits: toJsonLimits(inspection.limits),
  };
}

export function toFoundationsJsonEnvelope(result: FoundationsResult): FoundationsJsonEnvelopeV1 {
  switch (result.outcome) {
    case "valid":
    case "complete-invalid":
    case "partial":
    case "read-error":
      return {
        formatVersion: FOUNDATIONS_JSON_FORMAT_VERSION,
        command: "foundations",
        outcome: result.outcome,
        result: toJsonFoundationsResult(result),
      };
    case "not-found":
      return {
        formatVersion: FOUNDATIONS_JSON_FORMAT_VERSION,
        command: "foundations",
        outcome: "not-found",
        result: null,
        error: null,
      };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
