// T035 (005) — El modelo genérico representa cambios DTCG de un origen arbitrario en memoria, sin
// ningún campo de preset/catálogo/CLI/JSON/importador, y con superficie inmutable.
import { describe, expect, it } from "vitest";
import { createTokenChangeSet } from "../../../src/domain/changes/token-change-set.js";
import { applicationPlan } from "../../../src/domain/changes/application-plan.js";
import type { TokenChange } from "../../../src/domain/changes/token-change.js";

const CANONICAL_KEYS = [
  "blocksWrite",
  "category",
  "conflict",
  "level",
  "nodeKind",
  "operation",
  "path",
  "proposedToken",
  "reason",
].sort();

const genericChange = (path: string): TokenChange => ({
  path,
  nodeKind: "token",
  category: "spacing",
  level: "primitive",
  operation: "create",
  reason: "source-candidate",
  blocksWrite: false,
  conflict: null,
  proposedToken: null,
});

describe("source-agnostic change model (T035)", () => {
  it("can be built from a generic in-memory source with no preset/origin metadata", () => {
    const r = createTokenChangeSet([genericChange("spacing.100"), genericChange("spacing.200")]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const change of r.changeSet.changes) {
      expect(Object.keys(change).sort()).toEqual(CANONICAL_KEYS);
      expect(change).not.toHaveProperty("presetId");
      expect(change).not.toHaveProperty("source");
      expect(change).not.toHaveProperty("confidence");
      expect(change).not.toHaveProperty("targetFile");
    }
  });

  it("does not retain a reference to the input array (defensive copy)", () => {
    const input = [genericChange("spacing.100")];
    const r = createTokenChangeSet(input);
    input.push(genericChange("spacing.200"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.changeSet.changes).toHaveLength(1);
  });

  it("derives a writable generic plan with no preset fields", () => {
    const plan = applicationPlan([genericChange("spacing.100")]);
    expect(plan.writable).toBe(true);
    expect(plan.summary.create).toBe(1);
    expect(plan).not.toHaveProperty("preset");
    expect(plan).not.toHaveProperty("targetFile");
    expect(plan).not.toHaveProperty("formatVersion");
  });

  it("paths are logical DTCG paths, never filesystem paths", () => {
    const r = createTokenChangeSet([genericChange("spacing.100")]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const change of r.changeSet.changes) {
        expect(change.path).not.toMatch(/[\\/]/);
        expect(change.path).not.toContain("base.tokens.json");
      }
    }
  });
});
