// T106 (005) — Empaquetado formal. Analiza `npm pack --dry-run --json` de forma programática y prueba
// que el tarball real incluye `dist/`, `presets/catalog.json`, `presets/neutral-base.preset.json`,
// `package.json` y la documentación pública (`README.md`), y que excluye `src/`, `tests/`, `specs/`,
// `.agents/`, `.specify/`, `node_modules/`, staging y backups. No publica; elimina el tarball al final.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt } from "../../helpers/run-binary.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

interface PackEntry {
  readonly path: string;
}
interface PackReport {
  readonly files: readonly PackEntry[];
  readonly entryCount: number;
  readonly size: number;
  readonly unpackedSize: number;
}

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

function dryRun(): PackReport {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: REPO_ROOT }).toString();
  return (JSON.parse(out) as PackReport[])[0]!;
}

describe("npm pack — dry run programmatic analysis (T106)", () => {
  it("includes the compiled entrypoint, CLI binary, package.json, README and bundled preset assets", () => {
    const report = dryRun();
    const paths = report.files.map((f) => f.path);

    // Assets contractuales del catálogo empaquetado.
    expect(paths).toContain("presets/catalog.json");
    expect(paths).toContain("presets/neutral-base.preset.json");
    // Entrypoint compilado + binario CLI + exports públicos.
    expect(paths).toContain("dist/cli/index.js");
    expect(paths).toContain("dist/index.js");
    expect(paths).toContain("dist/index.d.ts");
    expect(paths.some((p) => p.startsWith("dist/"))).toBe(true);
    // package.json y documentación pública.
    expect(paths).toContain("package.json");
    expect(paths).toContain("README.md");
  });

  it("excludes sources, tests, specs, tooling and never leaks staging/backups/tarballs", () => {
    const paths = dryRun().files.map((f) => f.path);
    expect(paths.some((p) => p.startsWith("src/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("tests/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("specs/"))).toBe(false);
    expect(paths.some((p) => p.startsWith(".agents/"))).toBe(false);
    expect(paths.some((p) => p.startsWith(".specify/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("node_modules/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("coverage/"))).toBe(false);
    expect(paths.some((p) => p.endsWith(".tgz"))).toBe(false);
    expect(paths.some((p) => p.includes(".neuraz-ds-staging-"))).toBe(false);
    expect(paths.some((p) => p.endsWith(".bak") || p.includes(".backup"))).toBe(false);
  });

  it("reports a positive file count and packed size", () => {
    const report = dryRun();
    expect(report.entryCount).toBeGreaterThan(0);
    expect(report.entryCount).toBe(report.files.length);
    expect(report.size).toBeGreaterThan(0);
    expect(report.unpackedSize).toBeGreaterThan(report.size);
  });
});

describe("npm pack — real tarball contents (T106)", () => {
  it.skipIf(!HAS_TAR)("packs a tarball whose extracted contents match the contract, then removes it", () => {
    const work = mkdtempSync(join(tmpdir(), "neuraz-npm-pack-"));
    dirs.push(work);
    const out = execFileSync("npm", ["pack", "--pack-destination", work], { cwd: REPO_ROOT }).toString().trim();
    const tgzName = out.split("\n").pop()!.trim();
    expect(tgzName).toMatch(/^neuraz-design-system-manager-\d+\.\d+\.\d+\.tgz$/);
    const tgz = join(work, tgzName);
    expect(existsSync(tgz)).toBe(true);

    execFileSync("tar", ["-xzf", tgz, "-C", work]);
    const pkg = join(work, "package");
    expect(existsSync(join(pkg, "presets", "catalog.json"))).toBe(true);
    expect(existsSync(join(pkg, "presets", "neutral-base.preset.json"))).toBe(true);
    expect(existsSync(join(pkg, "dist", "cli", "index.js"))).toBe(true);
    expect(existsSync(join(pkg, "package.json"))).toBe(true);
    expect(existsSync(join(pkg, "README.md"))).toBe(true);

    const manifest = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")) as { bin: Record<string, string> };
    expect(manifest.bin["neuraz-ds"]).toBe("dist/cli/index.js");
    expect(readFileSync(join(pkg, "dist", "cli", "index.js"), "utf8").startsWith("#!/usr/bin/env node")).toBe(true);

    const top = readdirSync(pkg);
    expect(top).not.toContain("src");
    expect(top).not.toContain("tests");
    expect(top).not.toContain("specs");
    expect(top).not.toContain(".agents");
  }, 180000);
});
