// T029/T030 — Tubería compartida analyzeExistingDesignSystem (infra real sobre temp dirs + spies).
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeExistingDesignSystem, type PipelineLimits } from "../../../src/application/analyze-existing-design-system.js";
import type {
  AnalyzeDesignSystemDependencies,
  DtcgAnalyzer,
  ManagedDocumentReader,
} from "../../../src/application/analysis-ports.js";
import { hostRootResolver, documentValidators } from "../../../src/infrastructure/initialize-adapters.js";
import { inspectPresence } from "../../../src/infrastructure/host-root/inspect-presence.js";
import { nodeFileSystem } from "../../../src/infrastructure/fs/node-file-system.js";
import { createManagedDocumentReader } from "../../../src/infrastructure/analysis/managed-document-reader.js";
import { createDtcgAnalyzer } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";
import { ANALYSIS_LIMITS } from "../../../src/domain/traversal/limits.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";

const validManifest = (over: Record<string, unknown> = {}) => ({
  manifestSchemaVersion: "0.1.0",
  name: "Acme",
  slug: "acme",
  version: "0.1.0",
  tokensDir: "tokens",
  description: "d",
  ...over,
});

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function tmp(): Promise<string> {
  const p = await createTmpProject();
  projects.push(p);
  return p.dir;
}
async function writeJson(root: string, rel: string, value: unknown): Promise<void> {
  const abs = join(root, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
}
async function seedValid(root: string): Promise<void> {
  await writeJson(root, MANAGED_FILES.config, buildConfig());
  await writeJson(root, MANAGED_FILES.manifest, validManifest());
  await writeJson(root, MANAGED_FILES.tokens, buildTokens());
}

interface Spies {
  reads: string[];
  analyzeCalls: number;
}
function deps(spies?: Spies, limits: PipelineLimits = ANALYSIS_LIMITS): AnalyzeDesignSystemDependencies {
  const baseReader = createManagedDocumentReader({ fileSystem: nodeFileSystem });
  const reader: ManagedDocumentReader = spies
    ? { read: (req) => (spies.reads.push(req.document), baseReader.read(req)) }
    : baseReader;
  const baseAnalyzer = createDtcgAnalyzer();
  const analyzer: DtcgAnalyzer = spies
    ? { analyze: (doc) => (spies.analyzeCalls++, baseAnalyzer.analyze(doc)) }
    : baseAnalyzer;
  return {
    hostRootResolver,
    presenceInspector: { inspectPresence },
    stateClassifier: { classify: () => ({ kind: "none" }) }, // no usado por la tubería (single-pass)
    documentReader: reader,
    documentValidators,
    dtcgAnalyzer: analyzer,
  };
}
const codes = (r: { errors: readonly { code: string }[] }) => r.errors.map((i) => i.code);

describe("analyzeExistingDesignSystem — estados", () => {
  it("DS válido de init → complete-valid, valid, sin errores", async () => {
    const root = await tmp();
    await seedValid(root);
    const r = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    expect(r.structuralState).toBe("complete-valid");
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.statistics.byType.color).toBeGreaterThanOrEqual(1);
  });

  it("ninguno presente → not-initialized, no válido", async () => {
    const root = await tmp();
    const r = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    expect(r.structuralState).toBe("not-initialized");
    expect(r.valid).toBe(false);
  });

  it("solo config → partial", async () => {
    const root = await tmp();
    await writeJson(root, MANAGED_FILES.config, buildConfig());
    const r = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    expect(r.structuralState).toBe("partial");
    expect(r.valid).toBe(false);
  });

  it("tres presentes con tokens inválidos → complete-invalid", async () => {
    const root = await tmp();
    await writeJson(root, MANAGED_FILES.config, buildConfig());
    await writeJson(root, MANAGED_FILES.manifest, validManifest());
    await writeJson(root, MANAGED_FILES.tokens, { g: { t: { $type: "weird", $value: "v", $description: "d" } } });
    const r = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    expect(r.structuralState).toBe("complete-invalid");
    expect(codes(r)).toContain("dtcg-type-unrecognized");
  });

  it("manifest inválido (slug) → complete-invalid", async () => {
    const root = await tmp();
    await writeJson(root, MANAGED_FILES.config, buildConfig());
    await writeJson(root, MANAGED_FILES.manifest, validManifest({ slug: "Bad Slug!" }));
    await writeJson(root, MANAGED_FILES.tokens, buildTokens());
    const r = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    expect(r.structuralState).toBe("complete-invalid");
    expect(r.valid).toBe(false);
  });

  it("sin package.json → error de host, no se leen documentos", async () => {
    const p = await createTmpProject({ packageJson: false });
    projects.push(p);
    const spies: Spies = { reads: [], analyzeCalls: 0 };
    const r = await analyzeExistingDesignSystem({ executionDir: p.dir }, deps(spies));
    expect(r.valid).toBe(false);
    expect(r.errors.some((i) => i.document === "host")).toBe(true);
    expect(spies.reads).toEqual([]); // no lectura tras fallo de host
  });
});

describe("analyzeExistingDesignSystem — una sola pasada", () => {
  it("una lectura por documento presente y un solo traversal", async () => {
    const root = await tmp();
    await seedValid(root);
    const spies: Spies = { reads: [], analyzeCalls: 0 };
    await analyzeExistingDesignSystem({ executionDir: root }, deps(spies));
    expect(spies.reads).toEqual(["config", "manifest", "tokens"]); // 1 lectura c/u
    expect(spies.analyzeCalls).toBe(1); // un único recorrido DTCG
  });

  it("documento ausente no genera lectura", async () => {
    const root = await tmp();
    await writeJson(root, MANAGED_FILES.config, buildConfig());
    const spies: Spies = { reads: [], analyzeCalls: 0 };
    await analyzeExistingDesignSystem({ executionDir: root }, deps(spies));
    expect(spies.reads).toEqual(["config"]); // manifest/tokens ausentes → sin lectura
    expect(spies.analyzeCalls).toBe(0);
  });
});

describe("analyzeExistingDesignSystem — parseo, presupuesto, coherencia", () => {
  it("JSON roto → json-parse-error, documento unavailable, sin validar", async () => {
    const root = await tmp();
    await writeJson(root, MANAGED_FILES.config, "{ broken");
    await writeJson(root, MANAGED_FILES.manifest, validManifest());
    await writeJson(root, MANAGED_FILES.tokens, buildTokens());
    const r = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    expect(codes(r)).toContain("json-parse-error");
    expect(r.documents[MANAGED_FILES.config]?.trust).toBe("unavailable");
    expect(r.structuralState).toBe("complete-invalid");
  });

  it("presupuesto: maxBytes solicitado = min(maxFileBytes, restante); se agota → unchecked + partial", async () => {
    const root = await tmp();
    await seedValid(root);
    const requested: number[] = [];
    const baseReader = createManagedDocumentReader({ fileSystem: nodeFileSystem });
    const reader: ManagedDocumentReader = { read: (req) => (requested.push(req.maxBytes), baseReader.read(req)) };
    const d: AnalyzeDesignSystemDependencies = { ...deps(), documentReader: reader };
    // límite total minúsculo para forzar agotamiento tras el primer documento.
    const tiny: PipelineLimits = { ...ANALYSIS_LIMITS, maxTotalBytes: 40, maxFileBytes: 40 };
    const r = await analyzeExistingDesignSystem({ executionDir: root }, d, tiny);
    expect(requested[0]).toBe(40); // min(40, 40)
    expect(r.limits.partial).toBe(true);
    expect(codes(r).some((c) => c === "limit-total-size-exceeded" || c === "limit-file-size-exceeded")).toBe(true);
  });

  it("coherencia: config.designSystemDir incorrecto → coherence-design-system-dir", async () => {
    const root = await tmp();
    await writeJson(root, MANAGED_FILES.config, { ...buildConfig(), designSystemDir: "otro-dir" });
    await writeJson(root, MANAGED_FILES.manifest, validManifest());
    await writeJson(root, MANAGED_FILES.tokens, buildTokens());
    const r = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    expect(codes(r)).toContain("coherence-design-system-dir");
    expect(r.structuralState).toBe("complete-invalid");
  });
});

describe("analyzeExistingDesignSystem — seguridad, determinismo, pureza", () => {
  it("symlink externo en design-system → error de lectura, no sigue el enlace", async () => {
    const root = await tmp();
    const outside = await tmp();
    await writeJson(root, MANAGED_FILES.config, buildConfig());
    await writeJson(outside, "design-system.json", validManifest());
    await symlink(outside, join(root, "design-system"), "dir");
    const r = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    expect(codes(r)).toContain("read-symlink-external");
  });

  it("determinismo: misma entrada ⇒ mismo análisis", async () => {
    const root = await tmp();
    await seedValid(root);
    const a = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    const b = await analyzeExistingDesignSystem({ executionDir: root }, deps());
    expect(a).toEqual(b);
  });

  it("desde subcarpeta resuelve la raíz anfitriona correcta", async () => {
    const root = await tmp();
    await seedValid(root);
    await mkdir(join(root, "src", "deep"), { recursive: true });
    const r = await analyzeExistingDesignSystem({ executionDir: join(root, "src", "deep") }, deps());
    expect(r.valid).toBe(true);
    expect(r.host.root).toContain(root.split("/").pop() as string);
  });
});
