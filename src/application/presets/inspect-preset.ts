// T022 (005) — Proyección de inspección de un preset (capa de aplicación). Construye un resumen
// SUPERFICIAL por token (path / categoría / nivel / `$type` declarado propio / alias target /
// presencia de `$description`) reutilizando las funciones puras de `004` ya existentes
// (`projectFoundationMetadata` para el nivel efectivo, `resolveFoundationCategory` para la categoría).
// NO hace validación DTCG profunda, ni grafo de alias, ni compatibilidad de tipos, ni completitud
// (eso es Checkpoint C). La orquestación completa de `inspectPreset` llega en el Checkpoint F.
import { projectFoundationMetadata } from "../foundations/metadata-pass.js";
import { resolveFoundationCategory } from "../../domain/foundations/resolve-foundation-category.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import type { FoundationLevel } from "../../domain/foundations/foundation-level.js";
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

function aliasTargetOf(node: Record<string, unknown>): string | null {
  const value = node.$value;
  if (typeof value !== "string") return null;
  const match = /^\{(.+)\}$/.exec(value);
  return match ? (match[1] as string) : null;
}

/** Recolecta hojas (`$value`) en orden de documento; hijos = claves sin `$` (reglas DTCG de 002). */
function collectLeaves(
  node: Record<string, unknown>,
  segments: readonly string[],
  out: { readonly path: string; readonly node: Record<string, unknown> }[],
): void {
  if ("$value" in node) {
    out.push({ path: segments.join("."), node });
    return;
  }
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const child = node[key];
    if (isRecord(child)) collectLeaves(child, [...segments, key], out);
  }
}

/** Proyecta los tokens del envelope a resúmenes superficiales (solo categorías canónicas resueltas). */
export function presetInspectionTokens(envelope: PresetEnvelope): readonly PresetTokenInspection[] {
  const { levels } = projectFoundationMetadata(envelope.tokens);
  const leaves: { readonly path: string; readonly node: Record<string, unknown> }[] = [];
  collectLeaves(envelope.tokens as Record<string, unknown>, [], leaves);

  const tokens: PresetTokenInspection[] = [];
  for (const { path, node } of leaves) {
    const category = resolveFoundationCategory(path);
    if (category === "unresolved") continue; // defensivo; un preset válido no produce esto
    const level: FoundationLevel = levels.get(path)?.level ?? "unclassified";
    const declaredType = typeof node.$type === "string" ? node.$type : null;
    tokens.push({
      path,
      category: category as FoundationCategoryId,
      level,
      type: declaredType,
      aliasTarget: aliasTargetOf(node),
      hasDescription: typeof node.$description === "string",
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

/** Ensambla la inspección (metadata + resúmenes de token + validación provista). */
export function presetInspection(
  envelope: PresetEnvelope,
  validation: PresetValidation,
): PresetInspection {
  return {
    metadata: presetMetadata(envelope),
    tokens: presetInspectionTokens(envelope),
    validation,
  };
}
