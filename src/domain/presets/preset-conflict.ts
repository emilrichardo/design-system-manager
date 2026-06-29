// T048 (005) — Construcción estable de conflictos de aplicación de preset (dominio preset). Reutiliza
// la forma genérica `ApplicationConflict` de `domain/changes` (no la duplica) y fija los 15 códigos del
// contrato `preset-conflicts-v1` con su política de bloqueo, mensaje y acción. Mensajes deterministas y
// seguros: sin stack, paths de filesystem, contenido de token, documentos completos, env ni `Error`.
import type { ApplicationConflict } from "../changes/application-conflict.js";

/** Códigos estables de conflicto de preset (contrato preset-conflicts-v1). */
export const PRESET_CONFLICT_CODES = Object.freeze({
  valueDiffers: "preset-value-differs",
  typeDiffers: "preset-type-differs",
  levelDiffers: "preset-level-differs",
  aliasDiffers: "preset-alias-differs",
  descriptionDiffers: "preset-description-differs",
  tokenVsGroup: "preset-token-vs-group",
  groupVsToken: "preset-group-vs-token",
  envelopeInvalid: "preset-envelope-invalid",
  foundationMetadataInvalid: "preset-foundation-metadata-invalid",
  categoryUnsupported: "preset-category-unsupported",
  pathReserved: "preset-path-reserved",
  referenceExternal: "preset-reference-external",
  limitExceeded: "preset-limit-exceeded",
  versionIncompatible: "preset-version-incompatible",
  concurrentModification: "preset-concurrent-modification",
} as const);

export type PresetConflictCode = (typeof PRESET_CONFLICT_CODES)[keyof typeof PRESET_CONFLICT_CODES];

/** Único código no-bloqueante (la descripción del host se preserva y el cambio se omite). */
const NON_BLOCKING: ReadonlySet<PresetConflictCode> = new Set<PresetConflictCode>(["preset-description-differs"]);

const MESSAGES: Readonly<Record<PresetConflictCode, string>> = Object.freeze({
  "preset-value-differs": "Existing token value differs from the preset.",
  "preset-type-differs": "Existing token effective type differs from the preset.",
  "preset-level-differs": "Existing token foundation level differs from the preset.",
  "preset-alias-differs": "Existing token alias target differs from the preset.",
  "preset-description-differs": "Existing token description differs from the preset.",
  "preset-token-vs-group": "Preset token collides with an existing group.",
  "preset-group-vs-token": "Preset group collides with an existing token.",
  "preset-envelope-invalid": "Preset envelope or metadata is invalid.",
  "preset-foundation-metadata-invalid": "Preset foundation metadata is invalid.",
  "preset-category-unsupported": "Preset category is unsupported or undeclared.",
  "preset-path-reserved": "Preset logical path is reserved or unsafe.",
  "preset-reference-external": "Preset alias references a token outside the preset.",
  "preset-limit-exceeded": "Preset analysis exceeded safe limits.",
  "preset-version-incompatible": "Preset contract version is unsupported.",
  "preset-concurrent-modification": "Target changed between planning and writing.",
});

const ACTIONS: Readonly<Record<PresetConflictCode, string>> = Object.freeze({
  "preset-value-differs": "Keep the existing token; reconcile before applying.",
  "preset-type-differs": "Keep the existing token; reconcile the type before applying.",
  "preset-level-differs": "Keep the existing token; reconcile the foundation level before applying.",
  "preset-alias-differs": "Keep the existing token; reconcile the alias before applying.",
  "preset-description-differs": "Keep the existing description; the preset description is skipped.",
  "preset-token-vs-group": "Resolve the token/group collision before applying.",
  "preset-group-vs-token": "Resolve the group/token collision before applying.",
  "preset-envelope-invalid": "Fix the preset envelope before applying.",
  "preset-foundation-metadata-invalid": "Fix the preset foundation metadata before applying.",
  "preset-category-unsupported": "Use only declared canonical categories.",
  "preset-path-reserved": "Use a non-reserved logical path.",
  "preset-reference-external": "Reference only tokens inside the preset.",
  "preset-limit-exceeded": "Reduce the preset size or depth.",
  "preset-version-incompatible": "Use a compatible preset version.",
  "preset-concurrent-modification": "Re-run the plan against the current target.",
});

/** ¿El código bloquea la escritura? Solo `preset-description-differs` no bloquea. */
export function presetConflictBlocksWrite(code: PresetConflictCode): boolean {
  return !NON_BLOCKING.has(code);
}

/** Construye un `ApplicationConflict` estable y seguro para el código dado. `path` es lógico, no fs. */
export function presetConflict(code: PresetConflictCode, path: string | null): ApplicationConflict {
  const blocksWrite = presetConflictBlocksWrite(code);
  return {
    code,
    path,
    severity: blocksWrite ? "error" : "warning",
    message: MESSAGES[code],
    blocksWrite,
    proposedAction: ACTIONS[code],
  };
}
