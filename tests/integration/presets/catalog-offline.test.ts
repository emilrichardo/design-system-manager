// T024 (005) — list/inspect del catálogo funcionan offline, de forma determinista, sin red, sin
// variables de entorno y sin depender del cwd del host. Incluye fixtures con espacios/Unicode.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { ensureBuilt } from "../../helpers/run-binary.js";
import { loadBundledPresetCatalog } from "../../../src/infrastructure/presets/bundled-preset-catalog.js";
import { presetCatalogEntries } from "../../../src/application/presets/list-presets.js";
import { presetInspectionTokens } from "../../../src/application/presets/inspect-preset.js";
import { analyzePresetTokens } from "../../../src/infrastructure/presets/preset-token-analyzer.js";

const DIST_CATALOG = fileURLToPath(new URL("../../../dist/infrastructure/presets/bundled-preset-catalog.js", import.meta.url));
const cleanup: string[] = [];
afterAll(() => {
  for (const d of cleanup) rmSync(d, { recursive: true, force: true });
});

describe("catalog offline & deterministic (T024)", () => {
  it("loads the bundled catalog and projects list/inspect without writes", async () => {
    const r = await loadBundledPresetCatalog();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const env = r.envelopes.get("neutral-base" as never);
    expect(env).toBeDefined();
    if (!env) return;
    expect(presetCatalogEntries([env]).map((e) => e.id)).toEqual(["neutral-base"]);
    const tokens = presetInspectionTokens(env, analyzePresetTokens(env.tokens));
    expect(tokens.map((t) => t.path)).toEqual([
      "color.gray.100",
      "color.gray.900",
      "color.surface.default",
      "spacing.100",
      "spacing.200",
    ]);
    expect(tokens.find((t) => t.path === "color.surface.default")).toMatchObject({
      level: "semantic",
      category: "color",
      aliasTarget: "color.gray.100",
    });
  });

  it("is deterministic across repeated calls", async () => {
    const a = await loadBundledPresetCatalog();
    const b = await loadBundledPresetCatalog();
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.entries).toEqual(b.entries);
  });

  it("does not depend on environment variables", async () => {
    const saved = process.env.NEURAZ_PRESETS_DIR;
    process.env.NEURAZ_PRESETS_DIR = "/nonexistent/should/be/ignored";
    try {
      const r = await loadBundledPresetCatalog();
      expect(r.ok).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.NEURAZ_PRESETS_DIR;
      else process.env.NEURAZ_PRESETS_DIR = saved;
    }
  });

  it("resolves from a different working directory (import.meta.url based, not cwd)", () => {
    ensureBuilt();
    const otherCwd = mkdtempSync(join(tmpdir(), "neuraz-cwd-"));
    cleanup.push(otherCwd);
    const script = `import(${JSON.stringify(pathToFileURL(DIST_CATALOG).href)}).then(async (m) => { const r = await m.loadBundledPresetCatalog(); process.stdout.write(JSON.stringify({ ok: r.ok, ids: r.ok ? r.entries.map((e) => e.id) : [] })); });`;
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: otherCwd }).toString();
    expect(JSON.parse(out)).toEqual({ ok: true, ids: ["neutral-base", "web-complete", "commerce"] });
  });

  it("works from a base path containing spaces and Unicode", async () => {
    const root = mkdtempSync(join(tmpdir(), "neuraz-uni-"));
    cleanup.push(root);
    const dir = join(root, "présets dir ñ");
    mkdirSync(dir);
    writeFileSync(join(dir, "catalog.json"), JSON.stringify({ formatVersion: "1.0.0", presets: [{ id: "alpha", file: "alpha.preset.json" }] }));
    writeFileSync(
      join(dir, "alpha.preset.json"),
      JSON.stringify({ id: "alpha", name: "Alpha", description: "d", version: "1.0.0", includedCategories: ["spacing"], tokens: { spacing: { $type: "dimension", "100": { $value: { value: 4, unit: "px" } } } } }),
    );
    const base = new URL(`${pathToFileURL(dir).href}/`);
    const r = await loadBundledPresetCatalog({ baseUrl: base });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.entries.map((e) => e.id)).toEqual(["alpha"]);
  });
});
