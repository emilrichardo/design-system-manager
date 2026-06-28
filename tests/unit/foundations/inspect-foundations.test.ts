// T029 (004) — Caso de uso headless foundations: una llamada al analyzer, una proyección y reporter.
import { describe, expect, it, vi } from "vitest";
import { inspectFoundations } from "../../../src/application/foundations/inspect-foundations.js";
import { projectFoundationMetadata } from "../../../src/application/foundations/metadata-pass.js";
import { projectFoundations } from "../../../src/application/foundations/project-foundations.js";
import { classifyFoundationsOutcome } from "../../../src/application/foundations/classify-foundations-outcome.js";
import type {
  FoundationsReporter,
  FoundationsResult,
  InspectFoundationsDependencies,
} from "../../../src/application/foundations/foundations-ports.js";
import type { DesignSystemAnalysis, ParsedDocument } from "../../../src/domain/analysis/design-system-analysis.js";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";
import { emptyStatistics } from "../../../src/domain/analysis/inspection-statistics.js";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";
import { noLimitsReached, analysisLimitsResult } from "../../../src/domain/traversal/limits.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { NEURAZ_EXTENSION_NAMESPACE } from "../../../src/domain/foundations/parse-foundation-extension.js";
import { deepFreeze } from "../json/json-test-utils.js";

const NS = NEURAZ_EXTENSION_NAMESPACE;

class RecordingFoundationsReporter implements FoundationsReporter {
  readonly completedResults: FoundationsResult[] = [];

  completed(result: FoundationsResult): void {
    this.completedResults.push(result);
  }
}

const ext = (level: unknown) => ({
  $extensions: { [NS]: { foundation: { level } } },
});

const tokenDoc = (parsed: unknown): ParsedDocument => ({
  relativePath: MANAGED_FILES.tokens,
  exists: true,
  kind: "file",
  parsed,
  trust: "valid",
  issues: [],
});

const unavailableTokenDoc = (): ParsedDocument => ({
  relativePath: MANAGED_FILES.tokens,
  exists: true,
  kind: "file",
  trust: "unavailable",
  issues: [analysisError("read-failed", "read", { document: "tokens", path: MANAGED_FILES.tokens })],
});

const node = (over: Partial<TokenNodeSummary> = {}): TokenNodeSummary => ({
  path: "color.base",
  declaredType: "color",
  effectiveType: "color",
  typeOrigin: "own",
  typeSourcePath: null,
  kind: "concrete",
  aliasTarget: null,
  aliasState: "n/a",
  description: null,
  depth: 2,
  trust: "valid",
  ...over,
});

const analysis = (over: Partial<DesignSystemAnalysis> = {}): DesignSystemAnalysis => ({
  host: { root: "/repo", designSystemPath: "/repo/design-system" },
  presence: { present: [MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens], missing: [] },
  structuralState: "complete-valid",
  documents: {},
  nodes: [],
  statistics: emptyStatistics,
  errors: [],
  warnings: [],
  limits: noLimitsReached,
  valid: true,
  ...over,
});

function depsFor(analysisResult: DesignSystemAnalysis, reporter: FoundationsReporter = new RecordingFoundationsReporter()) {
  const analyze = vi.fn(async () => analysisResult);
  const projectMetadata = vi.fn(projectFoundationMetadata);
  const projectInspection = vi.fn(projectFoundations);
  const classifyOutcome = vi.fn(classifyFoundationsOutcome);
  const deps: InspectFoundationsDependencies = {
    analyze,
    reporter,
    projectMetadata,
    projectInspection,
    classifyOutcome,
  };
  return { deps, analyze, reporter, projectMetadata, projectInspection, classifyOutcome };
}

describe("inspectFoundations (T027/T028/T029)", () => {
  it("valid: usa parsed existente, proyecta una vez, clasifica una vez y completa reporter con el mismo resultado", async () => {
    const parsed = { color: { base: { ...ext("primitive"), $type: "color", $value: "#fff" } } };
    const a = analysis({
      documents: { [MANAGED_FILES.tokens]: tokenDoc(parsed) },
      nodes: [node({ path: "color.base" })],
    });
    const { deps, analyze, reporter, projectMetadata, projectInspection, classifyOutcome } = depsFor(a);

    const result = await inspectFoundations({ executionDir: "/repo" }, deps);

    expect(result.outcome).toBe("valid");
    expect(analyze).toHaveBeenCalledOnce();
    expect(analyze).toHaveBeenCalledWith({ executionDir: "/repo" });
    expect(projectMetadata).toHaveBeenCalledOnce();
    expect(projectMetadata).toHaveBeenCalledWith(parsed);
    expect(projectInspection).toHaveBeenCalledOnce();
    expect(classifyOutcome).toHaveBeenCalledOnce();
    expect(reporter.completedResults).toEqual([result]);
    if (result.outcome === "valid") {
      expect(result.inspection.categories[0]?.state).toBe("complete");
      expect(result.inspection.validation.valid).toBe(true);
    }
  });

  it("partial foundation post-init conceptual: color partial, resto absent, sin tocar init", async () => {
    const parsed = {
      color: {
        base: { $type: "color", $value: "#fff" },
        brand: { $type: "color", $value: "{color.base}" },
      },
    };
    const a = analysis({
      documents: { [MANAGED_FILES.tokens]: tokenDoc(parsed) },
      nodes: [
        node({ path: "color.base" }),
        node({ path: "color.brand", kind: "alias", aliasTarget: "color.base", aliasState: "valid", typeOrigin: "alias" }),
      ],
    });

    const result = await inspectFoundations({ executionDir: "/repo" }, depsFor(a).deps);

    expect(result.outcome).toBe("partial");
    if (result.outcome === "partial") {
      expect(result.inspection.categories[0]).toMatchObject({
        id: "color",
        state: "partial",
        counts: { total: 2, primitive: 0, semantic: 0, unclassified: 2 },
      });
      expect(result.inspection.summary.categories).toEqual({ absent: 8, partial: 1, complete: 0, invalid: 0 });
    }
  });

  it("complete-invalid: metadata primitive→semantic conserva inspección recuperable", async () => {
    const parsed = {
      color: {
        alias: { ...ext("primitive"), $type: "color", $value: "{color.role}" },
        role: { ...ext("semantic"), $type: "color", $value: "#fff" },
      },
    };
    const a = analysis({
      documents: { [MANAGED_FILES.tokens]: tokenDoc(parsed) },
      nodes: [
        node({ path: "color.alias", kind: "alias", aliasTarget: "color.role", aliasState: "valid", typeOrigin: "alias" }),
        node({ path: "color.role" }),
      ],
    });

    const result = await inspectFoundations({ executionDir: "/repo" }, depsFor(a).deps);

    expect(result.outcome).toBe("complete-invalid");
    if (result.outcome === "complete-invalid") {
      expect(result.inspection.validation.errors[0]?.code).toBe("foundation-forbidden-dependency");
      expect(result.inspection.categories[0]?.state).toBe("invalid");
    }
  });

  it("partial estructural gana aunque una categoría foundation sea invalid", async () => {
    const parsed = { spacing: { bad: { ...ext("primitive"), $type: "color", $value: "#fff" } } };
    const a = analysis({
      structuralState: "partial",
      valid: false,
      documents: { [MANAGED_FILES.tokens]: tokenDoc(parsed) },
      nodes: [node({ path: "spacing.bad", effectiveType: "color" })],
    });

    const result = await inspectFoundations({ executionDir: "/repo" }, depsFor(a).deps);

    expect(result.outcome).toBe("partial");
    if (result.outcome === "partial") expect(result.inspection.categories[1]?.state).toBe("invalid");
  });

  it("not-found: no inventa inspección y no ejecuta metadata/projection", async () => {
    const a = analysis({
      host: { root: "/missing", designSystemPath: null },
      presence: { present: [], missing: [MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens] },
      structuralState: "not-initialized",
      valid: false,
    });
    const { deps, projectMetadata, projectInspection, classifyOutcome, reporter } = depsFor(a);

    const result = await inspectFoundations({ executionDir: "/missing" }, deps);

    expect(result).toEqual({ outcome: "not-found", host: a.host, inspection: null, hostError: null });
    expect(projectMetadata).not.toHaveBeenCalled();
    expect(projectInspection).not.toHaveBeenCalled();
    expect(classifyOutcome).toHaveBeenCalledOnce();
    expect(reporter.completedResults).toEqual([result]);
  });

  it("not-found por host no resuelto usa host null", async () => {
    const a = analysis({
      host: { root: "/exec", designSystemPath: null },
      structuralState: "not-initialized",
      errors: [analysisError("host-package-json-missing", "sin package", { document: "host" })],
      valid: false,
    });

    const result = await inspectFoundations({ executionDir: "/exec" }, depsFor(a).deps);

    expect(result).toMatchObject({ outcome: "not-found", host: null, inspection: null, hostError: null });
  });

  it("read-error: parsed ausente no lanza, metadata recibe undefined y conserva inspection recuperable", async () => {
    const a = analysis({
      structuralState: "complete-invalid",
      documents: { [MANAGED_FILES.tokens]: unavailableTokenDoc() },
      errors: [analysisError("read-failed", "read", { document: "tokens", path: MANAGED_FILES.tokens })],
      valid: false,
    });
    const { deps, projectMetadata } = depsFor(a);

    const result = await inspectFoundations({ executionDir: "/repo" }, deps);

    expect(result.outcome).toBe("read-error");
    expect(projectMetadata).toHaveBeenCalledWith(undefined);
    if (result.outcome === "read-error") {
      expect(result.inspection.categories).toHaveLength(9);
      expect(result.inspection.summary.categories.absent).toBe(9);
    }
  });

  it("metadata semantic y categoría unresolved se preservan como partial recuperable", async () => {
    const parsed = { background: { default: { ...ext("semantic"), $type: "color", $value: "#fff" } } };
    const a = analysis({
      documents: { [MANAGED_FILES.tokens]: tokenDoc(parsed) },
      nodes: [node({ path: "background.default" })],
    });

    const result = await inspectFoundations({ executionDir: "/repo" }, depsFor(a).deps);

    expect(result.outcome).toBe("partial");
    if (result.outcome === "partial") {
      expect(result.inspection.unresolved.map((token) => token.path)).toEqual(["background.default"]);
      expect(result.inspection.unresolved[0]?.level).toBe("semantic");
      expect(result.inspection.summary.tokens.unresolved).toBe(1);
    }
  });

  it("metadata inválida produce inspection invalid y una sola issue de metadata", async () => {
    const parsed = {
      color: {
        ...ext("core"),
        a: { $type: "color", $value: "#fff" },
        b: { $type: "color", $value: "#000" },
      },
    };
    const a = analysis({
      documents: { [MANAGED_FILES.tokens]: tokenDoc(parsed) },
      nodes: [node({ path: "color.a" }), node({ path: "color.b" })],
    });

    const result = await inspectFoundations({ executionDir: "/repo" }, depsFor(a).deps);

    expect(result.outcome).toBe("complete-invalid");
    if (result.outcome === "complete-invalid") {
      expect(result.inspection.validation.errors.map((issue) => issue.code)).toEqual(["foundation-level-invalid"]);
      expect(result.inspection.categories[0]?.state).toBe("invalid");
    }
  });

  it("todas las categorías absent con análisis estructural válido → valid", async () => {
    const a = analysis({ documents: { [MANAGED_FILES.tokens]: tokenDoc({}) }, nodes: [] });
    const result = await inspectFoundations({ executionDir: "/repo" }, depsFor(a).deps);

    expect(result.outcome).toBe("valid");
    if (result.outcome === "valid") {
      expect(result.inspection.categories).toHaveLength(9);
      expect(result.inspection.summary.categories.absent).toBe(9);
    }
  });

  it("limits.partial produce partial y se conserva en validation/limits", async () => {
    const parsed = { color: { base: { ...ext("primitive"), $type: "color", $value: "#fff" } } };
    const limits = analysisLimitsResult([{ limit: "nodes", detail: "> 1" }]);
    const a = analysis({
      documents: { [MANAGED_FILES.tokens]: tokenDoc(parsed) },
      nodes: [node({ path: "color.base" })],
      limits,
      valid: false,
    });

    const result = await inspectFoundations({ executionDir: "/repo" }, depsFor(a).deps);

    expect(result.outcome).toBe("partial");
    if (result.outcome === "partial") {
      expect(result.inspection.limits).toBe(limits);
      expect(result.inspection.validation.limits).toBe(limits);
    }
  });

  it("propaga errores del reporter y no lo llama dos veces", async () => {
    const parsed = { color: { base: { ...ext("primitive"), $type: "color", $value: "#fff" } } };
    const completed = vi.fn(() => { throw new Error("reporter failed"); });
    const reporter: FoundationsReporter = { completed };
    const a = analysis({
      documents: { [MANAGED_FILES.tokens]: tokenDoc(parsed) },
      nodes: [node({ path: "color.base" })],
    });
    const { deps } = depsFor(a, reporter);

    await expect(inspectFoundations({ executionDir: "/repo" }, deps)).rejects.toThrow("reporter failed");
    expect(completed).toHaveBeenCalledOnce();
  });

  it("no muta analysis/documents/parsed/nodes/issues/limits y es determinista", async () => {
    const parsed = { color: { base: { ...ext("primitive"), $type: "color", $value: "#fff" } } };
    const a = deepFreeze(analysis({
      documents: { [MANAGED_FILES.tokens]: tokenDoc(parsed) },
      nodes: [node({ path: "color.base" })],
    }));

    const first = await inspectFoundations({ executionDir: "/repo" }, depsFor(a).deps);
    const second = await inspectFoundations({ executionDir: "/repo" }, depsFor(a).deps);

    expect(first).toEqual(second);
    expect(a.documents[MANAGED_FILES.tokens]?.parsed).toEqual(parsed);
  });
});
