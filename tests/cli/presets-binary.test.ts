// T102 + T105 (005) — Procesos hijos contra el binario compilado real (dist/cli/index.js). Verifican el
// flujo completo (Commander → composición → casos de uso → filesystem → reporter → exit) sin TTY ni
// stdin, desde proyectos temporales, incluyendo una ruta con espacios y Unicode, y el determinismo de
// la salida en ejecuciones repetidas (sin timestamps/UUID/locale).
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt, runBinary } from "../helpers/run-binary.js";
import { buildConfig } from "../../src/domain/builders/build-config.js";
import { buildTokens } from "../../src/domain/builders/build-tokens.js";
import { emptyProject, makeProject } from "../helpers/ds-fixtures.js";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";

const TOKENS_REL = "design-system/tokens/base.tokens.json";
const MANIFEST = { manifestSchemaVersion: "0.1.0", name: "Acme", slug: "acme", version: "0.1.0", tokensDir: "tokens", description: "Acme DS" };
const bag: TmpProject[] = [];

beforeAll(() => {
  ensureBuilt();
}, 180000);
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

async function initializedHostAt(dir: string): Promise<void> {
  await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
  await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
  await writeFile(join(dir, "design-system", "design-system.json"), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  await writeFile(join(dir, TOKENS_REL), `${JSON.stringify(buildTokens(), null, 2)}\n`);
}

describe("presets binary — read-only commands (T102)", () => {
  it("list (human + --json) with no TTY: one stdout doc, empty stderr", async () => {
    const dir = await makeProject(bag);
    const human = await runBinary(["presets", "list"], dir);
    expect(human.code).toBe(0);
    expect(human.stdout).toContain("neutral-base");
    expect(human.stderr).toBe("");

    const json = await runBinary(["presets", "list", "--json"], dir);
    expect(json.code).toBe(0);
    expect(json.stderr).toBe("");
    expect(JSON.parse(json.stdout)).toMatchObject({ formatVersion: "1.0.0", command: "preset-list", outcome: "success" });
  });

  it("inspect neutral-base (human + --json)", async () => {
    const dir = await makeProject(bag);
    expect((await runBinary(["presets", "inspect", "neutral-base"], dir)).code).toBe(0);
    const json = await runBinary(["presets", "inspect", "neutral-base", "--json"], dir);
    expect(JSON.parse(json.stdout)).toMatchObject({ command: "preset-inspect", outcome: "success" });
    expect(json.stderr).toBe("");
  });

  it("plan against a non-initialized project → not-found:design-system, exit 5, read-only", async () => {
    const dir = await emptyProject(bag);
    const r = await runBinary(["presets", "plan", "neutral-base", "--json"], dir);
    expect(r.code).toBe(5);
    expect(JSON.parse(r.stdout)).toMatchObject({ command: "preset-plan", outcome: "not-found" });
    expect(r.stderr).toBe("");
  });
});

describe("presets binary — end-to-end apply flow (T102)", () => {
  it("init host → plan → apply (applied/0) → re-apply (unchanged/2), bytes stable, no residue", async () => {
    const dir = await makeProject(bag);

    expect((await runBinary(["presets", "plan", "neutral-base"], dir)).code).toBe(0);

    const apply1 = await runBinary(["presets", "apply", "neutral-base"], dir);
    expect(apply1.code).toBe(0);
    expect(apply1.stdout).toContain("applied");
    expect(apply1.stderr).toBe("");

    const { readFile, readdir, stat } = await import("node:fs/promises");
    const bytes = await readFile(join(dir, TOKENS_REL));
    const mtime = (await stat(join(dir, TOKENS_REL))).mtimeMs;

    const apply2 = await runBinary(["presets", "apply", "neutral-base"], dir);
    expect(apply2.code).toBe(2);
    expect(apply2.stdout).toContain("unchanged");
    expect(await readFile(join(dir, TOKENS_REL))).toEqual(bytes);
    expect((await stat(join(dir, TOKENS_REL))).mtimeMs).toBe(mtime);
    expect((await readdir(join(dir, "design-system", "tokens"))).filter((n) => n !== "base.tokens.json")).toEqual([]);

    // foundations sigue funcionando tras aplicar (outcome real del host: partial por tokens de init).
    expect([0, 4]).toContain((await runBinary(["foundations"], dir)).code);
  });

  it("runs from a project path containing spaces and Unicode", async () => {
    const project = await createTmpProject();
    bag.push(project);
    const weird = join(project.dir, "preset proj ñ");
    await mkdir(weird, { recursive: true });
    await writeFile(join(weird, "package.json"), '{"name":"weird"}\n');
    await initializedHostAt(weird);
    const r = await runBinary(["presets", "apply", "neutral-base", "--json"], weird);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ command: "preset-apply", outcome: "applied" });
  });
});

describe("presets binary — determinism (T105)", () => {
  it("repeated list --json produces byte-identical stdout", async () => {
    const dir = await makeProject(bag);
    const a = await runBinary(["presets", "list", "--json"], dir);
    const b = await runBinary(["presets", "list", "--json"], dir);
    expect(a.stdout).toBe(b.stdout);
  });

  it("repeated plan --json on the same host is byte-identical (no timestamps/UUID/locale)", async () => {
    const dir = await makeProject(bag);
    const a = await runBinary(["presets", "plan", "neutral-base", "--json"], dir);
    const b = await runBinary(["presets", "plan", "neutral-base", "--json"], dir);
    expect(a.stdout).toBe(b.stdout);
    expect(a.stdout).not.toMatch(/\d{4}-\d{2}-\d{2}T/); // sin timestamps ISO
  });
});
