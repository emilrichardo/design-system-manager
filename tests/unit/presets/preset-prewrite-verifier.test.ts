import { describe, expect, it } from "vitest";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";
import { verifyPresetCandidate } from "../../../src/application/presets/verify-preset-candidate.js";
import { change, plan } from "./preset-candidate-test-utils.js";
import { presetAnalysis } from "./preset-verifier-test-utils.js";

describe("verifyPresetCandidate", () => {
  it("validates candidate in memory and confirms intended tokens are present", () => {
    const intended = plan([change("color.brand", { proposedToken: { $value: "#fff", $type: "color" } })]).changeSet.changes;
    const result = verifyPresetCandidate({
      candidateDocument: { color: { brand: { $value: "#fff", $type: "color" } } },
      intendedChanges: intended,
      analyzeTokens: () => presetAnalysis(),
    });

    expect(result).toEqual({ checked: true, valid: true, contributedTokensPresent: true, newStructuralErrors: [] });
  });

  it("blocks invalid candidate before rename", () => {
    const intended = plan([change("color.missing", { proposedToken: { $value: "#fff", $type: "color" } })]).changeSet.changes;
    const result = verifyPresetCandidate({
      candidateDocument: { color: {} },
      intendedChanges: intended,
      analyzeTokens: () => ({ ...presetAnalysis([]), errors: [analysisError("dtcg-invalid", "bad", { path: "color.bad" })] }),
    });

    expect(result.valid).toBe(false);
    expect(result.contributedTokensPresent).toBe(false);
    expect(result.newStructuralErrors[0]?.code).toBe("preset-foundation-metadata-invalid");
  });
});
