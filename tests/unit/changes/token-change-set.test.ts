import { describe, expect, it } from "vitest";
import { applicationPlan, applicationSummary, tokenChangeSet } from "../../../src/domain/changes/index.js";
import type { TokenChange } from "../../../src/domain/changes/index.js";

const baseChange: TokenChange = {
  path: "color.gray.100",
  nodeKind: "token",
  category: "color",
  level: "primitive",
  operation: "create",
  reason: "path-absent",
  blocksWrite: false,
  conflict: null,
  proposedToken: { $value: "#fff" },
};

describe("source-agnostic token change model", () => {
  it("contains no preset metadata, catalog, CLI, reporter, JSON, or importer evidence fields", () => {
    expect(Object.keys(baseChange).sort()).toEqual([
      "blocksWrite",
      "category",
      "conflict",
      "level",
      "nodeKind",
      "operation",
      "path",
      "proposedToken",
      "reason",
    ]);
  });

  it("copies change arrays into an immutable public surface", () => {
    const input = [baseChange];
    const set = tokenChangeSet(input);
    input.push({ ...baseChange, path: "spacing.1", category: "spacing" });
    expect(set.changes).toHaveLength(1);
  });

  it("derives summary and writable plan from generic changes", () => {
    const conflict: TokenChange = {
      ...baseChange,
      operation: "conflict",
      blocksWrite: true,
      conflict: {
        code: "source-value-differs",
        path: "color.gray.100",
        severity: "error",
        message: "Value differs.",
        blocksWrite: true,
        proposedAction: "Keep host token.",
      },
    };
    expect(applicationSummary([baseChange])).toMatchObject({ create: 1, total: 1, wouldWrite: true });
    const plan = applicationPlan([baseChange, conflict], [conflict.conflict]);
    expect(plan.writable).toBe(false);
    expect(plan.summary.blockingConflicts).toBe(1);
  });
});
