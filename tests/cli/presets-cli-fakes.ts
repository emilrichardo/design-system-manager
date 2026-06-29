// Fakes compartidos por las pruebas de CLI de presets (Checkpoint J). Construyen un `CliRuntime` con
// `presetsDeps` reales (catálogo empaquetado + analyzePresetTokens + reporters) y dependencias de host/
// escritura inyectables para forzar cada outcome sin filesystem.
import { vi } from "vitest";
import type { CliRuntime } from "../../src/cli/program.js";
import type { PresetsCliDependencies } from "../../src/cli/composition.js";
import { PresetsTerminalReporter } from "../../src/infrastructure/reporter/presets-terminal-reporter.js";
import { PresetsJsonReporter } from "../../src/infrastructure/reporter/presets-json-reporter.js";
import { createBundledPresetCatalog } from "../../src/infrastructure/presets/bundled-preset-catalog.js";
import { analyzePresetTokens } from "../../src/infrastructure/presets/preset-token-analyzer.js";
import { createDtcgAnalyzer } from "../../src/infrastructure/analysis/dtcg-read-validator.js";
import { createPresetEnvelope } from "../../src/domain/presets/preset-envelope.js";
import type { PresetEnvelope } from "../../src/domain/presets/preset-envelope.js";
import type { PresetCatalogPort } from "../../src/application/presets/preset-ports.js";
import type { SingleFileAtomicWriter, PresetTargetReader, SingleFileWriteOutcome } from "../../src/application/presets/single-file-writer-port.js";
import type { AnalyzeUseCase } from "../../src/application/analysis-ports.js";
import type { DesignSystemAnalysis, ParsedDocument } from "../../src/domain/analysis/design-system-analysis.js";
import type { StructuralState } from "../../src/domain/analysis/structural-state.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";

export const TOKENS = "design-system/tokens/base.tokens.json";
export const NS = "ar.neuraz.design-system-manager";
export const cv = (c: number) => ({ colorSpace: "srgb", components: [c, c, c] });

export function nullIO() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (t: string) => out.push(t), err: (t: string) => err.push(t) }, out, err };
}

export function envelope(tokens: Record<string, unknown>, categories: readonly string[] = ["color"], id = "neutral-base"): PresetEnvelope {
  const built = createPresetEnvelope({ id, name: "N", description: "d", version: "1.0.0", includedCategories: categories, tokens });
  if (!built.ok) throw new Error("fixture envelope invalid");
  return built.value;
}

/** Preset válido (color: gris primitivo + superficie semántica). */
export const VALID = envelope({
  color: {
    $type: "color",
    $extensions: { [NS]: { foundation: { level: "primitive" } } },
    gray: { "100": { $value: cv(0) } },
    surface: { $extensions: { [NS]: { foundation: { level: "semantic" } } }, default: { $value: "{color.gray.100}" } },
  },
});

/** Envelope de forma válida pero contenido inválido (token bajo categoría no declarada). */
export const INVALID = envelope({ color: { $type: "color", a: { $value: cv(0) } }, spacing: { $type: "dimension", "100": { $value: { value: 4, unit: "px" } } } }, ["color"]);

export function fakeCatalog(env: PresetEnvelope | null, opts: { invalidLoad?: boolean } = {}): PresetCatalogPort {
  return {
    load: vi.fn(async () => (opts.invalidLoad ? { ok: false as const, reason: "duplicate-id" } : { ok: true as const, entries: [] })),
    list: vi.fn(async () => []),
    get: vi.fn(async () => env),
  };
}

export const emptyStats = { totalTokens: 0, totalGroups: 0, byType: {}, byTrust: { valid: 0, recovered: 0, untrusted: 0 } };
export const noLimits = { reached: false, hits: [] as const, partial: false };

export function hostAnalysis(parsed: unknown, structuralState: StructuralState = "complete-valid"): DesignSystemAnalysis {
  const dtcg = createDtcgAnalyzer().analyze(parsed);
  const documents: Record<string, ParsedDocument> = { [TOKENS]: { relativePath: TOKENS, exists: true, kind: "file", parsed, trust: "valid", issues: [] } };
  return { host: { root: "/host", designSystemPath: "/host/ds" }, presence: { present: [], missing: [] }, structuralState, documents, nodes: dtcg.nodes, statistics: dtcg.statistics, errors: [], warnings: [], limits: dtcg.limits, valid: true };
}

export function emptyHost(structuralState: StructuralState): DesignSystemAnalysis {
  return { host: { root: "/host", designSystemPath: structuralState === "not-initialized" ? null : "/host/ds" }, presence: { present: [], missing: [] }, structuralState, documents: {}, nodes: [], statistics: emptyStats, errors: [], warnings: [], limits: noLimits, valid: structuralState !== "not-initialized" };
}

export function readErrorHost(): DesignSystemAnalysis {
  return { ...emptyHost("partial"), documents: { [TOKENS]: { relativePath: TOKENS, exists: true, kind: "file", trust: "unavailable", issues: [] } } };
}

export function fakeTargetReader(content: string | null, outcome: "success" | "not-found" | "read-error" = "success"): PresetTargetReader {
  return {
    read: vi.fn(async () =>
      outcome === "success" ? { outcome: "success" as const, content: content ?? "{}\n" } : { outcome, content: null, error: outcome },
    ),
  };
}

export function fakeWriter(outcome: SingleFileWriteOutcome = "written"): SingleFileAtomicWriter {
  return {
    write: vi.fn(async () => ({ outcome, wrote: outcome === "written", relativePath: TOKENS, backupRelativePath: null, error: outcome === "written" ? null : { code: outcome, message: outcome } })),
    cleanupBackup: vi.fn(async () => ({ ok: true, error: null })),
  };
}

export interface PresetsRuntimeParts {
  readonly catalog?: PresetCatalogPort;
  readonly analyzeHost?: AnalyzeUseCase;
  readonly targetReader?: PresetTargetReader;
  readonly writer?: SingleFileAtomicWriter;
}

export function presetsDeps(io: CliRuntime["io"], parts: PresetsRuntimeParts = {}): PresetsCliDependencies {
  return {
    base: {
      catalog: parts.catalog ?? createBundledPresetCatalog(),
      analyzeTokens: analyzePresetTokens,
      analyzeHost: parts.analyzeHost ?? (async () => emptyHost("not-initialized")),
      targetReader: parts.targetReader ?? fakeTargetReader("{}\n"),
      writer: parts.writer ?? fakeWriter("written"),
    },
    terminal: new PresetsTerminalReporter(io),
    json: new PresetsJsonReporter(io),
  };
}

export function runtime(io: CliRuntime["io"], argv: string, parts: PresetsRuntimeParts = {}): CliRuntime {
  return {
    argv: ["node", "neuraz-ds", ...argv.split(" ").filter(Boolean)],
    cwd: "/host",
    io,
    deps: buildDeps().deps,
    presetsDeps: presetsDeps(io, parts),
    version: "9.9.9",
  };
}
