import semver from "semver";

export type PresetVersion = string & { readonly __presetVersion: unique symbol };

export interface PresetVersionValidationError {
  readonly code: "preset-version-invalid";
  readonly message: string;
  readonly input: string;
}

export type PresetVersionValidationResult =
  | { readonly ok: true; readonly value: PresetVersion }
  | { readonly ok: false; readonly error: PresetVersionValidationError };

const STRICT_SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function validatePresetVersion(input: string): PresetVersionValidationResult {
  if (input.length === 0 || /\s/.test(input) || !STRICT_SEMVER_RE.test(input)) {
    return invalidPresetVersion(input);
  }

  const coreAndPrerelease = input.split("+", 1)[0] ?? input;
  if (semver.valid(coreAndPrerelease) === null) {
    return invalidPresetVersion(input);
  }

  return { ok: true, value: input as PresetVersion };
}

function invalidPresetVersion(input: string): PresetVersionValidationResult {
  return {
    ok: false,
    error: {
      code: "preset-version-invalid",
      message: "Preset version must be strict SemVer.",
      input,
    },
  };
}
