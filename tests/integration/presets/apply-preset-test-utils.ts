import { vi } from "vitest";
import { createDtcgAnalyzer } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";
import { analyzePresetTokens } from "../../../src/infrastructure/presets/preset-token-analyzer.js";
import { createPresetEnvelope, type PresetEnvelope } from "../../../src/domain/presets/preset-envelope.js";
import { PRESET_APPLICATION_TARGET_FILE } from "../../../src/domain/presets/preset-application-plan.js";
import type { ApplyPresetDependencies, PresetCatalogPort } from "../../../src/application/presets/preset-ports.js";
import type { DesignSystemAnalysis, ParsedDocument } from "../../../src/domain/analysis/design-system-analysis.js";
import type { SingleFileAtomicWriter } from "../../../src/application/presets/single-file-writer-port.js";

export const NS = "ar.neuraz.design-system-manager";

export const presetTokens = (): Record<string, unknown> => ({
  color: {
    $type: "color",
    $extensions: { [NS]: { foundation: { level: "primitive" } } },
    brand: { $value: { colorSpace: "srgb", components: [1, 1, 1] } },
  },
});

export function envelope(tokens: Record<string, unknown> = presetTokens()): PresetEnvelope {
  const result = createPresetEnvelope({
    id: "neutral-base",
    name: "Neutral Base",
    description: "d",
    version: "1.0.0",
    includedCategories: ["color"],
    tokens,
  });
  if (!result.ok) throw new Error("fixture envelope invalid");
  return result.value;
}

export function hostAnalysis(parsed: unknown, errors: DesignSystemAnalysis["errors"] = []): DesignSystemAnalysis {
  const dtcg = createDtcgAnalyzer().analyze(parsed);
  const documents: Record<string, ParsedDocument> = {
    [PRESET_APPLICATION_TARGET_FILE]: {
      relativePath: PRESET_APPLICATION_TARGET_FILE,
      exists: true,
      kind: "file",
      parsed,
      trust: "valid",
      issues: [],
    },
  };
  return {
    host: { root: "/repo", designSystemPath: "/repo/design-system" },
    presence: { present: [], missing: [] },
    structuralState: errors.length === 0 ? "complete-valid" : "complete-invalid",
    documents,
    nodes: dtcg.nodes,
    statistics: dtcg.statistics,
    errors,
    warnings: [],
    limits: dtcg.limits,
    valid: errors.length === 0,
  };
}

function catalog(env: PresetEnvelope | null): PresetCatalogPort {
  return {
    load: vi.fn(async () => ({ ok: true, entries: [] })),
    list: vi.fn(async () => []),
    get: vi.fn(async () => env),
  };
}

export function deps(overrides: {
  readonly env?: PresetEnvelope | null;
  readonly analyses: readonly DesignSystemAnalysis[];
  readonly targetContent: string;
  readonly writer?: SingleFileAtomicWriter;
}): ApplyPresetDependencies {
  const analyzeHost = vi.fn(async () => {
    const next = overrides.analyses[Math.min(analyzeHost.mock.calls.length - 1, overrides.analyses.length - 1)];
    return next ?? overrides.analyses[overrides.analyses.length - 1]!;
  });
  return {
    catalog: catalog(overrides.env ?? envelope()),
    analyzeTokens: analyzePresetTokens,
    analyzeHost,
    targetReader: { read: vi.fn(async () => ({ outcome: "success", content: overrides.targetContent })) },
    writer: overrides.writer ?? writer("written"),
  };
}

export function writer(outcome: "written" | "concurrent-modification" | "write-error"): SingleFileAtomicWriter {
  return {
    write: vi.fn(async (request) =>
      outcome === "written"
        ? {
            outcome: "written",
            wrote: true,
            relativePath: request.relativePath,
            backupRelativePath: `${request.relativePath}.bak`,
            error: null,
          }
        : {
            outcome,
            wrote: false,
            relativePath: request.relativePath,
            backupRelativePath: null,
            error: { code: outcome, message: outcome },
          },
    ),
    cleanupBackup: vi.fn(async () => ({ ok: true, error: null })),
  };
}
