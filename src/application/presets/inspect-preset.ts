// T055 (005) — Caso de uso e inspección de un preset (capa de aplicación). Reutiliza UNA sola pasada de
// análisis (`analyzeTokens`: DTCG de `002` + metadata de `004`) para: validar el preset
// (`validatePreset`) y proyectar resúmenes de token con el `$type` EFECTIVO (resuelve la deuda B/C
// "PresetTokenInspection.type solo propio"). No recalcula tipos, no construye un segundo alias graph,
// no hace una segunda pasada DTCG, no resuelve el host, no escribe. Distingue not-found / invalid-preset
// / success conservando siempre la inspección recuperable.
import { validatePreset } from "./validate-preset.js";
import type { InspectPreset, PresetTokenAnalysis } from "./preset-ports.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import type {
  PresetEnvelope,
  PresetInspection,
  PresetMetadata,
  PresetTokenInspection,
} from "../../domain/presets/preset-envelope.js";
import type { PresetValidation } from "../../domain/presets/preset-validation.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Recolecta los paths de token que declaran `$description` (orden de documento; hijos sin `$`). */
function collectDescriptionPaths(node: Record<string, unknown>, segments: readonly string[], out: Set<string>): void {
  if ("$value" in node) {
    if (typeof node.$description === "string") out.add(segments.join("."));
    return;
  }
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const child = node[key];
    if (isRecord(child)) collectDescriptionPaths(child, [...segments, key], out);
  }
}

/** Proyecta los nodos analizados a resúmenes de token (tipo EFECTIVO; solo categorías resueltas). */
export function presetInspectionTokens(
  envelope: PresetEnvelope,
  analysis: PresetTokenAnalysis,
): readonly PresetTokenInspection[] {
  const describedPaths = new Set<string>();
  if (isRecord(envelope.tokens)) collectDescriptionPaths(envelope.tokens, [], describedPaths);

  const tokens: PresetTokenInspection[] = [];
  for (const node of analysis.nodes) {
    if (node.category === "unresolved") continue; // defensivo; un preset válido no produce esto
    tokens.push({
      path: node.path,
      category: node.category as FoundationCategoryId,
      level: node.level,
      type: node.effectiveType,
      aliasTarget: node.aliasTarget,
      hasDescription: describedPaths.has(node.path),
    });
  }
  return tokens;
}

function presetMetadata(envelope: PresetEnvelope): PresetMetadata {
  return {
    id: envelope.id,
    name: envelope.name,
    description: envelope.description,
    version: envelope.version,
    includedCategories: [...envelope.includedCategories],
  };
}

/** Ensambla la inspección (metadata + resúmenes de token efectivos + validación). */
export function presetInspection(
  envelope: PresetEnvelope,
  analysis: PresetTokenAnalysis,
  validation: PresetValidation,
): PresetInspection {
  return {
    metadata: presetMetadata(envelope),
    tokens: presetInspectionTokens(envelope, analysis),
    validation,
  };
}

/**
 * Caso de uso headless de inspección. `not-found` cuando el id no existe en el catálogo; `invalid-preset`
 * cuando el preset existe pero falla la validación (conservando la inspección recuperable); `success`
 * en otro caso. Una sola pasada de análisis; sin host; sin escrituras.
 */
export const inspectPreset: InspectPreset = async (input, deps) => {
  const envelope = await deps.catalog.get(input.id);
  if (envelope === null) return { outcome: "not-found", inspection: null };
  const analysis = deps.analyzeTokens(envelope.tokens);
  const validation = validatePreset(envelope, analysis);
  const inspection = presetInspection(envelope, analysis, validation);
  return { outcome: validation.valid ? "success" : "invalid-preset", inspection };
};
