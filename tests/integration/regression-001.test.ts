// T048 — Regresión formal de `001-ds-init`: 002 NO cambió el comportamiento observable de init.
// Cruza init → validate → inspect con infraestructura real, y comprueba la separación de schemas.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runRealInit, samplePrepared } from "../helpers/real-init.js";
import { createBoundAnalyze, createInspectDependencies, createValidateDependencies } from "../../src/cli/composition.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { runInspect } from "../../src/cli/commands/inspect.js";
import { exitCodeForOutcome } from "../../src/cli/exit-codes.js";
import { buildTokens } from "../../src/domain/builders/build-tokens.js";
import { buildConfig } from "../../src/domain/builders/build-config.js";
import { documentValidators } from "../../src/infrastructure/initialize-adapters.js";
import { traverseDtcgTree } from "../../src/infrastructure/analysis/traverse-dtcg-tree.js";
import { nodeFileSystem } from "../../src/infrastructure/fs/node-file-system.js";
import { InMemoryFileSystem } from "../helpers/in-memory-adapters.js";
import { faultyFs } from "../helpers/faulty-fs.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const sink = { out: () => {}, err: () => {} };
async function host(): Promise<string> {
  const p = await createTmpProject();
  projects.push(p);
  return p.dir;
}

describe("T048 — init → validate → inspect (cruzado, infra real)", () => {
  it("init created/0 → validate valid/0 → inspect valid/0 → init unchanged/2", async () => {
    const dir = await host();
    const init = await runRealInit(dir);
    expect(init.result.status).toBe("created");
    expect(init.exitCode).toBe(0);
    expect(existsSync(join(dir, MANAGED_FILES.config))).toBe(true);
    expect(existsSync(join(dir, MANAGED_FILES.manifest))).toBe(true);
    expect(existsSync(join(dir, MANAGED_FILES.tokens))).toBe(true);

    const analyze = createBoundAnalyze();
    const v = await runValidate(dir, createValidateDependencies(sink, analyze));
    expect(v.outcome).toBe("valid");
    expect(exitCodeForOutcome(v.outcome)).toBe(0);

    const i = await runInspect(dir, createInspectDependencies(sink, analyze));
    expect(i.outcome).toBe("valid");
    if (i.outcome === "valid") {
      const insp = i.inspection;
      expect(insp.identity?.name).toEqual({ value: "Acme Design System", trust: "valid" });
      expect(insp.files.present.map((f) => f.relativePath)).toEqual([MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens]);
      expect(insp.tokens?.total).toBe(2); // base + alias
      expect(insp.tokens?.aliases).toBe(1);
      expect(insp.tokens?.byType).toEqual({ color: 2 });
      expect(insp.validation.errors).toEqual([]);
    }

    // Idempotencia: validate/inspect no impiden el unchanged.
    const init2 = await runRealInit(dir);
    expect(init2.result.status).toBe("unchanged");
    expect(init2.exitCode).toBe(2);
  });
});

describe("T048 — invariantes canónicos de los documentos de init", () => {
  it("config canónico intacto", () => {
    expect(buildConfig()).toEqual({ configSchemaVersion: "0.1.0", designSystemDir: "design-system", formatVersion: "2025.10" });
  });

  it("color sRGB objeto y alias {color.base.blue-500} intactos", () => {
    const t = buildTokens() as { color: { base: { "blue-500": { $value: unknown } }; brand: { primary: { $value: unknown } } } };
    expect(t.color.base["blue-500"].$value).toEqual({
      colorSpace: "srgb",
      components: [0.231372549, 0.509803922, 0.964705882],
      alpha: 1,
      hex: "#3b82f6",
    });
    expect(t.color.brand.primary.$value).toBe("{color.base.blue-500}");
  });
});

describe("T048 — separación schema estricto (001) ≠ read-validator (002)", () => {
  it("el documento de init pasa el schema estricto de 001 (validateDtcg) sin errores", () => {
    expect(documentValidators.validateDtcg(buildTokens())).toEqual([]);
  });

  it("el documento de init pasa el read-validator amplio de 002 sin errores", () => {
    const r = traverseDtcgTree(buildTokens());
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
  });

  it("el schema estricto de 001 RECHAZA un tipo no-color (no se relajó)", () => {
    const issues = documentValidators.validateDtcg({ s: { $type: "dimension", $value: "16px" } });
    expect(issues.length).toBeGreaterThan(0); // init solo genera/valida `color`
  });

  it("el read-validator de 002 ACEPTA (con warning) un tipo reconocido no-color", () => {
    const r = traverseDtcgTree({ s: { $type: "dimension", $value: "16px", $description: "d" } });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.code === "dtcg-type-not-deeply-inspected")).toBe(true);
  });
});

describe("T048 — puertos compartidos aditivos no rompen 001", () => {
  it("FileSystem.byteSize implementado en nodeFileSystem, InMemoryFileSystem y faultyFs", async () => {
    expect(typeof nodeFileSystem.byteSize).toBe("function");
    const mem = new InMemoryFileSystem();
    await mem.writeFileExclusive("/a", "abc");
    expect(await mem.byteSize("/a")).toBe(3);
    expect(typeof faultyFs(nodeFileSystem, { op: "rename" }).byteSize).toBe("function");
  });

  it("samplePrepared sigue produciendo exactamente tres documentos", () => {
    expect(samplePrepared().map((f) => f.relativePath)).toEqual([MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens]);
  });
});

describe("T048 — validate/inspect no modifican el DS de init", () => {
  it("el contenido de los tres documentos permanece byte-idéntico", async () => {
    const dir = await host();
    await runRealInit(dir);
    const read = () => [MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens].map((r) => readFileSync(join(dir, r), "utf8"));
    const before = read();
    const analyze = createBoundAnalyze();
    await runValidate(dir, createValidateDependencies(sink, analyze));
    await runInspect(dir, createInspectDependencies(sink, analyze));
    expect(read()).toEqual(before);
  });
});
