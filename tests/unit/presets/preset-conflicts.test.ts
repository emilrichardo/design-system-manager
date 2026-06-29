// T045 (005) — Conflictos: códigos estables del contrato (factory) + conflictos producidos por el diff.
import { describe, expect, it } from "vitest";
import {
  PRESET_CONFLICT_CODES,
  presetConflict,
  presetConflictBlocksWrite,
} from "../../../src/domain/presets/preset-conflict.js";
import type { PresetConflictCode } from "../../../src/domain/presets/preset-conflict.js";
import { planPresetDiff } from "../../../src/application/presets/plan-preset-diff.js";
import type { ManagedNode } from "../../../src/domain/changes/equivalence.js";

const ALL_CODES = Object.values(PRESET_CONFLICT_CODES) as readonly PresetConflictCode[];

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
const grp = (path: string): ManagedNode => ({ ...tok({ path }), nodeKind: "group", value: null, effectiveType: null, level: "unclassified" });

function diffCode(candidate: ManagedNode, host: ManagedNode): string | undefined {
  const r = planPresetDiff({ candidates: [candidate], host: new Map([[host.path, host]]) });
  return r.plan.conflicts[0]?.code;
}

describe("preset conflict factory (T045)", () => {
  it("builds all 15 contract codes with required fields", () => {
    expect(ALL_CODES).toHaveLength(15);
    for (const code of ALL_CODES) {
      const c = presetConflict(code, "color.x");
      expect(c.code).toBe(code);
      expect(c.path).toBe("color.x");
      expect(c.message.length).toBeGreaterThan(0);
      expect(c.proposedAction.length).toBeGreaterThan(0);
      expect(["error", "warning"]).toContain(c.severity);
    }
  });

  it("only preset-description-differs is non-blocking; the rest block and are errors", () => {
    for (const code of ALL_CODES) {
      const blocks = presetConflictBlocksWrite(code);
      expect(blocks).toBe(code !== "preset-description-differs");
      expect(presetConflict(code, null).severity).toBe(blocks ? "error" : "warning");
    }
  });

  it("messages and actions are safe (no fs paths, env, stack, Error)", () => {
    for (const code of ALL_CODES) {
      const c = presetConflict(code, "color.x");
      for (const text of [c.message, c.proposedAction]) {
        expect(text).not.toMatch(/\/(Users|home|tmp|var)\//);
        expect(text.toLowerCase()).not.toContain("error:");
        expect(text).not.toContain("$value");
      }
    }
  });
});

describe("diff-produced conflicts (T045)", () => {
  it("value mismatch → preset-value-differs", () => {
    expect(diffCode(tok(), tok({ value: { value: 8, unit: "px" } }))).toBe("preset-value-differs");
  });
  it("type mismatch → preset-type-differs", () => {
    expect(diffCode(tok(), tok({ effectiveType: "number" }))).toBe("preset-type-differs");
  });
  it("alias mismatch → preset-alias-differs", () => {
    expect(diffCode(tok({ aliasTarget: "spacing.base" }), tok({ aliasTarget: "spacing.other" }))).toBe("preset-alias-differs");
  });
  it("foundation level mismatch → preset-level-differs", () => {
    expect(diffCode(tok(), tok({ level: "semantic" }))).toBe("preset-level-differs");
  });
  it("token vs existing group → preset-token-vs-group", () => {
    expect(diffCode(tok({ path: "spacing.100" }), grp("spacing.100"))).toBe("preset-token-vs-group");
  });
  it("group vs existing token → preset-group-vs-token", () => {
    expect(diffCode(grp("spacing.100"), tok({ path: "spacing.100" }))).toBe("preset-group-vs-token");
  });
  it("any blocking conflict makes the plan non-writable", () => {
    const r = planPresetDiff({ candidates: [tok()], host: new Map([["spacing.100", tok({ value: { value: 8, unit: "px" } })]]) });
    expect(r.plan.writable).toBe(false);
    expect(r.plan.summary.blockingConflicts).toBe(1);
  });
});
