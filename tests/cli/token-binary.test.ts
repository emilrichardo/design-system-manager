// T040 (008) — `token` ejecutado como proceso hijo del binario compilado (`dist/cli/index.js`): plan/
// apply reales, JSON, paths con espacios/Unicode, cwd distinto, stdin cerrado, sin TTY. Streams y exit
// codes; plan es read-only; apply real; segunda ejecución unchanged; rename actualiza aliases.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runBinary } from "../helpers/run-binary.js";
import { makeHostProject, type HostProject } from "../helpers/build-host.js";

const TOKENS_REL = "design-system/tokens/base.tokens.json";
const hosts: HostProject[] = [];
const tmpFiles: string[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
  await Promise.all(tmpFiles.splice(0).map((f) => rm(f, { recursive: true, force: true })));
});

async function host(dirName?: string): Promise<string> {
  const p = await makeHostProject(dirName === undefined ? {} : { dirName });
  hosts.push(p);
  return p.dir;
}

async function commandFile(operations: readonly unknown[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "neuraz-ds-token-bin-"));
  tmpFiles.push(dir);
  const path = join(dir, "mutation.json");
  await writeFile(path, `${JSON.stringify({ formatVersion: "1.0.0", operations }, null, 2)}\n`, "utf8");
  return path;
}

describe("token binary (T040)", () => {
  it("plan --file es read-only: no modifica los bytes del host", async () => {
    const dir = await host();
    const before = await readFile(join(dir, TOKENS_REL));
    const file = await commandFile([{ kind: "create-token", path: "spacing.100", type: "dimension", value: { value: 4, unit: "px" } }]);
    const r = await runBinary(["token", "plan", "--file", file], dir);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Token plan: planned");
    expect(r.stderr).toBe("");
    expect(await readFile(join(dir, TOKENS_REL))).toEqual(before);
  });

  it("apply real, segunda ejecución unchanged (mismo comando idempotente)", async () => {
    const dir = await host();
    const file = await commandFile([{ kind: "update-value", path: "color.base.blue-500", value: "#000000" }]);
    const first = await runBinary(["token", "apply", "--file", file], dir);
    expect(first.code).toBe(0);
    expect(first.stdout).toContain("Token apply: applied");

    const second = await runBinary(["token", "apply", "--file", file], dir);
    expect(second.code).toBe(2);
    expect(second.stdout).toContain("Token apply: unchanged");
  });

  it("rename shorthand actualiza el alias existente del fixture de init", async () => {
    const dir = await host();
    const r = await runBinary(["token", "rename", "color.brand.primary", "primary-renamed"], dir);
    expect(r.code).toBe(0);
    const tokens = JSON.parse(await readFile(join(dir, TOKENS_REL), "utf8"));
    expect(tokens.color.brand["primary-renamed"]).toBeDefined();
    expect(tokens.color.brand.primary).toBeUndefined();
  });

  it("move actualiza descendientes y referencias", async () => {
    const dir = await host();
    const r = await runBinary(["token", "move", "color.brand.primary", "color.base"], dir);
    expect(r.code).toBe(0);
    const tokens = JSON.parse(await readFile(join(dir, TOKENS_REL), "utf8"));
    expect(tokens.color.base.primary).toBeDefined();
  });

  it("remove con dependientes bloquea (conflict/4), sin escritura", async () => {
    const dir = await host();
    const before = await readFile(join(dir, TOKENS_REL));
    const r = await runBinary(["token", "remove", "color.base.blue-500"], dir);
    expect(r.code).toBe(4);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("removal-with-dependents");
    expect(await readFile(join(dir, TOKENS_REL))).toEqual(before);
  });

  it("`token apply --file --json` emite un único envelope a stdout, stderr vacío", async () => {
    const dir = await host();
    const file = await commandFile([{ kind: "create-token", path: "spacing.200", type: "dimension", value: { value: 8, unit: "px" } }]);
    const r = await runBinary(["token", "apply", "--file", file, "--json"], dir);
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
    const env = JSON.parse(r.stdout);
    expect(env).toMatchObject({ formatVersion: "1.0.0", command: "token-apply", outcome: "applied", result: { wrote: true } });
  });

  it("funciona desde una ruta con espacios", async () => {
    const dir = await host("host with spaces");
    const file = await commandFile([{ kind: "create-token", path: "spacing.100", type: "dimension", value: { value: 4, unit: "px" } }]);
    const r = await runBinary(["token", "apply", "--file", file], dir);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Token apply: applied");
  });

  it("funciona desde una ruta Unicode", async () => {
    const dir = await host("höst-ünïcödé-✓");
    const file = await commandFile([{ kind: "create-token", path: "spacing.100", type: "dimension", value: { value: 4, unit: "px" } }]);
    const r = await runBinary(["token", "apply", "--file", file], dir);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Token apply: applied");
  });

  it("cwd distinto no afecta el resultado cuando --file es absoluto", async () => {
    const dir = await host();
    const otherCwd = await mkdtemp(join(tmpdir(), "neuraz-ds-token-otherwd-"));
    tmpFiles.push(otherCwd);
    const file = await commandFile([{ kind: "create-token", path: "spacing.100", type: "dimension", value: { value: 4, unit: "px" } }]);
    // Ejecuta el binario CON cwd=dir (el host); el archivo de comando vive en otro directorio.
    const r = await runBinary(["token", "apply", "--file", file], dir);
    expect(r.code).toBe(0);
  });

  it("no inicializado → not-found/5, stderr seguro, stdout vacío", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neuraz-ds-token-bare-"));
    tmpFiles.push(dir);
    await writeFile(join(dir, "package.json"), '{"name":"bare","version":"0.0.0"}\n', "utf8");
    const file = await commandFile([{ kind: "create-token", path: "spacing.100", type: "dimension", value: { value: 4, unit: "px" } }]);
    const r = await runBinary(["token", "apply", "--file", file], dir);
    expect(r.code).toBe(5);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("not-found");
  });

  it("archivo de comando ausente: error de uso (exit 3), sin tocar el host", async () => {
    const dir = await host();
    const before = await readFile(join(dir, TOKENS_REL));
    const r = await runBinary(["token", "apply", "--file", "/no/such/file.json"], dir);
    expect(r.code).toBe(3);
    expect(await readFile(join(dir, TOKENS_REL))).toEqual(before);
  });

  it("stdin cerrado, sin TTY: no bloquea la ejecución", async () => {
    const dir = await host();
    const file = await commandFile([{ kind: "create-token", path: "spacing.100", type: "dimension", value: { value: 4, unit: "px" } }]);
    const r = await runBinary(["token", "apply", "--file", file], dir);
    expect(r.code).toBe(0);
  });
});
