// T028 (005) — Validación estricta del envelope/metadata de un preset (infraestructura, pura: sin fs/
// red/ejecución). Opera sobre el valor RAW ya parseado y detecta: forma no-objeto, campos top-level
// desconocidos (v1 los prohíbe), campos requeridos ausentes o con tipo incorrecto, y delega la
// semántica de id/version/name/description/categorías al dominio (`createPresetMetadata`). `tokens`
// debe ser un objeto DTCG no vacío. No normaliza ni descarta campos inválidos. Mensajes seguros.
import type { PresetEnvelope } from "../../domain/presets/preset-envelope.js";
import { createPresetEnvelope, createPresetMetadata } from "../../domain/presets/preset-envelope.js";
import type { PresetValidationIssue } from "../../domain/presets/preset-validation.js";
import { presetValidationError } from "../../domain/presets/preset-validation.js";

const ALLOWED_FIELDS: ReadonlySet<string> = new Set([
  "id",
  "name",
  "description",
  "version",
  "includedCategories",
  "tokens",
]);

export interface PresetEnvelopeValidationResult {
  readonly envelope: PresetEnvelope | null;
  readonly issues: readonly PresetValidationIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Valida el envelope crudo. `envelope` es no-nulo solo cuando no hay issues. */
export function validatePresetEnvelope(raw: unknown): PresetEnvelopeValidationResult {
  if (!isRecord(raw)) {
    return { envelope: null, issues: [presetValidationError("preset-envelope-invalid", "Preset envelope must be a JSON object.", null)] };
  }

  const issues: PresetValidationIssue[] = [];

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_FIELDS.has(key)) {
      issues.push(presetValidationError("preset-field-unknown", `Unknown top-level field: ${key}.`, key));
    }
  }

  const id = typeof raw.id === "string" ? raw.id : null;
  const name = typeof raw.name === "string" ? raw.name : null;
  const description = typeof raw.description === "string" ? raw.description : null;
  const version = typeof raw.version === "string" ? raw.version : null;
  const includedCategories =
    Array.isArray(raw.includedCategories) && raw.includedCategories.every((c) => typeof c === "string")
      ? (raw.includedCategories as string[])
      : null;

  if (id === null) issues.push(presetValidationError("preset-id-invalid", "Preset id must be a string.", "id"));
  if (name === null) issues.push(presetValidationError("preset-name-invalid", "Preset name must be a string.", "name"));
  if (description === null) issues.push(presetValidationError("preset-description-invalid", "Preset description must be a string.", "description"));
  if (version === null) issues.push(presetValidationError("preset-version-invalid", "Preset version must be a string.", "version"));
  if (includedCategories === null) issues.push(presetValidationError("preset-envelope-invalid", "Preset includedCategories must be an array of strings.", "includedCategories"));

  const tokensIsObject = isRecord(raw.tokens);
  if (!tokensIsObject) {
    issues.push(presetValidationError("preset-envelope-invalid", "Preset tokens must be an object.", "tokens"));
  } else if (!Object.keys(raw.tokens as Record<string, unknown>).some((k) => !k.startsWith("$"))) {
    issues.push(presetValidationError("preset-tokens-empty", "Preset tokens must contain at least one entry.", "tokens"));
  }

  // Semántica de metadata (formato de id/version, no-vacío de name/description, categorías canónicas)
  // solo cuando los tipos base están presentes; evita duplicar issues con los de tipo anteriores.
  if (id !== null && name !== null && description !== null && version !== null && includedCategories !== null) {
    const meta = createPresetMetadata({ id, name, description, version, includedCategories });
    if (!meta.ok) issues.push(...meta.validation.errors);
  }

  if (issues.length > 0) return { envelope: null, issues };

  const envelope = createPresetEnvelope({
    id: raw.id as string,
    name: raw.name as string,
    description: raw.description as string,
    version: raw.version as string,
    includedCategories: raw.includedCategories as string[],
    tokens: raw.tokens,
  });
  return envelope.ok ? { envelope: envelope.value, issues: [] } : { envelope: null, issues: envelope.validation.errors };
}
