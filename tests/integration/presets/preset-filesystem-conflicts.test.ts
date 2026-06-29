// T100 (005) — Conflictos contra el filesystem real: value/type/level mismatch, token-vs-group,
// group-vs-token, descripción distinta como `skip` no bloqueante, y conservación de creates seguros en
// un plan bloqueado. Plan read-only; un conflicto bloqueante deja el plan no escribible.
import { afterEach, describe, expect, it } from "vitest";
import { planPresetApplication } from "../../../src/application/presets/plan-preset-application.js";
import { makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { fixtureCatalogUrl, presetId, realPlanDeps } from "./preset-e2e-harness.js";

const NS = "ar.neuraz.design-system-manager";
const prim = { [NS]: { foundation: { level: "primitive" } } };
const f5f5f5 = { colorSpace: "srgb", components: [0.961, 0.961, 0.961], alpha: 1, hex: "#f5f5f5" };
const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

async function changeAt(id: string, tokens: Record<string, unknown>, path: string, catalogUrl?: URL) {
  const dir = await makeProject(bag, { tokens });
  const r = await planPresetApplication({ id: presetId(id), executionDir: dir }, realPlanDeps(catalogUrl));
  return { r, change: r.outcome === "conflict" || r.outcome === "success" || r.outcome === "unchanged" ? r.plan?.plan.changeSet.changes.find((c) => c.path === path) : undefined };
}

describe("preset filesystem conflicts (T100)", () => {
  it("value mismatch → preset-value-differs (blocking)", async () => {
    const { r, change } = await changeAt("neutral-base", { color: { gray: { "100": { $type: "color", $extensions: prim, $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 1, hex: "#000000" } } } } }, "color.gray.100");
    expect(r.outcome).toBe("conflict");
    expect(change?.conflict?.code).toBe("preset-value-differs");
  });

  it("type mismatch → preset-type-differs", async () => {
    const { change } = await changeAt("neutral-base", { color: { gray: { "100": { $type: "dimension", $extensions: prim, $value: f5f5f5 } } } }, "color.gray.100");
    expect(change?.conflict?.code).toBe("preset-type-differs");
  });

  it("foundation level mismatch → preset-level-differs", async () => {
    const { change } = await changeAt("neutral-base", { color: { gray: { "100": { $type: "color", $extensions: { [NS]: { foundation: { level: "semantic" } } }, $value: f5f5f5 } } } }, "color.gray.100");
    expect(change?.conflict?.code).toBe("preset-level-differs");
  });

  it("token where a group is required → preset-token-vs-group", async () => {
    // host: color.gray.100 is a GROUP (has a child, no $value); preset needs a token there.
    const { change } = await changeAt("neutral-base", { color: { gray: { "100": { inner: { $type: "color", $value: f5f5f5 } } } } }, "color.gray.100");
    expect(change?.conflict?.code).toBe("preset-token-vs-group");
  });

  it("group where a token exists → preset-group-vs-token", async () => {
    // host: color.gray is a TOKEN; preset needs color.gray as a group.
    const { change } = await changeAt("neutral-base", { color: { gray: { $type: "color", $value: f5f5f5 } } }, "color.gray");
    expect(change?.conflict?.code).toBe("preset-group-vs-token");
  });

  it("different description → non-blocking skip (writable stays true)", async () => {
    const host = { spacing: { "100": { $type: "dimension", $extensions: prim, $description: "Host wording.", $value: { value: 4, unit: "px" } } } };
    const { r, change } = await changeAt("described", host, "spacing.100", fixtureCatalogUrl("./fixtures/described-catalog/"));
    expect(change?.operation).toBe("skip");
    expect(change?.reason).toBe("preset-description-differs");
    expect(r.outcome === "unchanged" || (r.outcome !== "not-found" && r.plan?.plan.writable === true)).toBe(true);
  });

  it("blocked plan still preserves the safe creates for preview", async () => {
    const { r } = await changeAt("neutral-base", { color: { gray: { "100": { $type: "color", $extensions: prim, $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 1, hex: "#000000" } } } } }, "color.gray.100");
    expect(r.outcome).toBe("conflict");
    if (r.outcome === "conflict") {
      expect(r.plan.plan.writable).toBe(false);
      expect(r.plan.plan.summary.create).toBeGreaterThan(0);
    }
  });
});
