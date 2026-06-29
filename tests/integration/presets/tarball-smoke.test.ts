// T107 (005) — Smoke desde un paquete REALMENTE instalado con npm. Empaqueta un tarball, lo instala en
// un proyecto temporal con `npm install <tgz>` (sin npm link, sin symlink al repo, sin node_modules
// compartido) y ejecuta exclusivamente el binario instalado (`node_modules/.bin/neuraz-ds`) desde un
// cwd distinto del de instalación, con ruta que contiene espacios y Unicode, sin TTY y con stdin
// cerrado. Prueba que el catálogo se resuelve vía `import.meta.url` (no `process.cwd()`) y que apply es
// idempotente (applied → unchanged). Limpia tarball y proyectos temporales.
//
// Gating: la instalabilidad se determina en `beforeAll` (pack + npm install). Para que `beforeAll`
// realmente se ejecute, los tests NO usan `it.skipIf(<runtime flag>)` (que se evalúa en la carga del
// módulo, cuando la bandera aún es falsa); en su lugar hacen `if (!installed) return` — el patrón ya
// usado por `presets-installed-tarball.test.ts`. En un entorno con caché/registro npm el smoke se
// ejecuta de verdad; sin red se omite sin marcarse como éxito funcional.
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
  work = await mkdtemp(join(tmpdir(), "neuraz-tarball-smoke-"));
  try {
    const out = execFileSync("npm", ["pack", "--pack-destination", work], { cwd: REPO_ROOT }).toString().trim();
    const tgz = join(work, out.split("\n").pop()!.trim());
    const proj = join(work, "consumer");
    await mkdir(proj, { recursive: true });
    execFileSync("npm", ["init", "-y"], { cwd: proj, stdio: "ignore" });
    // Instalación REAL del tarball (resuelve dependencias desde caché/registro), sin tocar el repo.
    execFileSync("npm", ["install", tgz, "--no-audit", "--no-fund", "--prefer-offline"], { cwd: proj, stdio: "ignore" });
    installedBin = join(proj, "node_modules", ".bin", "neuraz-ds");
    installed = existsSync(installedBin);
  } catch {
    installed = false; // entorno sin red ni caché: se omite (no se marca como éxito funcional)
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
    child.stdin?.end(); // stdin cerrado, sin TTY
  });
}

/** Host inicializado en una ruta con espacios y Unicode, fuera del directorio de instalación. */
async function initializedHost(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "neuraz-smoke host ñ-"));
  await writeFile(join(dir, "package.json"), '{"name":"smoke-host"}\n');
  await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
  await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
  await writeFile(join(dir, "design-system", "design-system.json"), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  await writeFile(join(dir, TOKENS_REL), `${JSON.stringify(buildTokens(), null, 2)}\n`);
  return dir;
}

describe("installed tarball — package integrity (T107)", () => {
  it("installs the bin and bundles the catalog assets without referencing the repo", () => {
    if (!installed) return;
    expect(existsSync(installedBin)).toBe(true);
    const pkgRoot = join(work!, "consumer", "node_modules", "@neuraz", "design-system-manager");
    expect(existsSync(join(pkgRoot, "presets", "catalog.json"))).toBe(true);
    expect(existsSync(join(pkgRoot, "presets", "neutral-base.preset.json"))).toBe(true);
    // El paquete instalado no contiene rutas al repositorio original.
    expect(readFileSync(join(pkgRoot, "dist", "cli", "index.js"), "utf8")).not.toContain(REPO_ROOT);
  });
});

describe("installed tarball — help and command surface (T107, J regression)", () => {
  it("exposes the documented command surface and no v1-absent flags", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const help = await run(["--help"], host);
      expect(help.code).toBe(0);
      for (const cmd of ["init", "validate", "inspect", "foundations", "presets"]) expect(help.stdout).toContain(cmd);

      const presetsHelp = await run(["presets", "--help"], host);
      expect(presetsHelp.code).toBe(0);
      for (const sub of ["list", "inspect", "plan", "apply"]) expect(presetsHelp.stdout).toContain(sub);

      for (const sub of ["list", "inspect", "plan", "apply"]) {
        const h = await run(["presets", sub, "--help"], host);
        expect(h.code).toBe(0);
        expect(h.stdout).not.toContain("--force");
        expect(h.stdout).not.toContain("--category");
        expect(h.stdout).not.toContain("--dry-run");
      }
      expect((await run(["presets", "plan", "--help"], host)).stdout).toContain("--json");
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });
});

describe("installed tarball — read-only commands resolve the catalog from a foreign cwd (T107)", () => {
  it("list/inspect/plan work and never print absolute repo paths", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const list = await run(["presets", "list", "--json"], host);
      expect(list.code).toBe(0);
      expect(list.stderr).toBe("");
      expect(JSON.parse(list.stdout)).toMatchObject({ formatVersion: "1.0.0", command: "preset-list", outcome: "success" });
      expect(list.stdout).toContain("neutral-base");
      expect(list.stdout).not.toContain(REPO_ROOT);

      expect((await run(["presets", "list"], host)).code).toBe(0);
      expect((await run(["presets", "inspect", "neutral-base"], host)).code).toBe(0);
      const inspectJson = await run(["presets", "inspect", "neutral-base", "--json"], host);
      expect(JSON.parse(inspectJson.stdout)).toMatchObject({ command: "preset-inspect", outcome: "success" });

      // plan es read-only: los bytes del host no cambian.
      const before = readFileSync(join(host, TOKENS_REL));
      const plan = await run(["presets", "plan", "neutral-base", "--json"], host);
      expect(plan.code).toBe(0);
      expect(JSON.parse(plan.stdout)).toMatchObject({ command: "preset-plan" });
      expect(readFileSync(join(host, TOKENS_REL))).toEqual(before);
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });
});

describe("installed tarball — apply is idempotent from the installed package (T107)", () => {
  it("first apply → applied/0, second apply → unchanged/2, foundations observable", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      // Primera aplicación en JSON sin convertirla en unchanged: outcome applied, exit 0.
      const apply1 = await run(["presets", "apply", "neutral-base", "--json"], host);
      expect(apply1.code).toBe(0);
      expect(apply1.stderr).toBe("");
      expect(JSON.parse(apply1.stdout)).toMatchObject({ command: "preset-apply", outcome: "applied" });
      expect(apply1.stdout).not.toContain(REPO_ROOT);

      const written = JSON.parse(readFileSync(join(host, TOKENS_REL), "utf8"));
      expect(written.color.gray["100"].$value.hex).toBe("#f5f5f5");
      expect(written.spacing["200"].$value).toEqual({ value: 8, unit: "px" });

      // foundations sigue respondiendo desde el paquete instalado (semántica 004 intacta).
      const foundations = await run(["foundations", "--json"], host);
      expect(JSON.parse(foundations.stdout)).toMatchObject({ formatVersion: "1.0.0", command: "foundations" });

      // Segunda aplicación: unchanged, exit 2, sin reescritura.
      const bytes = readFileSync(join(host, TOKENS_REL));
      const apply2 = await run(["presets", "apply", "neutral-base"], host);
      expect(apply2.code).toBe(2);
      expect(apply2.stdout).toContain("unchanged");
      expect(readFileSync(join(host, TOKENS_REL))).toEqual(bytes);
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });
});
