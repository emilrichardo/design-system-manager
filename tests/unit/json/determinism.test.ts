import { describe, expect, it } from "vitest";
import type { InspectDesignSystemResult, ValidateDesignSystemResult } from "../../../src/application/analysis-ports.js";
import { toJsonInspectEnvelope } from "../../../src/application/json/map-inspect.js";
import { toJsonValidateEnvelope } from "../../../src/application/json/map-validate.js";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";
import type { DesignSystemInspection } from "../../../src/domain/analysis/design-system-inspection.js";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import { serializeJsonV1 } from "../../../src/infrastructure/reporter/json-serializer.js";
import { deepFreeze } from "./json-test-utils.js";

const issue = analysisError("dtcg-type-unrecognized", "tipo no reconocido", {
  document: "tokens",
  path: "color.bad",
  context: { raw: "secret" },
});

const report = validationReport({
  structuralState: "complete-invalid",
  checkedDocuments: ["neuraz-ds.config.json", "design-system/design-system.json", "design-system/tokens/base.tokens.json"],
  uncheckedDocuments: [],
  errors: [issue],
  warnings: [],
  limits: noLimitsReached,
  tokens: 2,
});

const node: TokenNodeSummary = {
  path: "color.bad",
  declaredType: "weird",
  effectiveType: "weird",
  typeOrigin: "own",
  typeSourcePath: null,
  kind: "concrete",
  aliasTarget: null,
  aliasState: "n/a",
  description: "d",
  depth: 2,
  trust: "untrusted",
};

describe("T033 — determinismo JSON", () => {
  it("validate: misma entrada congelada produce bytes identicos y no muta issues", () => {
    const result = deepFreeze<ValidateDesignSystemResult>({
      outcome: "complete-invalid",
      host: { root: "/repo", designSystemPath: "/repo/design-system" },
      report,
    });

    const first = serializeJsonV1(toJsonValidateEnvelope(result));
    const second = serializeJsonV1(toJsonValidateEnvelope(result));

    expect(second).toBe(first);
    expect(result.report.errors).toEqual([issue]);
    expect(first).not.toContain("context");
    expect(first).not.toContain("secret");
  });

  it("inspect: misma entrada congelada produce bytes identicos y no muta identity/statistics/paths", () => {
    const inspection: DesignSystemInspection = {
      host: { root: "/repo", designSystemPath: "/repo/design-system" },
      structuralState: "complete-invalid",
      identity: {
        name: { value: "Acme", trust: "recovered" },
        slug: { value: "acme", trust: "valid" },
        version: { value: "0.1.0", trust: "valid" },
      },
      schemaVersions: {
        config: { value: "0.1.0", trust: "valid" },
        manifest: { value: "0.1.0", trust: "valid" },
        formatVersion: { value: "2025.10", trust: "valid" },
      },
      files: {
        expected: ["neuraz-ds.config.json", "design-system/design-system.json", "design-system/tokens/base.tokens.json"],
        present: [{ relativePath: "design-system/tokens/base.tokens.json", kind: "file", readable: true }],
        missing: [],
      },
      tokens: {
        total: 1,
        groups: 1,
        concreteValues: 1,
        aliases: 0,
        byType: { weird: 1 },
        maxDepth: 2,
        aliasIssues: 0,
        paths: [node],
      },
      validation: report,
      limits: noLimitsReached,
    };
    const result = deepFreeze<InspectDesignSystemResult>({
      outcome: "complete-invalid",
      host: { root: "/repo", designSystemPath: "/repo/design-system" },
      inspection,
    });

    const first = serializeJsonV1(toJsonInspectEnvelope(result));
    const second = serializeJsonV1(toJsonInspectEnvelope(result));

    expect(second).toBe(first);
    expect(result.inspection.identity?.name).toEqual({ value: "Acme", trust: "recovered" });
    expect(result.inspection.tokens?.byType).toEqual({ weird: 1 });
    expect(result.inspection.tokens?.paths).toEqual([node]);
  });
});
