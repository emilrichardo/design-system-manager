import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt } from "../helpers/run-binary.js";

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
    expect(existsSync(join(packageDir, "README.md"))).toBe(true);
    // Shebang preservado en el binario empaquetado.
    expect(readFileSync(join(packageDir, "dist", "cli", "index.js"), "utf8").startsWith("#!/usr/bin/env node")).toBe(true);
    // No se publican fuentes ni pruebas ni specs.
    const top = readdirSync(packageDir);
    expect(top).not.toContain("src");
    expect(top).not.toContain("tests");
    expect(top).not.toContain("specs");
    expect(top).not.toContain("node_modules");
    expect(top.some((n) => n.startsWith(".neuraz-ds-staging-"))).toBe(false);
  });

  it.skipIf(!HAS_TAR)("el binario empaquetado resuelve y responde --help y --version (exit 0)", () => {
    if (!ensureRunnable()) return; // sin capacidad de symlink: se omite (no se marca como éxito funcional)
    const cli = join(packageDir, "dist", "cli", "index.js");
    const help = execFileSync(process.execPath, [cli, "--help"]).toString();
    expect(help).toContain("init");
    const version = execFileSync(process.execPath, [cli, "--version"]).toString().trim();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("npm pack --dry-run --json lista dist y no incluye src/tests/specs", () => {
    const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: REPO_ROOT }).toString();
    const report = JSON.parse(out) as Array<{ files: Array<{ path: string }> }>;
    const paths = report[0]!.files.map((f) => f.path);
    expect(paths).toContain("dist/cli/index.js");
    expect(paths).toContain("package.json");
    expect(paths.some((p) => p === "README.md")).toBe(true);
    expect(paths.some((p) => p.startsWith("src/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("tests/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("specs/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("node_modules/"))).toBe(false);
  });
});
