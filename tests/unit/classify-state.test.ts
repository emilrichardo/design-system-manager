import { readdirSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { classifyState } from "../../src/infrastructure/host-root/classify-state.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, ensureDir, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";
import { validConfig, validManifest, validTokens } from "../fixtures/documents.js";

const projects: TmpProject[] = [];
async function tmp(): Promise<string> {
  const p = await createTmpProject({ packageJson: false });
  projects.push(p);
  return p.dir;
}
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

const J = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

async function writeComplete(base: string, opts: { config?: unknown; manifest?: unknown; tokens?: unknown } = {}) {
  await writeFileIn(base, MANAGED_FILES.config, J(opts.config ?? validConfig));
  await writeFileIn(base, MANAGED_FILES.manifest, J(opts.manifest ?? validManifest));
  await writeFileIn(base, MANAGED_FILES.tokens, J(opts.tokens ?? validTokens));
}

describe("classifyState (T030b)", () => {
  it("ninguno presente → none", async () => {
    const base = await tmp();
    expect(classifyState(base).kind).toBe("none");
  });

  it("uno presente → partial (con presentes y ausentes)", async () => {
    const base = await tmp();
    await writeFileIn(base, MANAGED_FILES.config, "{}");
    const s = classifyState(base);
    expect(s.kind).toBe("partial");
    if (s.kind === "partial") {
      expect(s.present).toContain(MANAGED_FILES.config);
      expect(s.missing.length).toBe(2);
    }
  });

  it("dos presentes → partial", async () => {
    const base = await tmp();
    await writeFileIn(base, MANAGED_FILES.config, "{}");
    await writeFileIn(base, MANAGED_FILES.manifest, "{}");
    expect(classifyState(base).kind).toBe("partial");
  });

  it("ruta obligatoria ocupada por directorio → partial (no complete-invalid)", async () => {
    const base = await tmp();
    await writeFileIn(base, MANAGED_FILES.config, "{}");
    await writeFileIn(base, MANAGED_FILES.manifest, "{}");
    await ensureDir(base, MANAGED_FILES.tokens); // directorio donde debería ir el archivo
    expect(classifyState(base).kind).toBe("partial");
  });

  it("estructura completa + config inválida → complete-invalid", async () => {
    const base = await tmp();
    await writeComplete(base, { config: { configSchemaVersion: "0.1.0", designSystemDir: "../escape" } });
    expect(classifyState(base).kind).toBe("complete-invalid");
  });

  it("estructura completa + manifest inválido (slug) → complete-invalid", async () => {
    const base = await tmp();
    await writeComplete(base, { manifest: { ...validManifest, slug: "Bad Slug" } });
    expect(classifyState(base).kind).toBe("complete-invalid");
  });

  it("estructura completa + color hex directo (no conforme DTCG) → complete-invalid", async () => {
    const base = await tmp();
    await writeComplete(base, {
      tokens: { color: { $type: "color", base: { x: { $value: "#3b82f6", $description: "hex directo" } } } },
    });
    expect(classifyState(base).kind).toBe("complete-invalid");
  });

  it("estructura completa + DTCG con alias inexistente → complete-invalid", async () => {
    const base = await tmp();
    await writeComplete(base, { tokens: { color: { $type: "color", a: { $value: "{color.missing}", $description: "x" } } } });
    expect(classifyState(base).kind).toBe("complete-invalid");
  });

  it("estructura completa + JSON malformado → complete-invalid", async () => {
    const base = await tmp();
    await writeComplete(base);
    await writeFileIn(base, MANAGED_FILES.tokens, "{ roto ");
    expect(classifyState(base).kind).toBe("complete-invalid");
  });

  it("estructura completa y válida → complete-valid", async () => {
    const base = await tmp();
    await writeComplete(base);
    const s = classifyState(base);
    expect(s.kind).toBe("complete-valid");
    if (s.kind === "complete-valid") expect(s.designSystemDir).toBe("design-system");
  });

  it("no modifica el filesystem en ningún escenario", async () => {
    const base = await tmp();
    await writeComplete(base);
    const snapshot = JSON.stringify(readdirSync(base, { recursive: true }).sort());
    classifyState(base);
    expect(JSON.stringify(readdirSync(base, { recursive: true }).sort())).toBe(snapshot);
  });
});
