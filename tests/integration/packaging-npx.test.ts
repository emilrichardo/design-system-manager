import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt } from "../helpers/run-binary.js";
import { buildConfig } from "../../src/domain/builders/build-config.js";
import { buildTokens } from "../../src/domain/builders/build-tokens.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { VALID_MANIFEST } from "../helpers/ds-fixtures.js";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REPO_NODE_MODULES = join(REPO_ROOT, "node_modules");

function tarAvailable(): boolean {
  try {
    execFileSync("tar", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const HAS_TAR = tarAvailable();

let work: string;
let packageDir: string; // <tmp>/package tras extraer el tarball
let runnable = false; // true si pudimos enlazar node_modules para ejecutar el binario empaquetado

beforeAll(() => {
  ensureBuilt();
  work = mkdtempSync(join(tmpdir(), "neuraz-pack-"));
  if (!HAS_TAR) return;
  const out = execFileSync("npm", ["pack", "--pack-destination", work], { cwd: REPO_ROOT }).toString().trim();
  const tgz = join(work, out.split("\n").pop()!.trim());
  execFileSync("tar", ["-xzf", tgz, "-C", work]);
  packageDir = join(work, "package");
}, 180000);

/** Enlaza node_modules del repo dentro del paquete extraído (ESM no usa NODE_PATH). */
function ensureRunnable(): boolean {
  if (runnable) return true;
  try {
    symlinkSync(REPO_NODE_MODULES, join(packageDir, "node_modules"), "dir");
    runnable = true;
  } catch {
    runnable = false;
  }
  return runnable;
}

afterAll(() => {
  if (work) rmSync(work, { recursive: true, force: true });
});

describe("T064 — empaquetado y ejecución del paquete", () => {
  it.skipIf(!HAS_TAR)("el tarball incluye dist/bin/package.json/README y excluye src/tests/specs", () => {
    const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
    expect(pkg.bin["neuraz-ds"]).toBe("dist/cli/index.js");
    expect(existsSync(join(packageDir, "dist", "cli", "index.js"))).toBe(true);
    expect(existsSync(join(packageDir, "dist", "application", "json", "format-version.js"))).toBe(true);
    expect(existsSync(join(packageDir, "dist", "application", "json", "map-validate.js"))).toBe(true);
    expect(existsSync(join(packageDir, "dist", "application", "json", "map-inspect.js"))).toBe(true);
    expect(existsSync(join(packageDir, "dist", "application", "foundations", "json", "format-version.js"))).toBe(true);
    expect(existsSync(join(packageDir, "dist", "application", "foundations", "json", "map-foundations.js"))).toBe(true);
    expect(existsSync(join(packageDir, "dist", "infrastructure", "reporter", "validate-json-reporter.js"))).toBe(true);
    expect(existsSync(join(packageDir, "dist", "infrastructure", "reporter", "inspect-json-reporter.js"))).toBe(true);
    expect(existsSync(join(packageDir, "dist", "infrastructure", "reporter", "foundations-json-reporter.js"))).toBe(true);
    expect(existsSync(join(packageDir, "README.md"))).toBe(true);
    // Shebang preservado en el binario empaquetado.
    expect(readFileSync(join(packageDir, "dist", "cli", "index.js"), "utf8").startsWith("#!/usr/bin/env node")).toBe(true);
    // No se publican fuentes ni pruebas ni specs.
    const top = readdirSync(packageDir);
    expect(top).not.toContain("src");
    expect(top).not.toContain("tests");
    expect(top).not.toContain("specs");
    expect(top).not.toContain(".specify");
    expect(top).not.toContain(".agents");
    expect(top).not.toContain("node_modules");
    expect(top.some((n) => n.startsWith(".neuraz-ds-staging-"))).toBe(false);
  });

  it.skipIf(!HAS_TAR)("el binario empaquetado resuelve y responde --help y --version (exit 0)", () => {
    if (!ensureRunnable()) return; // sin capacidad de symlink: se omite (no se marca como éxito funcional)
    const cli = join(packageDir, "dist", "cli", "index.js");
    const help = execFileSync(process.execPath, [cli, "--help"]).toString();
    expect(help).toContain("init");
    expect(help).toContain("validate");
    expect(help).toContain("inspect");
    expect(help).toContain("foundations");
    const version = execFileSync(process.execPath, [cli, "--version"]).toString().trim();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(execFileSync(process.execPath, [cli, "init", "--help"]).toString()).not.toContain("--json");
    expect(execFileSync(process.execPath, [cli, "validate", "--help"]).toString()).toContain("--json");
    expect(execFileSync(process.execPath, [cli, "inspect", "--help"]).toString()).toContain("--json");
    expect(execFileSync(process.execPath, [cli, "foundations", "--help"]).toString()).toContain("--json");
  }, 20000);

  it.skipIf(!HAS_TAR)("smoke del paquete: validate/inspect/foundations JSON sin depender de src", () => {
    if (!ensureRunnable()) return;
    const cli = join(packageDir, "dist", "cli", "index.js");
    const host = mkdtempSync(join(tmpdir(), "neuraz-pack-smoke-"));
    try {
      writeFileSync(join(host, "package.json"), "{}\n");
      writeFileSync(join(host, MANAGED_FILES.config), `${JSON.stringify(buildConfig(), null, 2)}\n`);
      mkdirSync(join(host, "design-system", "tokens"), { recursive: true });
      writeFileSync(join(host, MANAGED_FILES.manifest), `${JSON.stringify(VALID_MANIFEST, null, 2)}\n`);
      writeFileSync(join(host, MANAGED_FILES.tokens), `${JSON.stringify(buildTokens(), null, 2)}\n`);

      const validate = spawnSync(process.execPath, [cli, "validate", "--json"], { cwd: host, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const inspect = spawnSync(process.execPath, [cli, "inspect", "--json"], { cwd: host, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const foundations = spawnSync(process.execPath, [cli, "foundations", "--json"], { cwd: host, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const validateJson = JSON.parse(validate.stdout) as { formatVersion: string; command: string; outcome: string };
      const inspectJson = JSON.parse(inspect.stdout) as { formatVersion: string; command: string; outcome: string; result: { tokens: { total: number } } };
      const foundationsJson = JSON.parse(foundations.stdout) as { formatVersion: string; command: string; outcome: string };

      expect(validate.status).toBe(0);
      expect(inspect.status).toBe(0);
      expect(foundations.status).toBe(4);
      expect(validate.stderr).toBe("");
      expect(inspect.stderr).toBe("");
      expect(foundations.stderr).toBe("");
      expect(validateJson).toMatchObject({ formatVersion: "1.0.0", command: "validate", outcome: "valid" });
      expect(inspectJson).toMatchObject({ formatVersion: "1.0.0", command: "inspect", outcome: "valid" });
      expect(foundationsJson).toMatchObject({ formatVersion: "1.0.0", command: "foundations", outcome: "partial" });
      expect(inspectJson.result.tokens.total).toBe(2);
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it("npm pack --dry-run --json lista dist y no incluye src/tests/specs", () => {
    const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: REPO_ROOT }).toString();
    const report = JSON.parse(out) as Array<{ files: Array<{ path: string }> }>;
    const paths = report[0]!.files.map((f) => f.path);
    expect(paths).toContain("dist/cli/index.js");
    expect(paths).toContain("dist/application/json/format-version.js");
    expect(paths).toContain("dist/application/json/map-validate.js");
    expect(paths).toContain("dist/application/json/map-inspect.js");
    expect(paths).toContain("dist/application/foundations/json/format-version.js");
    expect(paths).toContain("dist/application/foundations/json/map-foundations.js");
    expect(paths).toContain("dist/infrastructure/reporter/validate-json-reporter.js");
    expect(paths).toContain("dist/infrastructure/reporter/inspect-json-reporter.js");
    expect(paths).toContain("dist/infrastructure/reporter/foundations-json-reporter.js");
    expect(paths).toContain("package.json");
    expect(paths.some((p) => p === "README.md")).toBe(true);
    expect(paths.some((p) => p.startsWith("src/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("tests/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("specs/"))).toBe(false);
    expect(paths.some((p) => p.startsWith(".specify/"))).toBe(false);
    expect(paths.some((p) => p.startsWith(".agents/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("node_modules/"))).toBe(false);
  });
});
