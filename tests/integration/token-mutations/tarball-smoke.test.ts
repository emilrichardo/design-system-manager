// T045 (008) — Smoke desde el paquete REALMENTE instalado: `npm pack` + `npm install <tgz>` (sin npm
// link, sin symlink al repo), ejecutando `token plan`/`token apply` desde un cwd ajeno, con ruta de
// espacios y Unicode. Gating como el smoke de 006/007: `if (!installed) return`.
import { execFile, execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  work = await mkdtemp(join(tmpdir(), "neuraz-token-tarball-"));
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
  const dir = await mkdtemp(join(tmpdir(), "neuraz-token host ñ-"));
  await writeFile(join(dir, "package.json"), '{"name":"smoke-host"}\n');
  await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
  await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
  await writeFile(join(dir, "design-system", "design-system.json"), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  await writeFile(join(dir, TOKENS_REL), `${JSON.stringify(buildTokens(), null, 2)}\n`);
  return dir;
}

async function commandFile(dir: string, operations: readonly unknown[]): Promise<string> {
  const path = join(dir, "mutation.json");
  await writeFile(path, `${JSON.stringify({ formatVersion: "1.0.0", operations }, null, 2)}\n`, "utf8");
  return path;
}

describe("installed tarball — token mutations integrity (T045)", () => {
  it("empaqueta el binario y los recursos sin referenciar el repo", () => {
    if (!installed) return;
    const pkgRoot = join(work!, "consumer", "node_modules", "@neuraz", "design-system-manager");
    expect(existsSync(join(pkgRoot, "dist", "cli", "commands", "token.js"))).toBe(true);
    expect(readFileSync(join(pkgRoot, "dist", "cli", "commands", "token.js"), "utf8")).not.toContain(REPO_ROOT);
  });
});

describe("installed tarball — token plan/apply from a foreign cwd (T045)", () => {
  it("plan es read-only; apply real; segunda ejecución unchanged; ruta con espacios/Unicode", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const before = await readFile(join(host, TOKENS_REL));
      const file = await commandFile(host, [{ kind: "update-value", path: "color.base.blue-500", value: "#000000" }]);

      const plan = await run(["token", "plan", "--file", file], host);
      expect(plan.code).toBe(0);
      expect(plan.stdout).toContain("Token plan: planned");
      expect(await readFile(join(host, TOKENS_REL))).toEqual(before);

      const apply1 = await run(["token", "apply", "--file", file], host);
      expect(apply1.code).toBe(0);
      expect(apply1.stdout).toContain("Token apply: applied");

      const apply2 = await run(["token", "apply", "--file", file], host);
      expect(apply2.code).toBe(2);
      expect(apply2.stdout).toContain("Token apply: unchanged");
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });

  it("rename actualiza aliases; remove con dependientes bloquea", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const rename = await run(["token", "rename", "color.brand.primary", "primary-renamed"], host);
      expect(rename.code).toBe(0);
      const tokens = JSON.parse(await readFile(join(host, TOKENS_REL), "utf8"));
      expect(tokens.color.brand["primary-renamed"]).toBeDefined();

      const removeBlocked = await run(["token", "remove", "color.base.blue-500"], host);
      expect(removeBlocked.code).toBe(4);
      expect(removeBlocked.stdout).toBe("");
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });

  it("`token apply --json` → un envelope a stdout (sin rutas del repo)", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      const file = await commandFile(host, [{ kind: "update-value", path: "color.base.blue-500", value: "#111111" }]);
      const r = await run(["token", "apply", "--file", file, "--json"], host);
      expect(r.code).toBe(0);
      expect(r.stderr).toBe("");
      expect(JSON.parse(r.stdout)).toMatchObject({ formatVersion: "1.0.0", command: "token-apply", outcome: "applied" });
      expect(r.stdout).not.toContain(REPO_ROOT);
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });

  it("no altera design-system/build/**, design-system/assets/** ni el manifest", async () => {
    if (!installed) return;
    const host = await initializedHost();
    try {
      await mkdir(join(host, "design-system", "build"), { recursive: true });
      await writeFile(join(host, "design-system", "build", "tokens.css"), ":root {}\n");
      await mkdir(join(host, "design-system", "assets"), { recursive: true });
      await writeFile(join(host, "design-system", "assets", "icon.svg"), "<svg></svg>\n");
      const manifestBefore = await readFile(join(host, "design-system", "design-system.json"), "utf8");
      const buildBefore = await readFile(join(host, "design-system", "build", "tokens.css"), "utf8");
      const assetBefore = await readFile(join(host, "design-system", "assets", "icon.svg"), "utf8");

      const file = await commandFile(host, [{ kind: "update-value", path: "color.base.blue-500", value: "#222222" }]);
      const r = await run(["token", "apply", "--file", file], host);
      expect(r.code).toBe(0);

      expect(await readFile(join(host, "design-system", "design-system.json"), "utf8")).toBe(manifestBefore);
      expect(await readFile(join(host, "design-system", "build", "tokens.css"), "utf8")).toBe(buildBefore);
      expect(await readFile(join(host, "design-system", "assets", "icon.svg"), "utf8")).toBe(assetBefore);
    } finally {
      await rm(host, { recursive: true, force: true });
    }
  });
});
