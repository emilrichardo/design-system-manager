// T033 (004) - DTO publicos del contrato JSON foundations v1. Contrato aislado de 003:
// no extiende JsonEnvelopeV1/JsonCommand/JSON_FORMAT_VERSION.
import type { Severity } from "../../../domain/analysis/analysis-issue.js";
import type { StructuralState } from "../../../domain/analysis/structural-state.js";
import type { AliasState, NodeKind, NodeTrust } from "../../../domain/analysis/token-node-summary.js";
import type { FoundationCategoryState } from "../../../domain/foundations/category-state.js";
import type { FoundationLevel, FoundationLevelSource } from "../../../domain/foundations/foundation-level.js";
import type { FoundationsJsonFormatVersion } from "./format-version.js";

export type FoundationsJsonCommand = "foundations";
export type FoundationsJsonExpectedOutcome =
  | "valid"
  | "complete-invalid"
  | "partial"
  | "not-found"
  | "read-error";
export type FoundationsJsonInternalOutcome = "internal-error";
export type JsonFoundationValidationDepthV1 = "deep" | "shallow";

export interface JsonFoundationIssueV1 {
  readonly severity: Severity;
  readonly code: string;
  readonly message: string;
  readonly document: string | null;
  readonly path: string | null;
}

export interface JsonFoundationTokenV1 {
  readonly path: string;
  readonly category: string;
  readonly level: FoundationLevel;
  readonly levelSource: FoundationLevelSource;
  readonly levelSourcePath: string | null;
  readonly effectiveType: string | null;
  readonly kind: NodeKind;
  readonly aliasTarget: string | null;
  readonly aliasState: AliasState;
  readonly trust: NodeTrust;
}

export interface JsonFoundationLevelCountsV1 {
  readonly total: number;
  readonly primitive: number;
  readonly semantic: number;
  readonly unclassified: number;
}

export interface JsonFoundationCategoryV1 {
  readonly id: string;
  readonly state: FoundationCategoryState;
  readonly validationDepth: JsonFoundationValidationDepthV1;
  readonly counts: JsonFoundationLevelCountsV1;
  readonly tokens: readonly JsonFoundationTokenV1[];
  readonly issues: readonly JsonFoundationIssueV1[];
}

export interface JsonFoundationsHostV1 {
  readonly root: string;
  readonly designSystemPath: string | null;
}

export interface JsonFoundationsLimitHitV1 {
  readonly limit: string;
  readonly detail: string;
}

export interface JsonFoundationsLimitsV1 {
  readonly reached: boolean;
  readonly partial: boolean;
  readonly hits: readonly JsonFoundationsLimitHitV1[];
}

export interface JsonFoundationsSummaryV1 {
  readonly categories: {
    readonly absent: number;
    readonly partial: number;
    readonly complete: number;
    readonly invalid: number;
  };
  readonly tokens: {
    readonly total: number;
    readonly primitive: number;
    readonly semantic: number;
    readonly unclassified: number;
    readonly unresolved: number;
  };
  readonly errors: number;
  readonly warnings: number;
}

export interface JsonFoundationsValidationV1 {
  readonly valid: boolean;
  readonly errors: readonly JsonFoundationIssueV1[];
  readonly warnings: readonly JsonFoundationIssueV1[];
  readonly limits: JsonFoundationsLimitsV1;
}

export interface JsonFoundationsResultV1 {
  readonly host: JsonFoundationsHostV1 | null;
  readonly structuralState: StructuralState;
  readonly categories: readonly JsonFoundationCategoryV1[];
  readonly unresolved: readonly JsonFoundationTokenV1[];
  readonly summary: JsonFoundationsSummaryV1;
  readonly validation: JsonFoundationsValidationV1;
  readonly limits: JsonFoundationsLimitsV1;
}

export interface JsonFoundationsErrorV1 {
  readonly code: string;
  readonly message: string;
}

export type FoundationsJsonEnvelopeV1 =
  | {
      readonly formatVersion: FoundationsJsonFormatVersion;
      readonly command: FoundationsJsonCommand;
      readonly outcome: "valid" | "complete-invalid" | "partial" | "read-error";
      readonly result: JsonFoundationsResultV1;
    }
  | {
      readonly formatVersion: FoundationsJsonFormatVersion;
      readonly command: FoundationsJsonCommand;
      readonly outcome: "not-found";
      readonly result: null;
      readonly error: JsonFoundationsErrorV1 | null;
    }
  | {
      readonly formatVersion: FoundationsJsonFormatVersion;
      readonly command: FoundationsJsonCommand;
      readonly outcome: FoundationsJsonInternalOutcome;
      readonly result: null;
      readonly error: { readonly code: "internal-cli-error"; readonly message: string };
    };
