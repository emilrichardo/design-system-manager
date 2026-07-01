// T023 (005) — Resolución de assets del catálogo en desarrollo, `dist`, `npm pack --dry-run --json`,
// tarball real e instalado. Verifica que `presets/` se empaqueta y que `../../../presets/` resuelve
// desde el módulo compilado (misma profundidad en fuente y en dist).
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt } from "../../helpers/run-binary.js";
import { bundledPresetsBaseUrl } from "../../../src/infrastructure/presets/bundled-preset-catalog.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const DIST_CATALOG_JS = join(REPO_ROOT, "dist", "infrastructure", "presets", "bundled-preset-catalog.js");

function tarAvailable(): boolean {
  try {
    execFileSync("tar", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const HAS_TAR = tarAvailable();

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

beforeAll(() => {
  ensureBuilt();
}, 180000);

describe("preset asset resolution (T023)", () => {
  it("development: resolves package-relative assets from source module", () => {
    const base = bundledPresetsBaseUrl();
    expect(existsSync(fileURLToPath(new URL("catalog.json", base)))).toBe(true);
    expect(existsSync(fileURLToPath(new URL("neutral-base.preset.json", base)))).toBe(true);
    expect(existsSync(fileURLToPath(new URL("web-complete.preset.json", base)))).toBe(true);
    expect(existsSync(fileURLToPath(new URL("commerce.preset.json", base)))).toBe(true);
  });

  it("dist: the compiled catalog module resolves `../../../presets/` to the package assets", () => {
    expect(existsSync(DIST_CATALOG_JS)).toBe(true);
    const fromDist = new URL("../../../presets/catalog.json", pathToFileURL(DIST_CATALOG_JS));
    expect(existsSync(fileURLToPath(fromDist))).toBe(true);
    const envelope = new URL("../../../presets/neutral-base.preset.json", pathToFileURL(DIST_CATALOG_JS));
    expect(existsSync(fileURLToPath(envelope))).toBe(true);
    expect(existsSync(fileURLToPath(new URL("../../../presets/web-complete.preset.json", pathToFileURL(DIST_CATALOG_JS))))).toBe(true);
  });

  it("npm pack --dry-run: tarball includes presets assets and excludes sources/tests/specs", () => {
    const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: REPO_ROOT }).toString();
    const files: string[] = (JSON.parse(out)[0]?.files ?? []).map((f: { path: string }) => f.path);
    expect(files).toContain("presets/catalog.json");
    expect(files).toContain("presets/neutral-base.preset.json");
    expect(files).toContain("presets/web-complete.preset.json");
    expect(files).toContain("presets/commerce.preset.json");
    expect(files.some((p) => p.startsWith("dist/"))).toBe(true);
    expect(files.some((p) => p.startsWith("src/"))).toBe(false);
    expect(files.some((p) => p.startsWith("tests/"))).toBe(false);
    expect(files.some((p) => p.startsWith("specs/"))).toBe(false);
    expect(files.some((p) => p.startsWith(".agents/"))).toBe(false);
  }, 120000);

  it.skipIf(!HAS_TAR)("real tarball: presets assets resolve from the packed dist module", () => {
    const work = mkdtempSync(join(tmpdir(), "neuraz-presets-pack-"));
    dirs.push(work);
    const out = execFileSync("npm", ["pack", "--pack-destination", work], { cwd: REPO_ROOT }).toString().trim();
    const tgz = join(work, out.split("\n").pop()!.trim());
    execFileSync("tar", ["-xzf", tgz, "-C", work]);
    const pkgDir = join(work, "package");
    expect(existsSync(join(pkgDir, "presets", "catalog.json"))).toBe(true);
    expect(existsSync(join(pkgDir, "presets", "neutral-base.preset.json"))).toBe(true);
    expect(existsSync(join(pkgDir, "presets", "web-complete.preset.json"))).toBe(true);
    expect(existsSync(join(pkgDir, "presets", "commerce.preset.json"))).toBe(true);
    const packedCatalogJs = join(pkgDir, "dist", "infrastructure", "presets", "bundled-preset-catalog.js");
    expect(existsSync(packedCatalogJs)).toBe(true);
    const resolved = new URL("../../../presets/catalog.json", pathToFileURL(packedCatalogJs));
    expect(existsSync(fileURLToPath(resolved))).toBe(true);
  }, 180000);
});
