// T011 — Versión SemVer del Design System (ADR-0003). Usa `semver` (ADR-0005).
import semver from "semver";
import type { Result } from "../errors.js";
import { err, ok } from "../errors.js";

export interface Version {
  readonly value: string;
}

/** Versión inicial por defecto (ADR-0003). */
export const DEFAULT_VERSION = "0.1.0";

/** Valida una versión SemVer; por defecto `0.1.0`. No acepta espacios ni cadenas vacías. */
export function validateVersion(input: string = DEFAULT_VERSION): Result<Version> {
  // `semver.valid` recorta espacios circundantes; aquí exigimos SemVer estricto sin espacios.
  if (/\s/.test(input)) {
    return err("version-invalid", `Versión inválida: "${input}". No se permiten espacios.`, { input });
  }
  const normalized = semver.valid(input);
  if (normalized === null) {
    return err("version-invalid", `Versión inválida: "${input}". Debe cumplir SemVer.`, { input });
  }
  return ok({ value: normalized });
}
