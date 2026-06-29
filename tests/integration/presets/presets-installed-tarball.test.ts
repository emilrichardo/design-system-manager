// T103 (005) — Procesos hijos del binario desde un tarball EMPAQUETADO e instalado, ejecutado con un
// cwd distinto del paquete: prueba que los assets del catálogo se resuelven vía `import.meta.url` (no
// vía cwd) y que el flujo list/inspect/plan/apply funciona desde el paquete instalado. Limpia tarball,
// extracción y proyectos temporales.
import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt } from "../../helpers/run-binary.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const REPO_NODE_MODULES = join(REPO_ROOT, "node_modules");
const TOKENS_REL = "design-system/tokens/base.tokens.json";
const MANIFEST = { manifestSchemaVersion: "0.1.0", name: "Acme", slug: "acme", version: "0.1.0", tokensDir: "tokens", description: "Acme DS" };

function hasTar(): boolean {
  try {
    execFileSync("tar", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const HAS_TAR = hasTar();

let work: string | null = null;
let packageDir = "";
let packedCli = "";
let runnable = false;

beforeAll(async () => {
  ensureBuilt();
  if (!HAS_TAR) return;
  work = await mkdtemp(join(tmpdir(), "neuraz-presets-tarball-"));
  const out = execFileSync("npm", ["pack", "--pack-destination", work], { cwd: REPO_ROOT }).toString().trim();
  const tgz = join(work, out.split("\n").pop()!.trim());
  execFileSync("tar", ["-xzf", tgz, "-C", work]);
  packageDir = join(work, "package");
  packedCli = join(packageDir, "dist", "cli", "index.js");
  try {
    await symlink(REPO_NODE_MODULES, join(packageDir, "node_modules"), "dir");
    runnable = true;
  } catch {
    runnable = false;
  }
}, 240000);

afterAll(async () => {
  if (work) await rm(work, { recursive: true, force: true });
});

function runPacked(args: readonly string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = execFile(process.execPath, [packedCli, ...args], { cwd, timeout: 30000 }, (err, stdout, stderr) => {
      const code = err && typeof (err as { code?: unknown }).code === "number" ? (err as { code: number }).code : err ? 1 : 0;
      resolve({ code, stdout, stderr });
    });
    child.stdin?.end();
  });
}

async function initializedHost(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "neuraz-presets-host-"));
  await writeFile(join(dir, "package.json"), '{"name":"host"}\n');
  await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
  await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
  await writeFile(join(dir, "design-system", "design-system.json"), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  await writeFile(join(dir, TOKENS_REL), `${JSON.stringify(buildTokens(), null, 2)}\n`);
  return dir;
}

describe("presets installed tarball (T103)", () => {
  it.skipIf(!HAS_TAR)("the tarball includes the bundled preset assets", () => {
    expect(existsSync(join(packageDir, "presets", "catalog.json"))).toBe(true);
    expect(existsSync(join(packageDir, "presets", "neutral-base.preset.json"))).toBe(true);
    expect(existsSync(packedCli)).toBe(true);
  });

  it.skipIf(!HAS_TAR)("resolves the catalog via import.meta.url from a different cwd (not the package)", async () => {
    if (!runnable) return;
    const host = await initializedHost();
    try {
      const list = await runPacked(["presets", "list", "--json"], host);
      expect(list.code).toBe(0);
      expect(JSON.parse(list.stdout)).toMatchObject({ command: "preset-list", outcome: "success" });
      expect(list.stdout).toContain("neutral-base");
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });

  it.skipIf(!HAS_TAR)("apply from the installed package: applied then unchanged", async () => {
    if (!runnable) return;
    const host = await initializedHost();
    try {
      const inspect = await runPacked(["presets", "inspect", "neutral-base"], host);
      expect(inspect.code).toBe(0);

      const apply1 = await runPacked(["presets", "apply", "neutral-base", "--json"], host);
      expect(apply1.code).toBe(0);
      expect(JSON.parse(apply1.stdout)).toMatchObject({ command: "preset-apply", outcome: "applied" });

      const apply2 = await runPacked(["presets", "apply", "neutral-base"], host);
      expect(apply2.code).toBe(2);
      expect(apply2.stdout).toContain("unchanged");
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });
});
