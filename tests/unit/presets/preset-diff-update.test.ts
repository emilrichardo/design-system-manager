// T043 (005) — Diff: `update` limitado a completar un `$description` ausente en un token equivalente.
import { describe, expect, it } from "vitest";
import { planPresetDiff } from "../../../src/application/presets/plan-preset-diff.js";
import type { ManagedNode } from "../../../src/domain/changes/equivalence.js";

const tok = (over: Partial<ManagedNode> = {}): ManagedNode => ({
  path: "spacing.100",
  nodeKind: "token",
  category: "spacing",
  value: { value: 4, unit: "px" },
  aliasTarget: null,
  effectiveType: "dimension",
  level: "primitive",
  description: null,
  ...over,
});

function single(candidate: ManagedNode, host: ManagedNode) {
  const r = planPresetDiff({ candidates: [candidate], host: new Map([[host.path, host]]) });
  return r.plan.changeSet.changes[0];
}

describe("preset diff update (T043)", () => {
  it("completes a missing $description (host none, preset some) → update", () => {
    const change = single(tok({ description: "Base gap" }), tok({ description: null }));
    expect(change?.operation).toBe("update");
    expect(change?.proposedToken).toEqual({ $description: "Base gap" });
  });

  it("same description → unchanged", () => {
    expect(single(tok({ description: "x" }), tok({ description: "x" }))?.operation).toBe("unchanged");
  });

  it("preset without description (host has one) → unchanged (preserve)", () => {
    expect(single(tok({ description: null }), tok({ description: "kept" }))?.operation).toBe("unchanged");
  });

  it("different description (managed fields equal) → skip, not update", () => {
    const change = single(tok({ description: "new" }), tok({ description: "old" }));
    expect(change?.operation).toBe("skip");
  });

  it("never produces update when a managed field differs (value diff wins → conflict)", () => {
    const change = single(
      tok({ description: "Base gap" }),
      tok({ description: null, value: { value: 8, unit: "px" } }),
    );
    expect(change?.operation).toBe("conflict");
    expect(change?.conflict?.code).toBe("preset-value-differs");
  });

  it("an update change only ever proposes $description", () => {
    const change = single(tok({ description: "Base gap" }), tok({ description: null }));
    expect(Object.keys(change?.proposedToken ?? {})).toEqual(["$description"]);
  });
});
