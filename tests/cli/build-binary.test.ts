// T145 (006) — `build` ejecutado como proceso hijo del binario compilado (`dist/cli/index.js`): cwd
// distinto, ruta con espacios, ruta Unicode, stdin cerrado, sin TTY. Primera build → built/0; segunda →
// unchanged/2. Streams (stdout vs stderr) y exit codes; en JSON un único envelope a stdout.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runBinary } from "../helpers/run-binary.js";
import { makeHostProject, type HostProject } from "../helpers/build-host.js";

const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function host(dirName?: string): Promise<string> {
  const p = await makeHostProject(dirName === undefined ? {} : { dirName });
  hosts.push(p);
  return p.dir;
}

describe("build binary (T145)", () => {
  it("primera build → built/0 (stdout), segunda → unchanged/2; sin escribir en stderr", async () => {
    const dir = await host();
    const first = await runBinary(["build"], dir);
    expect(first.code).toBe(0);
    expect(first.stdout).toContain("Build: built");
    expect(first.stderr).toBe("");
    // El conjunto se publicó.
    const built = readdirSync(join(dir, "design-system", "build")).sort();
    expect(built).toEqual(["manifest.json", "tokens.css", "tokens.resolved.json", "tokens.ts"]);

    const second = await runBinary(["build"], dir);
    expect(second.code).toBe(2);
    expect(second.stdout).toContain("Build: unchanged");
    expect(second.stderr).toBe("");
  });

  it("idempotencia byte-exacta: la segunda build no altera los artifacts publicados", async () => {
    const dir = await host();
    await runBinary(["build"], dir);
    const css = readFileSync(join(dir, "design-system", "build", "tokens.css"));
    const manifest = readFileSync(join(dir, "design-system", "build", "manifest.json"));
    await runBinary(["build"], dir);
    expect(readFileSync(join(dir, "design-system", "build", "tokens.css"))).toEqual(css);
    expect(readFileSync(join(dir, "design-system", "build", "manifest.json"))).toEqual(manifest);
  });

  it("`build --json` emite un único envelope a stdout, stderr vacío", async () => {
    const dir = await host();
    const r = await runBinary(["build", "--json"], dir);
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
    const envelope = JSON.parse(r.stdout);
    expect(envelope).toMatchObject({ formatVersion: "1.0.0", command: "build", outcome: "built", wrote: true });
    expect(envelope.outputDirectory).toBe("design-system/build");
  });

  it("funciona desde una ruta con espacios", async () => {
    const dir = await host("host with spaces");
    const r = await runBinary(["build"], dir);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Build: built");
  });

  it("funciona desde una ruta Unicode", async () => {
    const dir = await host("höst-ünïcödé-✓");
    const r = await runBinary(["build"], dir);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Build: built");
  });

  it("no inicializado → not-found/5, stderr seguro, stdout vacío", async () => {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "neuraz-ds-bare-"));
    try {
      await writeFile(join(dir, "package.json"), '{"name":"bare","version":"0.0.0"}\n', "utf8");
      const r = await runBinary(["build"], dir);
      expect(r.code).toBe(5);
      expect(r.stdout).toBe("");
      expect(r.stderr).toContain("not-found");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
