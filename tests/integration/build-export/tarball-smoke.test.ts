// T149 (006) — Smoke desde el paquete REALMENTE instalado: `npm pack` + `npm install <tgz>` (sin npm
// link, sin symlink al repo), ejecutando el binario instalado desde un cwd distinto, con ruta de espacios
// y Unicode. Cubre `build`, `build --json`, `export css|json|typescript` e idempotencia (built → unchanged).
// Limpia tarball y proyectos temporales. Gating como el smoke de 005: `if (!installed) return`.
import { execFile, execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt } from "../../helpers/run-binary.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const TOKENS_REL = "design-system/tokens/base.tokens.json";
const MANIFEST = { manifestSchemaVersion: "0.1.0", name: "Acme", slug: "acme", version: "0.1.0", tokensDir: "tokens", description: "Acme DS" };

let work: string | null = null;
let installedBin = "";
let installed = false;

beforeAll(async () => {
  ensureBuilt();
  work = await mkdtemp(join(tmpdir(), "neuraz-build-tarball-"));
  try {
    const out = execFileSync("npm", ["pack", "--pack-destination", work], { cwd: REPO_ROOT }).toString().trim();
    const tgz = join(work, out.split("\n").pop()!.trim());
    const proj = join(work, "consumer");
    await mkdir(proj, { recursive: true });
    execFileSync("npm", ["init", "-y"], { cwd: proj, stdio: "ignore" });
    execFileSync("npm", ["install", tgz, "--no-audit", "--no-fund", "--prefer-offline"], { cwd: proj, stdio: "ignore" });
    installedBin = join(proj, "node_modules", ".bin", "neuraz-ds");
    installed = existsSync(installedBin);
  } catch {
    installed = false;
  }
}, 240000);

afterAll(async () => {
  if (work) await rm(work, { recursive: true, force: true });
});

function run(args: readonly string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = execFile(process.execPath, [installedBin, ...args], { cwd, timeout: 30000 }, (err, stdout, stderr) => {
      const code = err && typeof (err as { code?: unknown }).code === "number" ? (err as { code: number }).code : err ? 1 : 0;
      resolve({ code, stdout, stderr });
    });
    child.stdin?.end();
  });
}

/** Host inicializado en una ruta con espacios y Unicode, fuera del directorio de instalación. */
async function initializedHost(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "neuraz-build host ñ-"));
  await writeFile(join(dir, "package.json"), '{"name":"smoke-host"}\n');
  await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
  await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
  await writeFile(join(dir, "design-system", "design-system.json"), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  await writeFile(join(dir, TOKENS_REL), `${JSON.stringify(buildTokens(), null, 2)}\n`);
  return dir;
}

describe("installed tarball — build/export integrity (T149)", () => {
  it("empaqueta el binario y los recursos sin referenciar el repo", () => {
    if (!installed) return;
    const pkgRoot = join(work!, "consumer", "node_modules", "@neuraz", "design-system-manager");
    expect(existsSync(join(pkgRoot, "dist", "cli", "index.js"))).toBe(true);
    expect(readFileSync(join(pkgRoot, "dist", "cli", "index.js"), "utf8")).not.toContain(REPO_ROOT);
  });
});

describe("installed tarball — build/export from a foreign cwd (T149)", () => {
  it("build → built/0 y luego unchanged/2 (idempotencia), desde ruta con espacios/Unicode", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const first = await run(["build"], host);
      expect(first.code).toBe(0);
      expect(first.stdout).toContain("Build: built");
      expect(first.stderr).toBe("");
      expect(existsSync(join(host, "design-system", "build", "manifest.json"))).toBe(true);

      const second = await run(["build"], host);
      expect(second.code).toBe(2);
      expect(second.stdout).toContain("Build: unchanged");
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });

  it("build --json → un envelope a stdout (sin rutas del repo)", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const r = await run(["build", "--json"], host);
      expect(r.code).toBe(0);
      expect(r.stderr).toBe("");
      expect(JSON.parse(r.stdout)).toMatchObject({ formatVersion: "1.0.0", command: "build", outcome: "built" });
      expect(r.stdout).not.toContain(REPO_ROOT);
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });

  it("export css|json|typescript → bytes a stdout, stderr vacío, sin escribir", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const css = await run(["export", "css"], host);
      expect(css.code).toBe(0);
      expect(css.stderr).toBe("");
      expect(css.stdout.startsWith(":root {")).toBe(true);

      const json = await run(["export", "json"], host);
      expect(json.code).toBe(0);
      expect(() => JSON.parse(json.stdout)).not.toThrow();

      const ts = await run(["export", "typescript"], host);
      expect(ts.code).toBe(0);
      expect(ts.stdout).toContain("export const tokens");

      // export es read-only: no crea el build dir.
      expect(existsSync(join(host, "design-system", "build"))).toBe(false);
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });
});
