// T013 (005) — Catálogo empaquetado: forma, orden determinista, ids únicos, mismatch id↔envelope,
// asset ausente/corrupto, file inválido (traversal/absoluto/protocolo), sin exposición de paths
// absolutos, y datos inertes (no se ejecuta código). Fixtures aislados en tmpdir (no productivos).
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
  loadBundledPresetCatalog,
  createBundledPresetCatalog,
} from "../../../src/infrastructure/presets/bundled-preset-catalog.js";

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

function baseUrlFor(dir: string): URL {
  return new URL(`${pathToFileURL(dir).href}/`);
}

const VALID_ENVELOPE = (id: string, name = "X"): string =>
  JSON.stringify({
    id,
    name,
    description: "desc",
    version: "1.0.0",
    includedCategories: ["spacing"],
    tokens: { spacing: { $type: "dimension", "100": { $value: { value: 4, unit: "px" } } } },
  });

/** Crea un directorio de assets con `catalog.json` y los envelopes indicados. */
function makeCatalog(catalog: unknown, files: Record<string, string> = {}): URL {
  const dir = mkdtempSync(join(tmpdir(), "neuraz-cat-"));
  dirs.push(dir);
  writeFileSync(join(dir, "catalog.json"), typeof catalog === "string" ? catalog : JSON.stringify(catalog));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return baseUrlFor(dir);
}

describe("loadBundledPresetCatalog — productive bundled assets (T013)", () => {
  it("loads the real bundled catalog: ok, one entry, neutral-base", async () => {
    const r = await loadBundledPresetCatalog();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entries.map((e) => e.id)).toEqual(["neutral-base"]);
    expect(r.entries[0]?.includedCategories).toEqual(["color", "spacing"]);
    expect(r.envelopes.get("neutral-base" as never)?.name).toBe("Neutral Base");
  });

  it("is deterministic: repeated loads are deeply equal entries", async () => {
    const a = await loadBundledPresetCatalog();
    const b = await loadBundledPresetCatalog();
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.entries).toEqual(b.entries);
  });

  it("never exposes an absolute asset path in entries", async () => {
    const r = await loadBundledPresetCatalog();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.stringify(r.entries)).not.toMatch(/\/(Users|home|tmp|var|private)\//);
  });
});

describe("loadBundledPresetCatalog — order and shape (T013)", () => {
  it("preserves the declared catalog order (public list order)", async () => {
    const base = makeCatalog(
      { formatVersion: "1.0.0", presets: [{ id: "gamma", file: "gamma.preset.json" }, { id: "alpha", file: "alpha.preset.json" }] },
      { "gamma.preset.json": VALID_ENVELOPE("gamma"), "alpha.preset.json": VALID_ENVELOPE("alpha") },
    );
    const r = await loadBundledPresetCatalog({ baseUrl: base });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.entries.map((e) => e.id)).toEqual(["gamma", "alpha"]);
  });

  it("rejects an invalid catalog shape (wrong formatVersion / non-array presets)", async () => {
    const bad = await loadBundledPresetCatalog({ baseUrl: makeCatalog({ formatVersion: "2.0.0", presets: [] }) });
    expect(bad).toMatchObject({ ok: false, reason: "catalog-shape-invalid" });
    const bad2 = await loadBundledPresetCatalog({ baseUrl: makeCatalog({ formatVersion: "1.0.0", presets: {} }) });
    expect(bad2).toMatchObject({ ok: false, reason: "catalog-shape-invalid" });
  });

  it("rejects corrupt catalog JSON and missing catalog", async () => {
    const corrupt = await loadBundledPresetCatalog({ baseUrl: makeCatalog("{ not json") });
    expect(corrupt).toMatchObject({ ok: false, reason: "catalog-corrupt" });
    const empty = mkdtempSync(join(tmpdir(), "neuraz-cat-"));
    dirs.push(empty);
    const missing = await loadBundledPresetCatalog({ baseUrl: baseUrlFor(empty) });
    expect(missing).toMatchObject({ ok: false, reason: "catalog-missing" });
  });
});

describe("loadBundledPresetCatalog — id and asset integrity (T013)", () => {
  it("rejects duplicate ids without silently picking one", async () => {
    const base = makeCatalog(
      { formatVersion: "1.0.0", presets: [{ id: "alpha", file: "alpha.preset.json" }, { id: "alpha", file: "alpha.preset.json" }] },
      { "alpha.preset.json": VALID_ENVELOPE("alpha") },
    );
    expect(await loadBundledPresetCatalog({ baseUrl: base })).toMatchObject({ ok: false, reason: "duplicate-id" });
  });

  it("rejects an invalid preset id in the catalog", async () => {
    const base = makeCatalog(
      { formatVersion: "1.0.0", presets: [{ id: "Alpha", file: "a.preset.json" }] },
      { "a.preset.json": VALID_ENVELOPE("Alpha") },
    );
    expect(await loadBundledPresetCatalog({ baseUrl: base })).toMatchObject({ ok: false, reason: "invalid-id" });
  });

  it("rejects envelope id mismatch with the catalog id", async () => {
    const base = makeCatalog(
      { formatVersion: "1.0.0", presets: [{ id: "alpha", file: "m.preset.json" }] },
      { "m.preset.json": VALID_ENVELOPE("beta") },
    );
    expect(await loadBundledPresetCatalog({ baseUrl: base })).toMatchObject({ ok: false, reason: "id-mismatch" });
  });

  it("reports a missing referenced asset", async () => {
    const base = makeCatalog({ formatVersion: "1.0.0", presets: [{ id: "alpha", file: "ghost.preset.json" }] });
    expect(await loadBundledPresetCatalog({ baseUrl: base })).toMatchObject({ ok: false, reason: "asset-missing" });
  });

  it("reports a corrupt referenced asset and never executes it as code", async () => {
    const base = makeCatalog(
      { formatVersion: "1.0.0", presets: [{ id: "alpha", file: "evil.preset.json" }] },
      { "evil.preset.json": "module.exports = (() => { throw new Error('executed'); })()" },
    );
    expect(await loadBundledPresetCatalog({ baseUrl: base })).toMatchObject({ ok: false, reason: "asset-corrupt" });
  });
});

describe("loadBundledPresetCatalog — file path containment (T013)", () => {
  const cases: Record<string, string> = {
    traversal: "../escape.preset.json",
    "nested separator": "sub/alpha.preset.json",
    absolute: "/etc/passwd.preset.json",
    "url protocol": "https://example.com/a.preset.json",
    "file protocol": "file:///etc/passwd",
  };
  for (const [label, file] of Object.entries(cases)) {
    it(`rejects an unsafe file reference: ${label}`, async () => {
      const base = makeCatalog({ formatVersion: "1.0.0", presets: [{ id: "alpha", file }] });
      expect(await loadBundledPresetCatalog({ baseUrl: base })).toMatchObject({ ok: false, reason: "invalid-file" });
    });
  }

  it("does not expose the absolute base path in an invalid result message", async () => {
    const dir = mkdtempSync(join(tmpdir(), "neuraz-cat-"));
    dirs.push(dir);
    writeFileSync(join(dir, "catalog.json"), JSON.stringify({ formatVersion: "1.0.0", presets: [{ id: "alpha", file: "../x.json" }] }));
    const r = await loadBundledPresetCatalog({ baseUrl: baseUrlFor(dir) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).not.toContain(dir);
  });
});

describe("createBundledPresetCatalog — PresetCatalogPort adapter (T013)", () => {
  it("lists and gets from a valid fixture; unknown id is null", async () => {
    const base = makeCatalog(
      { formatVersion: "1.0.0", presets: [{ id: "alpha", file: "alpha.preset.json" }] },
      { "alpha.preset.json": VALID_ENVELOPE("alpha", "Alpha") },
    );
    const port = createBundledPresetCatalog({ baseUrl: base });
    expect((await port.list()).map((e) => e.id)).toEqual(["alpha"]);
    expect((await port.get("alpha" as never))?.name).toBe("Alpha");
    expect(await port.get("missing" as never)).toBeNull();
  });

  it("projects an invalid catalog as empty list / null get (no throw)", async () => {
    const base = makeCatalog({ formatVersion: "1.0.0", presets: [{ id: "alpha", file: "ghost.preset.json" }] });
    const port = createBundledPresetCatalog({ baseUrl: base });
    expect(await port.list()).toEqual([]);
    expect(await port.get("alpha" as never)).toBeNull();
  });
});
