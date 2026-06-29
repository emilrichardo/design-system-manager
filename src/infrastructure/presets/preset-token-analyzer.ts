// T029 (005) — Análisis en memoria del bloque `tokens` de un preset (infraestructura). REUTILIZA el
// motor DTCG de `002` (`createDtcgAnalyzer` → `traverseDtcgTree`: tokens/grupos, `$type` propio/
// heredado/efectivo, alias graph, missing/cycle/to-group, trust, límites, issues) y la proyección de
// metadata foundation de `004` (`projectFoundationMetadata`) + categoría/compatibilidad de `004`. NO
// crea un analizador paralelo, NO escribe, NO lee filesystem, NO resuelve host, NO usa `JSON.parse`
// (recibe el objeto ya parseado), NO accede a red. Una pasada DTCG + una pasada de metadata.
import type { DtcgAnalyzer } from "../../application/analysis-ports.js";
import type {
  AnalyzePresetTokens,
  PresetTokenAnalysis,
  PresetTokenNode,
} from "../../application/presets/preset-ports.js";
import type { PresetValidationPort } from "../../application/presets/preset-ports.js";
import { validatePreset } from "../../application/presets/validate-preset.js";
import { projectFoundationMetadata } from "../../application/foundations/metadata-pass.js";
import { resolveFoundationCategory } from "../../domain/foundations/resolve-foundation-category.js";
import { foundationTypeCompatibility } from "../../domain/foundations/foundation-type-compatibility.js";
import type { PresetEnvelope } from "../../domain/presets/preset-envelope.js";
import type { PresetValidation } from "../../domain/presets/preset-validation.js";
import { createDtcgAnalyzer } from "../analysis/dtcg-read-validator.js";

/** Dependencias inyectables (por defecto, las reales de `002`/`004`). Permite spies de análisis único. */
export interface AnalyzePresetTokensDeps {
  readonly analyzer?: DtcgAnalyzer;
  readonly foundationPass?: typeof projectFoundationMetadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Analiza el bloque `tokens` ya parseado reutilizando el motor de `002` y la proyección de `004`.
 * Determinista; el orden de nodos es el del análisis DTCG (orden de documento).
 */
export function analyzePresetTokens(tokens: unknown, deps: AnalyzePresetTokensDeps = {}): PresetTokenAnalysis {
  const analyzer = deps.analyzer ?? createDtcgAnalyzer();
  const foundationPass = deps.foundationPass ?? projectFoundationMetadata;

  const dtcg = analyzer.analyze(tokens);
  const metadata = foundationPass(tokens);
  const topLevelKeys = isRecord(tokens) ? Object.keys(tokens).filter((k) => !k.startsWith("$")) : [];

  const nodes: PresetTokenNode[] = dtcg.nodes.map((node) => {
    const category = resolveFoundationCategory(node.path);
    const resolution = metadata.levels.get(node.path);
    return {
      path: node.path,
      category,
      declaredType: node.declaredType,
      effectiveType: node.effectiveType,
      typeOrigin: node.typeOrigin,
      typeSourcePath: node.typeSourcePath,
      kind: node.kind,
      aliasTarget: node.aliasTarget,
      aliasState: node.aliasState,
      trust: node.trust,
      level: resolution?.level ?? "unclassified",
      levelSource: resolution?.source ?? "none",
      levelSourcePath: resolution?.sourcePath ?? null,
      typeCompatibility:
        category === "unresolved" ? "unknown" : foundationTypeCompatibility(category, node.effectiveType),
    };
  });

  return {
    nodes,
    errors: dtcg.errors,
    warnings: dtcg.warnings,
    foundationIssues: metadata.issues,
    limits: dtcg.limits,
    topLevelKeys,
  };
}

/** Implementación del puerto `PresetValidationPort` que reúne análisis en memoria + `validatePreset`. */
export function createPresetValidator(deps: AnalyzePresetTokensDeps = {}): PresetValidationPort {
  return {
    validate(envelope: PresetEnvelope): PresetValidation {
      return validatePreset(envelope, analyzePresetTokens(envelope.tokens, deps));
    },
  };
}

/** Alias tipado de la función de análisis (para composición/puertos). */
export const analyzePresetTokensPort: AnalyzePresetTokens = (tokens) => analyzePresetTokens(tokens);
