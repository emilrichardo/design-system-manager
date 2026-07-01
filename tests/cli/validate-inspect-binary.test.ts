// T047 — Binario real (proceso hijo, sin TTY): exit codes, ayuda/uso, sin prompts, pureza, cota 200.
import { lstatSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt, runBinary } from "../helpers/run-binary.js";
import { buildConfig } from "../../src/domain/builders/build-config.js";
import { buildTokens } from "../../src/domain/builders/build-tokens.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { VALID_MANIFEST, COLOR } from "../helpers/ds-fixtures.js";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";

const projects: TmpProject[] = [];
beforeAll(() => {
  ensureBuilt();
}, 120000);
afterAll(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function project(tokens: unknown | false, opts: { config?: unknown | false; manifest?: unknown | false } = {}): Promise<string> {
  const p = await createTmpProject();
  projects.push(p);
  if (opts.config !== false) await writeFile(join(p.dir, MANAGED_FILES.config), `${JSON.stringify(opts.config ?? buildConfig())}\n`);
  await mkdir(join(p.dir, "design-system", "tokens"), { recursive: true });
  if (opts.manifest !== false) await writeFile(join(p.dir, MANAGED_FILES.manifest), `${JSON.stringify(opts.manifest ?? VALID_MANIFEST)}\n`);
  if (tokens !== false) await writeFile(join(p.dir, MANAGED_FILES.tokens), typeof tokens === "string" ? tokens : `${JSON.stringify(tokens)}\n`);
  return p.dir;
}
function listing(root: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const n of readdirSync(d)) {
      const abs = join(d, n);
      out.push(n);
      if (lstatSync(abs).isDirectory()) walk(abs);
    }
  };
  walk(root);
  return out.sort();
}

describe("T047 — binario real: exit codes por estado", () => {
  it("DS válido → validate 0, inspect 0", async () => {
    const dir = await project(buildTokens());
    expect((await runBinary(["validate"], dir)).code).toBe(0);
    expect((await runBinary(["inspect"], dir)).code).toBe(0);
  });
  it("parcial (sin tokens) → 4", async () => {
    const dir = await project(false);
    expect((await runBinary(["validate"], dir)).code).toBe(4);
    expect((await runBinary(["inspect"], dir)).code).toBe(4);
  });
  it("complete-invalid (tipo desconocido) → 3", async () => {
    const dir = await project({ x: { $type: "weird", $value: "v", $description: "d" } });
    expect((await runBinary(["validate"], dir)).code).toBe(3);
  });
  it("not-found (sin DS) → 5", async () => {
    const dir = await project(false, { config: false, manifest: false });
    expect((await runBinary(["validate"], dir)).code).toBe(5);
    expect((await runBinary(["inspect"], dir)).code).toBe(5);
  });
  it("read-error (UTF-8 inválido) → 6", async () => {
    const dir = await project(false);
    await writeFile(join(dir, MANAGED_FILES.tokens), Buffer.from([0x7b, 0xff, 0xfe, 0x7d]));
    expect((await runBinary(["validate"], dir)).code).toBe(6);
  });
});

describe("T047 — ayuda, versión, uso, sin prompts (sin TTY)", () => {
  it("--help / --version → 0 y listan validate e inspect", async () => {
    const dir = await project(buildTokens());
    const help = await runBinary(["--help"], dir);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("validate");
    expect(help.stdout).toContain("inspect");
    expect(help.stdout).toContain("init");
    expect((await runBinary(["--version"], dir)).code).toBe(0);
    const initHelp = await runBinary(["init", "--help"], dir);
    const validateHelp = await runBinary(["validate", "--help"], dir);
    const inspectHelp = await runBinary(["inspect", "--help"], dir);
    expect(initHelp.code).toBe(0);
    expect(validateHelp.code).toBe(0);
    expect(inspectHelp.code).toBe(0);
    expect(initHelp.stdout).not.toContain("--json");
    expect(validateHelp.stdout).toContain("--json");
    expect(inspectHelp.stdout).toContain("--json");
  }, 20000);

  it("--json es una opción válida en validate/inspect (003); DS válido → 0", async () => {
    const dir = await project(buildTokens());
    const validate = await runBinary(["validate", "--json"], dir);
    const inspect = await runBinary(["inspect", "--json"], dir);
    expect(validate.code).toBe(0);
    expect(inspect.code).toBe(0);
    expect(validate.stderr).toBe("");
    expect(inspect.stderr).toBe("");
    expect(JSON.parse(validate.stdout)).toMatchObject({
      formatVersion: "1.0.0",
      command: "validate",
      outcome: "valid",
    });
    expect(JSON.parse(inspect.stdout)).toMatchObject({
      formatVersion: "1.0.0",
      command: "inspect",
      outcome: "valid",
    });
  });

  it("opción desconocida sigue siendo error de uso → 3", async () => {
    const dir = await project(buildTokens());
    expect((await runBinary(["validate", "--unknown"], dir)).code).toBe(3);
    expect((await runBinary(["inspect", "--unknown"], dir)).code).toBe(3);
  });

  it("comando inexistente → 3; sin stack en stderr", async () => {
    const dir = await project(buildTokens());
    const r = await runBinary(["frobnicate"], dir);
    expect(r.code).toBe(3);
    expect(r.stderr).not.toContain("at ");
  });

  it("validate/inspect terminan sin bloquear y sin texto interactivo de init", async () => {
    const dir = await project(buildTokens());
    const v = await runBinary(["validate"], dir);
    expect(v.stdout + v.stderr).not.toContain("Plan de inicialización");
  });
});

describe("T044/T047 — pureza: el binario no crea archivos", () => {
  it("validate e inspect no modifican el listado del proyecto", async () => {
    const dir = await project(buildTokens());
    const before = listing(dir);
    await runBinary(["validate"], dir);
    await runBinary(["inspect"], dir);
    expect(listing(dir)).toEqual(before);
    expect(before.some((n) => n.includes(".neuraz-ds-staging-"))).toBe(false);
  });
});

describe("T047/§21 — cota de 200 en el binario", () => {
  it(">200 tokens → 200 filas + mensaje exacto de omisión; exit 0; stats completas", async () => {
    const tokens: Record<string, unknown> = { color: { $type: "color" } as Record<string, unknown> };
    const group = tokens.color as Record<string, unknown>;
    for (let i = 0; i < 250; i += 1) group[`t${i}`] = { $value: COLOR, $description: "d" };
    const dir = await project(tokens);
    const r = await runBinary(["inspect"], dir);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Mostrando 200 de 250 tokens.");
    expect(r.stdout).toContain("50 tokens no se muestran en la salida textual.");
    expect(r.stdout).toContain("Total: 250"); // estadísticas completas
  });
});
