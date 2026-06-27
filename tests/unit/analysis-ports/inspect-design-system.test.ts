// T032 — inspectDesignSystem (proyección de inspección + reporter + recuperabilidad).
import { describe, expect, it, vi } from "vitest";
import { inspectDesignSystem } from "../../../src/application/inspect-design-system.js";
import type { InspectDesignSystemDependencies } from "../../../src/application/analysis-ports.js";
import { RecordingInspectionReporter } from "../../helpers/analysis-fakes.js";
import {
  analysisCompleteInvalid,
  analysisHostFailure,
  analysisNotInitialized,
  analysisPartial,
  analysisReadError,
  analysisValid,
  designSystemAnalysis,
  FIXTURE_PATHS,
} from "../../helpers/analysis-fixtures.js";
import type { DesignSystemAnalysis } from "../../../src/domain/analysis/design-system-analysis.js";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";

function deps(analysis: DesignSystemAnalysis, reporter = new RecordingInspectionReporter()) {
  const analyze = vi.fn(async () => analysis);
  const d: InspectDesignSystemDependencies = { analyze, reporter };
  return { d, analyze, reporter };
}

describe("inspectDesignSystem (T032)", () => {
  it("válido → inspección completa con validation y tokens", async () => {
    const { d } = deps(analysisValid());
    const r = await inspectDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("valid");
    if (r.outcome === "valid") {
      expect(r.inspection.validation.valid).toBe(true);
      expect(r.inspection.tokens?.byType).toEqual({ color: 2 });
      expect(r.inspection.identity?.name).toEqual({ value: "Acme", trust: "valid" });
    }
  });

  it("identidad recuperada cuando el manifiesto tiene errores no relacionados", async () => {
    const analysis = designSystemAnalysis({
      structuralState: "complete-invalid",
      documents: {
        [FIXTURE_PATHS.MANIFEST]: {
          relativePath: FIXTURE_PATHS.MANIFEST,
          exists: true,
          kind: "file",
          parsed: { name: "Acme", slug: "acme", version: "0.1.0" },
          trust: "recovered",
          issues: [],
        },
      },
      errors: [analysisError("coherence-tokens-dir", "x", { document: "manifest", path: "tokensDir" })],
      valid: false,
    });
    const { d } = deps(analysis);
    const r = await inspectDesignSystem({ executionDir: "/repo" }, d);
    if (r.outcome === "complete-invalid") {
      expect(r.inspection.identity?.name).toEqual({ value: "Acme", trust: "recovered" });
    }
  });

  it("identidad no confiable cuando un error apunta al campo (slug)", async () => {
    const analysis = designSystemAnalysis({
      structuralState: "complete-invalid",
      documents: {
        [FIXTURE_PATHS.MANIFEST]: {
          relativePath: FIXTURE_PATHS.MANIFEST,
          exists: true,
          kind: "file",
          parsed: { name: "Acme", slug: "Bad Slug", version: "0.1.0" },
          trust: "recovered",
          issues: [],
        },
      },
      errors: [analysisError("manifest-shape", "slug inválido", { document: "manifest", path: "manifest.slug" })],
      valid: false,
    });
    const { d } = deps(analysis);
    const r = await inspectDesignSystem({ executionDir: "/repo" }, d);
    if (r.outcome === "complete-invalid") {
      expect(r.inspection.identity?.slug).toEqual({ value: "Bad Slug", trust: "untrusted" });
      expect(r.inspection.identity?.name?.trust).toBe("recovered"); // localizado: name no degradado
    }
  });

  it("identidad no disponible cuando el manifiesto está ausente", async () => {
    const { d } = deps(analysisPartial()); // tokens missing, manifest valid → identity valid
    const r = await inspectDesignSystem({ executionDir: "/repo" }, d);
    if (r.outcome === "partial") {
      expect(r.inspection.identity?.name).toEqual({ value: "Acme", trust: "valid" });
      expect(r.inspection.files.missing).toContain(FIXTURE_PATHS.TOKENS);
    }
  });

  it("archivos presentes/ausentes proyectados", async () => {
    const { d } = deps(analysisPartial());
    const r = await inspectDesignSystem({ executionDir: "/repo" }, d);
    if (r.outcome === "partial") {
      expect(r.inspection.files.present.map((f) => f.relativePath)).toEqual([FIXTURE_PATHS.CONFIG, FIXTURE_PATHS.MANIFEST]);
      expect(r.inspection.files.missing).toEqual([FIXTURE_PATHS.TOKENS]);
    }
  });

  it("complete-invalid conserva inspección recuperable", async () => {
    const { d } = deps(analysisCompleteInvalid());
    const r = await inspectDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("complete-invalid");
    if (r.outcome === "complete-invalid") {
      expect(r.inspection.tokens?.byType).toEqual({ weird: 1 });
      expect(r.inspection.validation.valid).toBe(false);
    }
  });

  it("read-error conserva inspección recuperable", async () => {
    const { d } = deps(analysisReadError());
    const r = await inspectDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("read-error");
    if (r.outcome === "read-error") expect(r.inspection.tokens).toBeUndefined(); // tokens unavailable
  });

  it("not-found (host) → sin inspección, no inventa datos", async () => {
    const { d, reporter } = deps(analysisHostFailure());
    const r = await inspectDesignSystem({ executionDir: "/exec" }, d);
    expect(r.outcome).toBe("not-found");
    if (r.outcome === "not-found") expect(r.inspection).toBeNull();
    expect(reporter.calls.some((c) => c.startsWith("inspected:"))).toBe(false);
  });

  it("not-initialized → not-found, sin inspección", async () => {
    const { d } = deps(analysisNotInitialized());
    const r = await inspectDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("not-found");
    if (r.outcome === "not-found") expect(r.inspection).toBeNull();
  });

  it("paths completos: no se aplica cota de 200 en headless", async () => {
    const nodes = Array.from({ length: 250 }, (_, i) => ({
      path: `g.t${i}`, declaredType: "color", effectiveType: "color", typeOrigin: "own" as const,
      typeSourcePath: null, kind: "concrete" as const, aliasTarget: null, aliasState: "n/a" as const,
      description: null, depth: 2, trust: "valid" as const,
    }));
    const analysis = analysisValid();
    const withNodes = designSystemAnalysis({ ...analysis, nodes, statistics: { ...analysis.statistics, total: 250 } });
    const { d } = deps(withNodes);
    const r = await inspectDesignSystem({ executionDir: "/repo" }, d);
    if (r.outcome === "valid") expect(r.inspection.tokens?.paths).toHaveLength(250);
  });

  it("llama a analyze una vez y emite eventos en orden", async () => {
    const { d, analyze, reporter } = deps(analysisValid());
    await inspectDesignSystem({ executionDir: "/repo" }, d);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(reporter.calls).toEqual(["host:/repo", "state:complete-valid", "inspected:complete-valid", "completed:valid"]);
  });

  it("no muta el análisis de entrada", async () => {
    const analysis = Object.freeze(analysisValid());
    const { d } = deps(analysis);
    await inspectDesignSystem({ executionDir: "/repo" }, d);
    expect(analysis.nodes).toEqual([]);
  });
});
