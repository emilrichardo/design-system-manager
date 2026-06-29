// T051 (005) — Caso de uso headless `listPresets`: orden estable, catálogo inválido visible, sin host.
import { describe, expect, it, vi } from "vitest";
import { listPresets } from "../../../src/application/presets/list-presets.js";
import type { CatalogLoadOutcome, PresetCatalogPort } from "../../../src/application/presets/preset-ports.js";
import type { PresetCatalogEntry } from "../../../src/domain/presets/preset-envelope.js";
import type { PresetId } from "../../../src/domain/presets/preset-id.js";

const entry = (id: string): PresetCatalogEntry => ({
  id: id as PresetId,
  name: id,
  description: "d",
  version: "1.0.0" as never,
  includedCategories: ["color"],
});

function catalog(outcome: CatalogLoadOutcome): PresetCatalogPort {
  return {
    load: vi.fn(async () => outcome),
    list: vi.fn(async () => (outcome.ok ? outcome.entries : [])),
    get: vi.fn(async () => null),
  };
}

describe("listPresets (T051)", () => {
  it("returns success with the catalog entries in the loaded order", async () => {
    const r = await listPresets({ catalog: catalog({ ok: true, entries: [entry("gamma"), entry("alpha")] }) });
    expect(r.outcome).toBe("success");
    expect(r.presets.map((p) => p.id)).toEqual(["gamma", "alpha"]);
  });

  it("surfaces an invalid catalog as invalid-preset (never an empty list hiding the cause)", async () => {
    const r = await listPresets({ catalog: catalog({ ok: false, reason: "duplicate-id" }) });
    expect(r.outcome).toBe("invalid-preset");
    expect(r.presets).toEqual([]);
  });

  it("does not read the host (only catalog.load is used)", async () => {
    const cat = catalog({ ok: true, entries: [entry("alpha")] });
    await listPresets({ catalog: cat });
    expect(cat.load).toHaveBeenCalledTimes(1);
    expect(cat.get).not.toHaveBeenCalled();
  });

  it("is deterministic", async () => {
    const cat = catalog({ ok: true, entries: [entry("alpha"), entry("beta")] });
    expect(await listPresets({ catalog: cat })).toEqual(await listPresets({ catalog: cat }));
  });
});
