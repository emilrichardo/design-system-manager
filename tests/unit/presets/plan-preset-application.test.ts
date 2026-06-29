// T053 (005) — Caso de uso headless `planPresetApplication`: outcomes (preset/design-system not-found,
// invalid-preset, read-error, success, unchanged, conflict), una sola invocación del análisis del host,
// target lógico, preview con cambios seguros, sin escrituras.
import { describe, expect, it, vi } from "vitest";
import { planPresetApplication } from "../../../src/application/presets/plan-preset-application.js";
import { analyzePresetTokens } from "../../../src/infrastructure/presets/preset-token-analyzer.js";
import { createDtcgAnalyzer } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";
import { createPresetEnvelope } from "../../../src/domain/presets/preset-envelope.js";
import type { PresetEnvelope } from "../../../src/domain/presets/preset-envelope.js";
import type { PresetCatalogPort } from "../../../src/application/presets/preset-ports.js";
import type { AnalyzeUseCase } from "../../../src/application/analysis-ports.js";
import type { DesignSystemAnalysis, ParsedDocument } from "../../../src/domain/analysis/design-system-analysis.js";
import type { StructuralState } from "../../../src/domain/analysis/structural-state.js";
import type { PresetId } from "../../../src/domain/presets/preset-id.js";

const NS = "ar.neuraz.design-system-manager";
const cv = (c: number) => ({ colorSpace: "srgb", components: [c, c, c] });
const TOKENS = "design-system/tokens/base.tokens.json";

const presetTokens = (grayValue = 0): Record<string, unknown> => ({
  color: {
    $type: "color",
    $extensions: { [NS]: { foundation: { level: "primitive" } } },
    gray: { "100": { $value: cv(grayValue) } },
    surface: { $extensions: { [NS]: { foundation: { level: "semantic" } } }, default: { $value: "{color.gray.100}" } },
  },
});

function envelope(tokens: Record<string, unknown>, categories: readonly string[] = ["color"]): PresetEnvelope {
  const built = createPresetEnvelope({ id: "neutral-base", name: "N", description: "d", version: "1.0.0", includedCategories: categories, tokens });
  if (!built.ok) throw new Error("fixture invalid");
  return built.value;
}

const VALID = envelope(presetTokens());
const INVALID = envelope({ color: { $type: "color", a: { $value: cv(0) } }, spacing: { $type: "dimension", "100": { $value: { value: 4, unit: "px" } } } }, ["color"]);

function catalog(env: PresetEnvelope | null): PresetCatalogPort {
  return {
    load: vi.fn(async () => ({ ok: true, entries: [] })),
    list: vi.fn(async () => []),
    get: vi.fn(async () => env),
  };
}

function hostAnalysis(parsed: unknown, structuralState: StructuralState = "complete-valid"): DesignSystemAnalysis {
  const dtcg = createDtcgAnalyzer().analyze(parsed);
  const documents: Record<string, ParsedDocument> = { [TOKENS]: { relativePath: TOKENS, exists: true, kind: "file", parsed, trust: "valid", issues: [] } };
  return { host: { root: "/x", designSystemPath: "/x/ds" }, presence: { present: [], missing: [] }, structuralState, documents, nodes: dtcg.nodes, statistics: dtcg.statistics, errors: [], warnings: [], limits: dtcg.limits, valid: true };
}

const emptyHost = (structuralState: StructuralState): DesignSystemAnalysis => ({
  host: { root: "/x", designSystemPath: structuralState === "not-initialized" ? null : "/x/ds" },
  presence: { present: [], missing: [] },
  structuralState,
  documents: {},
  nodes: [],
  statistics: { totalTokens: 0, totalGroups: 0, byType: {}, byTrust: { valid: 0, recovered: 0, untrusted: 0 } },
  errors: [],
  warnings: [],
  limits: { reached: false, hits: [], partial: false },
  valid: structuralState !== "not-initialized",
});

const hostFn = (analysis: DesignSystemAnalysis): AnalyzeUseCase => vi.fn(async () => analysis);
const deps = (env: PresetEnvelope | null, host: AnalyzeUseCase) => ({ catalog: catalog(env), analyzeTokens: analyzePresetTokens, analyzeHost: host });
const input = { id: "neutral-base" as PresetId, executionDir: "/x" };

describe("planPresetApplication (T053)", () => {
  it("preset not-found → not-found:preset (host not analyzed)", async () => {
    const host = hostFn(emptyHost("complete-valid"));
    const r = await planPresetApplication(input, deps(null, host));
    expect(r).toMatchObject({ outcome: "not-found", notFoundResource: "preset", plan: null });
    expect(host).not.toHaveBeenCalled();
  });

  it("invalid preset → invalid-preset (host not analyzed, no diff)", async () => {
    const host = hostFn(emptyHost("complete-valid"));
    const r = await planPresetApplication(input, deps(INVALID, host));
    expect(r.outcome).toBe("invalid-preset");
    expect(host).not.toHaveBeenCalled();
  });

  it("design system not-initialized → not-found:design-system", async () => {
    const r = await planPresetApplication(input, deps(VALID, hostFn(emptyHost("not-initialized"))));
    expect(r).toMatchObject({ outcome: "not-found", notFoundResource: "design-system" });
  });

  it("unreadable host token document → read-error", async () => {
    const analysis: DesignSystemAnalysis = { ...emptyHost("partial"), documents: { [TOKENS]: { relativePath: TOKENS, exists: true, kind: "file", trust: "unavailable", issues: [] } } };
    const r = await planPresetApplication(input, deps(VALID, hostFn(analysis)));
    expect(r.outcome).toBe("read-error");
  });

  it("empty initialized host → success with creates, writable, wouldWrite", async () => {
    const host = hostFn(emptyHost("partial"));
    const r = await planPresetApplication(input, deps(VALID, host));
    expect(r.outcome).toBe("success");
    if (r.outcome !== "success") return;
    expect(r.plan.targetFile).toBe(TOKENS);
    expect(r.plan.plan.writable).toBe(true);
    expect(r.plan.plan.summary.wouldWrite).toBe(true);
    expect(r.plan.plan.summary.create).toBeGreaterThan(0);
    expect(host).toHaveBeenCalledTimes(1);
  });

  it("host already equivalent → unchanged (writable, not wouldWrite)", async () => {
    const r = await planPresetApplication(input, deps(VALID, hostFn(hostAnalysis(presetTokens()))));
    expect(r.outcome).toBe("unchanged");
    if (r.outcome !== "unchanged") return;
    expect(r.plan.plan.writable).toBe(true);
    expect(r.plan.plan.summary.wouldWrite).toBe(false);
  });

  it("conflicting host value → conflict, not writable, safe creates preserved for preview", async () => {
    // Host: gray.100 con valor distinto y sin el grupo surface (creates seguros).
    const conflictingHost = { color: { $type: "color", $extensions: { [NS]: { foundation: { level: "primitive" } } }, gray: { "100": { $value: cv(0.5) } } } };
    const r = await planPresetApplication(input, deps(VALID, hostFn(hostAnalysis(conflictingHost))));
    expect(r.outcome).toBe("conflict");
    if (r.outcome !== "conflict") return;
    expect(r.plan.plan.writable).toBe(false);
    expect(r.plan.plan.summary.conflict).toBeGreaterThan(0);
    expect(r.plan.plan.summary.create).toBeGreaterThan(0); // surface creates preserved
  });

  it("is deterministic", async () => {
    const a = await planPresetApplication(input, deps(VALID, hostFn(hostAnalysis(presetTokens()))));
    const b = await planPresetApplication(input, deps(VALID, hostFn(hostAnalysis(presetTokens()))));
    expect(a).toEqual(b);
  });
});
