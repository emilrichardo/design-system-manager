import type { FoundationCategoryId } from "../foundations/foundation-category.js";
import { FOUNDATION_CATEGORY_IDS, isFoundationCategoryId } from "../foundations/foundation-category.js";
import type { FoundationLevel } from "../foundations/foundation-level.js";
import type { PresetId } from "./preset-id.js";
import { validatePresetId } from "./preset-id.js";
import type { PresetVersion } from "./preset-version.js";
import { validatePresetVersion } from "./preset-version.js";
import type { PresetValidation } from "./preset-validation.js";
import type { PresetValidationIssue } from "./preset-validation.js";
import { presetValidation, presetValidationError } from "./preset-validation.js";

export type PresetTokenBlock = Readonly<Record<string, unknown>>;

export interface PresetMetadata {
  readonly id: PresetId;
  readonly name: string;
  readonly description: string;
  readonly version: PresetVersion;
  readonly includedCategories: readonly FoundationCategoryId[];
}

export interface PresetMetadataInput {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly includedCategories: readonly string[];
}

export type PresetMetadataResult =
  | { readonly ok: true; readonly value: PresetMetadata }
  | { readonly ok: false; readonly validation: PresetValidation };

export interface PresetEnvelope extends PresetMetadata {
  readonly tokens: PresetTokenBlock;
}

export interface PresetEnvelopeInput extends PresetMetadataInput {
  readonly tokens: unknown;
}

export type PresetEnvelopeResult =
  | { readonly ok: true; readonly value: PresetEnvelope }
  | { readonly ok: false; readonly validation: PresetValidation };

export interface PresetCatalogEntry {
  readonly id: PresetId;
  readonly name: string;
  readonly description: string;
  readonly version: PresetVersion;
  readonly includedCategories: readonly FoundationCategoryId[];
}

export interface PresetCatalogResource {
  readonly entry: PresetCatalogEntry;
  readonly assetPath: string;
}

export interface PresetTokenInspection {
  readonly path: string;
  readonly category: FoundationCategoryId;
  readonly level: FoundationLevel;
  readonly type: string | null;
  readonly aliasTarget: string | null;
  readonly hasDescription: boolean;
}

export interface PresetInspection {
  readonly metadata: PresetMetadata;
  readonly tokens: readonly PresetTokenInspection[];
  readonly validation: PresetValidation;
}

export function createPresetMetadata(input: PresetMetadataInput): PresetMetadataResult {
  const errors: PresetValidationIssue[] = [];

  const id = validatePresetId(input.id);
  if (!id.ok) errors.push(presetValidationError(id.error.code, id.error.message, "id"));

  const version = validatePresetVersion(input.version);
  if (!version.ok) errors.push(presetValidationError(version.error.code, version.error.message, "version"));

  if (input.name.length === 0) {
    errors.push(presetValidationError("preset-name-invalid", "Preset name is required.", "name"));
  }

  if (input.description.length === 0) {
    errors.push(presetValidationError("preset-description-invalid", "Preset description is required.", "description"));
  }

  const categories = validateIncludedCategories(input.includedCategories);
  errors.push(...categories.errors);

  if (!id.ok || !version.ok || errors.length > 0) {
    return { ok: false, validation: presetValidation(errors) };
  }

  return {
    ok: true,
    value: {
      id: id.value,
      name: input.name,
      description: input.description,
      version: version.value,
      includedCategories: categories.value,
    },
  };
}

export function createPresetEnvelope(input: PresetEnvelopeInput): PresetEnvelopeResult {
  const metadata = createPresetMetadata(input);
  const tokenBlock = isRecord(input.tokens)
    ? { ok: true as const, value: input.tokens }
    : {
        ok: false as const,
        issue: presetValidationError("preset-envelope-invalid", "Preset tokens must be an object.", "tokens"),
      };

  if (!metadata.ok || !tokenBlock.ok) {
    const errors = [
      ...(metadata.ok ? [] : metadata.validation.errors),
      ...(tokenBlock.ok ? [] : [tokenBlock.issue]),
    ];
    return { ok: false, validation: presetValidation(errors) };
  }

  return { ok: true, value: { ...metadata.value, tokens: tokenBlock.value } };
}

export function toPresetCatalogEntry(metadata: PresetMetadata): PresetCatalogEntry {
  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    version: metadata.version,
    includedCategories: [...metadata.includedCategories],
  };
}

function validateIncludedCategories(categories: readonly string[]): {
  readonly value: readonly FoundationCategoryId[];
  readonly errors: readonly PresetValidationIssue[];
} {
  const errors: PresetValidationIssue[] = [];
  const seen = new Set<string>();
  const valid: FoundationCategoryId[] = [];

  for (const [index, category] of categories.entries()) {
    const path = `includedCategories.${index}`;
    if (!isFoundationCategoryId(category)) {
      errors.push(presetValidationError("preset-category-unsupported", "Preset category is not supported.", path));
      continue;
    }
    if (seen.has(category)) {
      errors.push(presetValidationError("preset-category-duplicate", "Preset category is duplicated.", path));
      continue;
    }
    seen.add(category);
    valid.push(category);
  }

  if (valid.length !== categories.length || valid.length === 0) {
    if (categories.length === 0) {
      errors.push(presetValidationError("preset-category-unsupported", "At least one category is required.", "includedCategories"));
    }
    return { value: valid, errors };
  }

  const canonical = [...valid].sort(
    (a, b) => FOUNDATION_CATEGORY_IDS.indexOf(a) - FOUNDATION_CATEGORY_IDS.indexOf(b),
  );
  if (canonical.some((category, index) => category !== valid[index])) {
    errors.push(
      presetValidationError(
        "preset-category-order-invalid",
        "Preset categories must follow the canonical foundation order.",
        "includedCategories",
      ),
    );
  }

  return { value: valid, errors };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
