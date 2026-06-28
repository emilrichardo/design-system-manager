export type PresetId = string & { readonly __presetId: unique symbol };

export interface PresetIdValidationError {
  readonly code: "preset-id-invalid";
  readonly message: string;
  readonly input: string;
}

export type PresetIdValidationResult =
  | { readonly ok: true; readonly value: PresetId }
  | { readonly ok: false; readonly error: PresetIdValidationError };

const PRESET_ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function validatePresetId(input: string): PresetIdValidationResult {
  if (!PRESET_ID_RE.test(input)) {
    return {
      ok: false,
      error: {
        code: "preset-id-invalid",
        message: "Preset id must be lowercase ASCII kebab-case.",
        input,
      },
    };
  }
  return { ok: true, value: input as PresetId };
}

export function isPresetId(input: string): input is PresetId {
  return PRESET_ID_RE.test(input);
}
