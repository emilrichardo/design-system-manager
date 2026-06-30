// T150 (006) — Regresión de 001 (init): `init` real (use case headless con prompts programados) crea
// los tres documentos, es idempotente (segunda ejecución → unchanged/2) y NO dispara presets ni build
// automáticos. 006 no cambia el comportamiento de init.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";
import { runRealInit, samplePrepared } from "../../helpers/real-init.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

async function bareProject(): Promise<string> {
  const p = await createTmpProject();
  bag.push(p);
  return p.dir;
}

describe("regression 001 — init (T150)", () => {
  it("init crea config, manifest y tokens con los bytes iniciales esperados", async () => {
    const dir = await bareProject();
    const run = await runRealInit(dir);
    expect(run.exitCode).toBe(0);
    expect(run.result.status).toBe("created");

    for (const rel of [MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens]) {
      expect(existsSync(join(dir, rel))).toBe(true);
    }
    // Bytes iniciales de tokens = documento preparado canónico.
    const prepared = samplePrepared();
    const tokensPrepared = prepared.find((f) => f.relativePath === MANAGED_FILES.tokens);
    expect(readFileSync(join(dir, MANAGED_FILES.tokens), "utf8")).toBe(tokensPrepared!.content);
  });

  it("segunda ejecución → unchanged/2 (idempotente), sin reescribir", async () => {
    const dir = await bareProject();
    await runRealInit(dir);
    const bytes = readFileSync(join(dir, MANAGED_FILES.tokens));
    const second = await runRealInit(dir);
    expect(second.exitCode).toBe(2);
    expect(second.result.status).toBe("unchanged");
    expect(readFileSync(join(dir, MANAGED_FILES.tokens))).toEqual(bytes);
  });

  it("init no aplica ningún preset ni dispara un build automático", async () => {
    const dir = await bareProject();
    await runRealInit(dir);
    expect(existsSync(join(dir, "design-system", "build"))).toBe(false);
    // El token inicial no contiene metadata de preset (foundation level) inyectada.
    const tokens = readFileSync(join(dir, MANAGED_FILES.tokens), "utf8");
    expect(tokens).not.toContain('"ar.neuraz.design-system-manager"');
  });
});
