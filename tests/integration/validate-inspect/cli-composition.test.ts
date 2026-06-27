// T038 — Composición real: validate/inspect comparten una única factory de análisis enlazada; humo
// end-to-end con un proyecto temporal real (sin la batería completa de Fase 9).
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createBoundAnalyze,
  createInspectDependencies,
  createValidateDependencies,
} from "../../../src/cli/composition.js";
import { runValidate } from "../../../src/cli/commands/validate.js";
import { runInspect } from "../../../src/cli/commands/inspect.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const sink = { out: () => {}, err: () => {} };
const manifest = JSON.stringify({ manifestSchemaVersion: "0.1.0", name: "Acme", slug: "acme", version: "0.1.0", tokensDir: "tokens" });

async function validDs(): Promise<string> {
  const p = await createTmpProject();
  projects.push(p);
  await writeFile(join(p.dir, MANAGED_FILES.config), JSON.stringify(buildConfig()));
  await mkdir(join(p.dir, "design-system", "tokens"), { recursive: true });
  await writeFile(join(p.dir, MANAGED_FILES.manifest), manifest);
  await writeFile(join(p.dir, MANAGED_FILES.tokens), JSON.stringify(buildTokens()));
  return p.dir;
}

describe("composición CLI 002 (T038)", () => {
  it("validate e inspect comparten la misma factory enlazada; humo sobre DS válido", async () => {
    const analyze = createBoundAnalyze();
    const root = await validDs();
    const v = await runValidate(root, createValidateDependencies(sink, analyze));
    const i = await runInspect(root, createInspectDependencies(sink, analyze));
    expect(v.outcome).toBe("valid");
    expect(i.outcome).toBe("valid");
    if (v.outcome === "valid" && i.outcome === "valid") {
      // misma semántica de validación derivada del mismo análisis enlazado.
      expect(i.inspection.validation.valid).toBe(v.report.valid);
    }
  });

  it("DS inexistente → not-found en ambos", async () => {
    const analyze = createBoundAnalyze();
    const p = await createTmpProject();
    projects.push(p);
    const v = await runValidate(p.dir, createValidateDependencies(sink, analyze));
    const i = await runInspect(p.dir, createInspectDependencies(sink, analyze));
    expect(v.outcome).toBe("not-found");
    expect(i.outcome).toBe("not-found");
  });
});
