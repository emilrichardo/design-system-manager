// T044 (005) — Diff: `unchanged` por equivalencia administrada (preservando contenido no gestionado) y
// `skip` para una `$description` existente incompatible cuando el resto de campos administrados coincide.
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

describe("preset diff unchanged & skip (T044)", () => {
  it("unchanged when the host token is managed-equivalent", () => {
    const r = planPresetDiff({ candidates: [tok()], host: new Map([["spacing.100", tok()]]) });
    expect(r.plan.changeSet.changes[0]?.operation).toBe("unchanged");
    expect(r.plan.writable).toBe(true);
    expect(r.plan.summary.unchanged).toBe(1);
  });

  it("unchanged even if the host value object has a different key order", () => {
    const host = tok({ value: { unit: "px", value: 4 } });
    const r = planPresetDiff({ candidates: [tok()], host: new Map([["spacing.100", host]]) });
    expect(r.plan.changeSet.changes[0]?.operation).toBe("unchanged");
  });

  it("skip (non-blocking) when an existing description differs and other managed fields match", () => {
    const r = planPresetDiff({
      candidates: [tok({ description: "new" })],
      host: new Map([["spacing.100", tok({ description: "old" })]]),
    });
    const change = r.plan.changeSet.changes[0];
    expect(change?.operation).toBe("skip");
    expect(change?.reason).toBe("preset-description-differs");
    expect(change?.blocksWrite).toBe(false);
    expect(r.plan.writable).toBe(true);
  });

  it("a partial preset only produces changes for its own paths (host-only paths untouched)", () => {
    const host = new Map<string, ManagedNode>([
      ["spacing.100", tok()],
      ["color.gray.100", tok({ path: "color.gray.100", category: "color", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0] } })],
    ]);
    const r = planPresetDiff({ candidates: [tok()], host });
    expect(r.plan.changeSet.changes.map((c) => c.path)).toEqual(["spacing.100"]);
    expect(r.plan.changeSet.changes.every((c) => c.operation !== "conflict")).toBe(true);
  });
});
