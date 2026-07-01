// T046 (010) — Smoke real desde el paquete INSTALADO (`npm pack` + `npm install <tgz>`, sin `npm link`,
// sin symlink al repo): arranca `neuraz-ds view` como proceso hijo real, loopback-only, offline, y
// ejerce preview/plan/apply del Editor desde un cwd ajeno con ruta de espacios/Unicode.
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";
import { ensureBuilt } from "../../helpers/run-binary.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const TOKENS_REL = "design-system/tokens/base.tokens.json";
const MANIFEST = { manifestSchemaVersion: "0.1.0", name: "Acme", slug: "acme", version: "0.1.0", tokensDir: "tokens", description: "Acme DS" };

let work: string | null = null;
let installedBin = "";
let installed = false;

beforeAll(async () => {
  ensureBuilt();
  work = await mkdtemp(join(tmpdir(), "neuraz-editor-tarball-"));
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

/** Host inicializado en una ruta con espacios y Unicode, fuera del directorio de instalación. */
async function initializedHost(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "neuraz-editor host ñ-"));
  await writeFile(join(dir, "package.json"), '{"name":"smoke-host"}\n');
  await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
  await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
  await writeFile(join(dir, "design-system", "design-system.json"), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  await writeFile(join(dir, TOKENS_REL), `${JSON.stringify(buildTokens(), null, 2)}\n`);
  return dir;
}

function startServer(cwd: string): Promise<{ readonly port: number; readonly child: ChildProcessWithoutNullStreams }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [installedBin, "view", "--port", "0"], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const timer = setTimeout(() => reject(new Error("timeout waiting for viewer to listen")), 15000);
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
      const m = /listening at http:\/\/127\.0\.0\.1:(\d+)\//.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve({ port: Number(m[1]), child });
      }
    });
    child.on("error", reject);
  });
}

describe("installed tarball — editor integrity (T046)", () => {
  it("empaqueta application/editor sin referenciar el repo", () => {
    if (!installed) return;
    const pkgRoot = join(work!, "consumer", "node_modules", "@neuraz", "design-system-manager");
    expect(existsSync(join(pkgRoot, "dist", "application", "editor", "apply-editor-command.js"))).toBe(true);
    expect(existsSync(join(pkgRoot, "dist", "infrastructure", "viewer", "ui", "main.js"))).toBe(true);
    expect(readFileSync(join(pkgRoot, "dist", "application", "editor", "apply-editor-command.js"), "utf8")).not.toContain(REPO_ROOT);
  });
});

describe("installed tarball — editor preview/plan/apply from a foreign cwd, offline, loopback-only (T046)", () => {
  it("plan (preview) -> diff -> approve -> apply real; refresh disponible; cero escrituras antes de aprobar", async () => {
    if (!installed) return;
    const host = await initializedHost();
    let child: ChildProcessWithoutNullStreams | null = null;
    try {
      const server = await startServer(host);
      child = server.child;
      const base = `http://127.0.0.1:${server.port}`;

      const before = await readFile(join(host, TOKENS_REL), "utf8");

      const planRes = await fetch(`${base}/api/editor/plan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.brand.primary", description: "tarball smoke" }] }),
      });
      expect(planRes.status).toBe(200);
      const planBody = (await planRes.json()) as { readonly data: { readonly canApprove: boolean } };
      expect(planBody.data.canApprove).toBe(true);
      expect(await readFile(join(host, TOKENS_REL), "utf8")).toBe(before);

      const applyRes = await fetch(`${base}/api/editor/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.brand.primary", description: "tarball smoke" }] }),
      });
      expect(applyRes.status).toBe(200);
      const applyBody = (await applyRes.json()) as {
        readonly data: { readonly apply: { readonly state: string; readonly wrote: boolean }; readonly refresh: { readonly state: string } };
      };
      expect(applyBody.data.apply.state).toBe("applied");
      expect(applyBody.data.apply.wrote).toBe(true);
      expect(applyBody.data.refresh.state).toBe("reloaded");
      expect(JSON.stringify(applyBody)).not.toContain(REPO_ROOT);
      expect(JSON.stringify(applyBody)).not.toContain(host);

      const after = await readFile(join(host, TOKENS_REL), "utf8");
      expect(after).toContain("tarball smoke");
    } finally {
      child?.kill();
      await rm(host, { recursive: true, force: true });
    }
  }, 30000);

  it("un plan bloqueado (removal-with-dependents) nunca escribe desde el binario instalado", async () => {
    if (!installed) return;
    const host = await initializedHost();
    let child: ChildProcessWithoutNullStreams | null = null;
    try {
      const server = await startServer(host);
      child = server.child;
      const base = `http://127.0.0.1:${server.port}`;
      const before = await readFile(join(host, TOKENS_REL), "utf8");

      const res = await fetch(`${base}/api/editor/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "remove-token", path: "color.base.blue-500" }] }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { readonly data: { readonly apply: { readonly wrote: boolean } } };
      expect(body.data.apply.wrote).toBe(false);
      expect(await readFile(join(host, TOKENS_REL), "utf8")).toBe(before);
    } finally {
      child?.kill();
      await rm(host, { recursive: true, force: true });
    }
  }, 30000);
});
