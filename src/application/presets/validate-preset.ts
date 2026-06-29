// T030 + T031 (005) — Validación headless de un preset (capa de aplicación). Reconcilia
// `includedCategories` con las categorías observadas en los paths y traduce el análisis en memoria
// (reutilizado de `002`/`004` vía `AnalyzePresetTokens`) a `PresetValidationIssue` con códigos
// estables y mensajes seguros (sin stacks, paths absolutos, env, `Error` ni valores de token). NO
// implementa conflictos de aplicación (Checkpoint E) ni dependencias prohibidas (fuera del contrato de
// validación). Pura y determinista; orden estable por orden de nodos del análisis.
import type { PresetEnvelope } from "../../domain/presets/preset-envelope.js";
import type { PresetValidation, PresetValidationIssue } from "../../domain/presets/preset-validation.js";
import { presetValidation, presetValidationError, presetValidationWarning } from "../../domain/presets/preset-validation.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import type { PresetTokenAnalysis, PresetTokenNode } from "./preset-ports.js";

/** Códigos de alias del analizador de `002` ya representados por `node.aliasState` (no re-mapear). */
const ALIAS_ANALYZER_CODES = new Set<string>([
  "alias-missing",
  "alias-to-group",
  "alias-cyclic",
  "alias-malformed",
  "alias-too-long",
]);

/** Warnings estilísticos de `002` que no afectan la validez de un preset (se omiten para no añadir ruido). */
const IGNORED_ANALYZER_WARNINGS = new Set<string>([
  "dtcg-description-missing",
  "dtcg-type-not-deeply-inspected",
  "dtcg-empty-group",
]);

function firstSegment(path: string): string {
  const dot = path.indexOf(".");
  return dot === -1 ? path : path.slice(0, dot);
}

function aliasIssue(node: PresetTokenNode, topLevelKeys: readonly string[]): PresetValidationIssue {
  switch (node.aliasState) {
    case "to-group":
      return presetValidationError("preset-alias-to-group", "Preset alias points to a group, not a token.", node.path);
    case "cyclic":
      return presetValidationError("preset-alias-cycle", "Preset alias participates in a cycle.", node.path);
    case "malformed":
      return presetValidationError("preset-dtcg-invalid", "Preset alias reference is malformed.", node.path);
    default: {
      // "missing": distinguir externo al preset (primer segmento ausente) de faltante interno.
      const target = node.aliasTarget;
      const external = target !== null && !topLevelKeys.includes(firstSegment(target));
      return external
        ? presetValidationError("preset-reference-external", "Preset alias references a token outside the preset.", node.path)
        : presetValidationError("preset-alias-missing", "Preset alias references a missing token.", node.path);
    }
  }
}

/**
 * Valida un preset a partir de su envelope (ya tipado/cargado) y del análisis en memoria de su bloque
 * `tokens`. Devuelve `PresetValidation` (válido ⇔ sin errores y sin límites parciales). El nivel
 * `unclassified` propio (source `none`) es advertencia (no invalida), coherente con `004`.
 */
export function validatePreset(envelope: PresetEnvelope, analysis: PresetTokenAnalysis): PresetValidation {
  const errors: PresetValidationIssue[] = [];
  const warnings: PresetValidationIssue[] = [];
  const declared = new Set<FoundationCategoryId>(envelope.includedCategories);
  const observed = new Set<FoundationCategoryId>();

  for (const node of analysis.nodes) {
    if (node.category === "unresolved") {
      errors.push(presetValidationError("preset-token-unresolved", "Preset token path does not resolve to a foundation category.", node.path));
    } else {
      observed.add(node.category);
      if (!declared.has(node.category)) {
        errors.push(presetValidationError("preset-category-undeclared", "Preset token uses a category not declared in includedCategories.", node.path));
      }
      if (node.typeCompatibility === "mismatch") {
        errors.push(presetValidationError("preset-type-mismatch", "Preset token type is incompatible with its foundation category.", node.path));
      }
    }

    if (node.aliasState !== "n/a" && node.aliasState !== "valid") {
      errors.push(aliasIssue(node, analysis.topLevelKeys));
    }

    if (node.level === "unclassified" && node.levelSource === "none") {
      warnings.push(presetValidationWarning("preset-token-unclassified", "Preset token has no foundation level (unclassified).", node.path));
    }
  }

  // Categoría declarada sin ningún token observable.
  for (const category of envelope.includedCategories) {
    if (!observed.has(category)) {
      errors.push(presetValidationError("preset-category-unused", "Declared category has no contributing token.", `includedCategories.${category}`));
    }
  }

  // Metadata foundation inválida (una por declaración, ya deduplicada por `004`).
  for (const issue of analysis.foundationIssues) {
    errors.push(presetValidationError("preset-foundation-metadata-invalid", "Preset foundation metadata is invalid.", issue.path ?? null));
  }

  // Errores estructurales DTCG (no alias; los de alias ya se cubren por `aliasState`).
  for (const issue of analysis.errors) {
    if (ALIAS_ANALYZER_CODES.has(issue.code)) continue;
    if (issue.code.startsWith("limit-")) continue; // los límites se reportan vía `analysis.limits`
    errors.push(presetValidationError("preset-dtcg-invalid", "Preset token block has an invalid DTCG structure.", issue.path ?? null));
  }
  for (const issue of analysis.warnings) {
    if (IGNORED_ANALYZER_WARNINGS.has(issue.code)) continue;
    warnings.push(presetValidationWarning("preset-dtcg-invalid", "Preset token block has a non-blocking DTCG warning.", issue.path ?? null));
  }

  // Límites de traversal/análisis excedidos ⇒ resultado parcial (no válido).
  if (analysis.limits.partial) {
    errors.push(presetValidationError("preset-limit-exceeded", "Preset analysis exceeded safe limits.", null));
  }

  return presetValidation(errors, warnings, analysis.limits);
}
