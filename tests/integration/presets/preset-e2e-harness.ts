// Harness de integración real para presets (Checkpoint K): proyectos temporales reales + dependencias
// REALES de composición (host analyze enlazado, catálogo empaquetado, target reader y writer atómico).
// Permite ejercer los casos de uso contra el filesystem y, vía `runBinary`, el binario compilado.
import { fileURLToPath } from "node:url";
import { createBoundAnalyze } from "../../../src/cli/composition.js";
import { createBundledPresetCatalog } from "../../../src/infrastructure/presets/bundled-preset-catalog.js";
import { analyzePresetTokens } from "../../../src/infrastructure/presets/preset-token-analyzer.js";
import { createPresetTargetReader, createSingleFileAtomicWriter } from "../../../src/infrastructure/fs/single-file-atomic-writer.js";
import type { ApplyPresetDependencies, PlanPresetApplicationDependencies } from "../../../src/application/presets/preset-ports.js";
import type { PresetId } from "../../../src/domain/presets/preset-id.js";

export const TOKENS_REL = "design-system/tokens/base.tokens.json";

/** Dependencias REALES de `planPresetApplication` (catálogo bundled por defecto; baseUrl inyectable). */
export function realPlanDeps(catalogBaseUrl?: URL): PlanPresetApplicationDependencies {
  return {
    catalog: createBundledPresetCatalog(catalogBaseUrl ? { baseUrl: catalogBaseUrl } : {}),
    analyzeTokens: analyzePresetTokens,
    analyzeHost: createBoundAnalyze(),
  };
}

/** Dependencias REALES de `applyPreset` (escritura atómica + verificación reales). */
export function realApplyDeps(catalogBaseUrl?: URL): ApplyPresetDependencies {
  return {
    ...realPlanDeps(catalogBaseUrl),
    targetReader: createPresetTargetReader(),
    writer: createSingleFileAtomicWriter(),
  };
}

export const presetId = (id: string): PresetId => id as PresetId;

/** URL del directorio de un fixture de catálogo de presets dentro de `tests/`. */
export function fixtureCatalogUrl(relativeFromThisFile: string): URL {
  return new URL(relativeFromThisFile, import.meta.url);
}

export const THIS_DIR = fileURLToPath(new URL(".", import.meta.url));
