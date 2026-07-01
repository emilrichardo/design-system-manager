import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyPreset } from "../../../src/application/presets/apply-preset.js";
import { makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { presetId, realApplyDeps } from "./preset-e2e-harness.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  for (const p of bag.splice(0)) await p.cleanup();
});

describe("neutral-base regression after 011 Checkpoint B", () => {
  it("still applies exactly the same token payload and does not create brand documents", async () => {
    const dir = await makeProject(bag);

    const result = await applyPreset({ id: presetId("neutral-base"), executionDir: dir }, realApplyDeps());
    expect(result.outcome).toBe("applied");

    const tokens = JSON.parse(await readFile(join(dir, "design-system/tokens/base.tokens.json"), "utf8")) as Record<string, any>;
    expect(tokens.color.gray["100"].$value.hex).toBe("#f5f5f5");
    expect(tokens.color.surface.default.$value).toBe("{color.gray.100}");
    expect(tokens.spacing["200"].$value).toEqual({ value: 8, unit: "px" });

    await expect(readFile(join(dir, "design-system/brand/brand.json"), "utf8")).rejects.toBeTruthy();
  });
});
