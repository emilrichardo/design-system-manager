import { describe, expect, it } from "vitest";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";
import { verifyPresetApplication } from "../../../src/application/presets/verify-preset-application.js";
import { change, plan } from "./preset-candidate-test-utils.js";
import type { DesignSystemAnalysis } from "../../../src/domain/analysis/design-system-analysis.js";

const analysis = (paths: readonly string[], errors: DesignSystemAnalysis["errors"] = []): DesignSystemAnalysis => ({
  host: { root: "/repo", designSystemPath: "/repo/design-system" },
  presence: { present: [], missing: [] },
  structuralState: errors.length === 0 ? "complete-valid" : "complete-invalid",
  documents: {},
  nodes: paths.map((path) => ({
    path,
    declaredType: "color",
    effectiveType: "color",
    typeOrigin: "own",
    typeSourcePath: null,
    kind: "concrete",
    aliasTarget: null,
    aliasState: "n/a",
    description: null,
    depth: path.split(".").length,
    trust: "valid",
  })),
  statistics: { totalTokens: paths.length, totalGroups: 0, byType: { color: paths.length }, byTrust: { valid: paths.length, recovered: 0, untrusted: 0 } },
  errors,
  warnings: [],
  limits: { reached: false, hits: [], partial: false },
  valid: errors.length === 0,
});

describe("verifyPresetApplication", () => {
  it("rereads/reanalyzes host and confirms contributed token paths", async () => {
    const intended = plan([change("color.brand", { proposedToken: { $value: "#fff", $type: "color" } })]).changeSet.changes;
    const result = await verifyPresetApplication({ executionDir: "/repo", intendedChanges: intended, analyzeHost: async () => analysis(["color.brand"]) });

    expect(result.valid).toBe(true);
    expect(result.contributedTokensPresent).toBe(true);
  });

  it("reports post-write structural errors separately from pre-write analysis", async () => {
    const intended = plan([change("color.brand", { proposedToken: { $value: "#fff", $type: "color" } })]).changeSet.changes;
    const result = await verifyPresetApplication({
      executionDir: "/repo",
      intendedChanges: intended,
      analyzeHost: async () => analysis([], [analysisError("dtcg-invalid", "bad", { path: "color.bad" })]),
    });

    expect(result.valid).toBe(false);
    expect(result.contributedTokensPresent).toBe(false);
    expect(result.newStructuralErrors[0]?.code).toBe("preset-foundation-metadata-invalid");
  });
});
