// T050 (005) — El plan del diff es determinista (mismos inputs en distinto orden → plan igual), no muta
// las entradas, bloquea totalmente ante conflictos y conserva los cambios seguros para preview.
import { describe, expect, it } from "vitest";
import { planPresetDiff } from "../../../src/application/presets/plan-preset-diff.js";
import { appliedChanges } from "../../../src/domain/changes/application-plan.js";
import type { ManagedNode } from "../../../src/domain/changes/equivalence.js";
import { deepFreeze } from "../json/json-test-utils.js";

const tok = (path: string, over: Partial<ManagedNode> = {}): ManagedNode => ({
  path,
  nodeKind: "token",
  category: path.split(".")[0] as ManagedNode["category"],
  value: { value: 4, unit: "px" },
  aliasTarget: null,
  effectiveType: "dimension",
  level: "primitive",
  description: null,
  ...over,
});

describe("preset plan determinism & blocking (T050)", () => {
  it("produces a deeply-equal plan regardless of candidate input order", () => {
    const a = [tok("spacing.300"), tok("spacing.100"), tok("spacing.200")];
    const b = [tok("spacing.200"), tok("spacing.300"), tok("spacing.100")];
    const host = new Map<string, ManagedNode>();
    expect(planPresetDiff({ candidates: a, host })).toEqual(planPresetDiff({ candidates: b, host }));
  });

  it("orders the resulting changes canonically (paths ascending in tree order)", () => {
    const r = planPresetDiff({ candidates: [tok("spacing.300"), tok("spacing.100"), tok("spacing.200")], host: new Map() });
    expect(r.plan.changeSet.changes.map((c) => c.path)).toEqual(["spacing.100", "spacing.200", "spacing.300"]);
  });

  it("does not mutate frozen inputs", () => {
    const candidates = deepFreeze([tok("spacing.100")]);
    const host = new Map<string, ManagedNode>([["spacing.200", deepFreeze(tok("spacing.200"))]]);
    expect(() => planPresetDiff({ candidates, host })).not.toThrow();
  });

  it("blocks all writes on any blocking conflict and preserves safe changes for preview", () => {
    const candidates = [tok("spacing.100"), tok("spacing.200")];
    const host = new Map<string, ManagedNode>([["spacing.200", tok("spacing.200", { value: { value: 8, unit: "px" } })]]);
    const r = planPresetDiff({ candidates, host });
    expect(r.plan.writable).toBe(false);
    expect(r.plan.summary.create).toBe(1); // spacing.100 create preserved for preview
    expect(r.plan.summary.conflict).toBe(1); // spacing.200 conflict
    expect(appliedChanges(r.plan)).toEqual([]); // zero applied while blocked
  });

  it("applies safe changes only when writable", () => {
    const r = planPresetDiff({ candidates: [tok("spacing.100")], host: new Map() });
    expect(r.plan.writable).toBe(true);
    expect(appliedChanges(r.plan).map((c) => c.path)).toEqual(["spacing.100"]);
  });
});
