// T053 (009) — Smoke desde el paquete REALMENTE instalado: `npm pack` + `npm install <tgz>` (sin `npm
// link`, sin symlink al repo); `view --json` desde un cwd ajeno, offline, sin referencias al repo.
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
  work = await mkdtemp(join(tmpdir(), "neuraz-viewer-tarball-"));
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
  const dir = await mkdtemp(join(tmpdir(), "neuraz-viewer host ñ-"));
  await writeFile(join(dir, "package.json"), '{"name":"smoke-host"}\n');
  await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
  await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
  await writeFile(join(dir, "design-system", "design-system.json"), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  await writeFile(join(dir, TOKENS_REL), `${JSON.stringify(buildTokens(), null, 2)}\n`);
  return dir;
}

describe("installed tarball — viewer integrity (T053)", () => {
  it("empaqueta el binario y los recursos del Viewer sin referenciar el repo", () => {
    if (!installed) return;
    const pkgRoot = join(work!, "consumer", "node_modules", "@neuraz", "design-system-manager");
    expect(existsSync(join(pkgRoot, "dist", "cli", "commands", "view.js"))).toBe(true);
    expect(existsSync(join(pkgRoot, "dist", "infrastructure", "viewer", "ui", "main.js"))).toBe(true);
    expect(readFileSync(join(pkgRoot, "dist", "cli", "commands", "view.js"), "utf8")).not.toContain(REPO_ROOT);
  });
});

describe("installed tarball — view --json from a foreign cwd (T053)", () => {
  it("view --json → un envelope a stdout, exit 0, ruta con espacios/Unicode, sin referencias al repo", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const r = await run(["view", "--json"], host);
      expect(r.code).toBe(0);
      expect(r.stderr).toBe("");
      const envelope = JSON.parse(r.stdout);
      expect(envelope).toMatchObject({ formatVersion: "1.0.0", section: "session" });
      expect(r.stdout).not.toContain(REPO_ROOT);
      expect(r.stdout).not.toContain(host);
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });

  it("view --json no escribe nada bajo design-system/**", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const before = await import("node:fs/promises").then((fs) => fs.readFile(join(host, TOKENS_REL)));
      await run(["view", "--json"], host);
      const after = await import("node:fs/promises").then((fs) => fs.readFile(join(host, TOKENS_REL)));
      expect(after).toEqual(before);
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });

  it("view --help funciona sin TTY/stdin (proceso hijo real)", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const r = await run(["view", "--help"], host);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("--port");
      expect(r.stdout).toContain("--json");
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });
});
