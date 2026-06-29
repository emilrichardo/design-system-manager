import type { ApplicationConflict } from "../../domain/changes/application-conflict.js";
import type { TokenChange } from "../../domain/changes/token-change.js";
import { presetConflict } from "../../domain/presets/preset-conflict.js";
import type { AnalyzePresetTokens } from "./preset-ports.js";
import { readLogicalPath } from "./preserve-host-document.js";

export interface PresetWriteVerification {
  readonly checked: boolean;
  readonly valid: boolean;
  readonly contributedTokensPresent: boolean;
  readonly newStructuralErrors: readonly ApplicationConflict[];
}

export interface VerifyPresetCandidateInput {
  readonly candidateDocument: unknown;
  readonly intendedChanges: readonly TokenChange[];
  readonly analyzeTokens: AnalyzePresetTokens;
}

export function verifyPresetCandidate(input: VerifyPresetCandidateInput): PresetWriteVerification {
  const analysis = input.analyzeTokens(input.candidateDocument);
  const structural = [
    ...analysis.errors.map((issue) => presetConflict("preset-foundation-metadata-invalid", issue.path ?? null)),
    ...analysis.foundationIssues.map((issue) => presetConflict("preset-foundation-metadata-invalid", issue.path ?? null)),
  ];
  const contributedTokensPresent = input.intendedChanges
    .filter((change) => change.nodeKind === "token" && (change.operation === "create" || change.operation === "update"))
    .every((change) => readLogicalPath(input.candidateDocument as Record<string, unknown>, change.path) !== undefined);

  return {
    checked: true,
    valid: structural.length === 0 && contributedTokensPresent,
    contributedTokensPresent,
    newStructuralErrors: structural,
  };
}
