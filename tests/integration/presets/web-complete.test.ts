import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBoundAnalyze } from "../../../src/cli/composition.js";
import { applyPack } from "../../../src/application/presets/apply-pack.js";
import { applyPreset } from "../../../src/application/presets/apply-preset.js";
import { makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { presetId, realApplyDeps } from "./preset-e2e-harness.js";
import { issueCodes, runFoundationsJson } from "../foundations/foundations-test-helpers.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  for (const p of bag.splice(0)) await p.cleanup();
});

describe("web-complete preset (011 Checkpoint B)", () => {
  it("applies foundations plus placeholder brand documents and stays free of generic unresolved/unclassified issues", async () => {
    const dir = await makeProject(bag, { tokens: {} });

    const applied = await applyPreset({ id: presetId("web-complete"), executionDir: dir }, realApplyDeps());
    expect(applied.outcome).toBe("applied");
    expect(applied.wrote).toBe(true);

    const brandProfile = JSON.parse(await readFile(join(dir, "design-system/brand/brand.json"), "utf8")) as { status: string; name: string | null };
    expect(brandProfile).toMatchObject({ status: "placeholder", name: null });
    const voice = JSON.parse(await readFile(join(dir, "design-system/brand/voice-and-tone.json"), "utf8")) as { voicePrinciples: unknown[] };
    expect(voice.voicePrinciples).toEqual([]);

    const second = await applyPreset({ id: presetId("web-complete"), executionDir: dir }, realApplyDeps());
    expect(second.outcome).toBe("unchanged");

    const analysis = await createBoundAnalyze()({ executionDir: dir });
    const genericCodes = [...analysis.errors, ...analysis.warnings].map((issue) => issue.code);
    expect(genericCodes).not.toContain("alias-missing");
    expect(genericCodes).not.toContain("alias-to-group");
    expect(genericCodes).not.toContain("alias-cyclic");
    expect(genericCodes).not.toContain("dtcg-type-unrecognized");

    const foundations = await runFoundationsJson(dir);
    const foundationCodes = issueCodes(foundations.json);
    expect(foundationCodes).not.toContain("foundation-token-unclassified");
    expect(foundationCodes).not.toContain("foundation-category-unresolved");
  });

  it("applies the commerce pack add-only on top of web-complete", async () => {
    const dir = await makeProject(bag, { tokens: {} });

    expect((await applyPack({ id: presetId("commerce"), executionDir: dir }, realApplyDeps())).outcome).toBe("invalid-preset");

    const base = await applyPreset({ id: presetId("web-complete"), executionDir: dir }, realApplyDeps());
    expect(base.outcome).toBe("applied");

    const pack = await applyPack({ id: presetId("commerce"), executionDir: dir }, realApplyDeps());
    expect(pack.outcome).toBe("applied");

    const tokens = JSON.parse(await readFile(join(dir, "design-system/tokens/base.tokens.json"), "utf8")) as Record<string, any>;
    expect(tokens.color.commerce["discount-badge"].accent.$value.hex).toBe("#ca8a04");
    expect(tokens.shadow.commerce["product-card"].elevation.$value[0].blur).toEqual({ value: 12, unit: "px" });

    const second = await applyPack({ id: presetId("commerce"), executionDir: dir }, realApplyDeps());
    expect(second.outcome).toBe("unchanged");
  });
});
