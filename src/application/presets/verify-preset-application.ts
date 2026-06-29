import type { ApplicationConflict } from "../../domain/changes/application-conflict.js";
import type { TokenChange } from "../../domain/changes/token-change.js";
import { presetConflict } from "../../domain/presets/preset-conflict.js";
import type { AnalyzeUseCase } from "../analysis-ports.js";

export interface VerifyPresetApplicationInput {
  readonly executionDir: string;
  readonly intendedChanges: readonly TokenChange[];
  readonly analyzeHost: AnalyzeUseCase;
}

export interface PresetPostWriteVerification {
  readonly checked: boolean;
  readonly valid: boolean;
  readonly contributedTokensPresent: boolean;
  readonly newStructuralErrors: readonly ApplicationConflict[];
}

export async function verifyPresetApplication(
  input: VerifyPresetApplicationInput,
): Promise<PresetPostWriteVerification> {
  const analysis = await input.analyzeHost({ executionDir: input.executionDir });
  const paths = new Set(analysis.nodes.map((node) => node.path));
  const intendedTokenPaths = input.intendedChanges
    .filter((change) => change.nodeKind === "token" && (change.operation === "create" || change.operation === "update"))
    .map((change) => change.path);
  const contributedTokensPresent = intendedTokenPaths.every((path) => paths.has(path));
  const structural = analysis.errors.map((issue) => presetConflict("preset-foundation-metadata-invalid", issue.path ?? null));

  return {
    checked: true,
    valid: structural.length === 0 && contributedTokensPresent,
    contributedTokensPresent,
    newStructuralErrors: structural,
  };
}
