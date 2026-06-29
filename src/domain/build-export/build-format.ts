// T001 (006) — Formato canónico de artefactos de build/export. Dominio puro: sin filesystem ni CLI.
// El identificador de formato es `typescript` (no `ts`); el filename del artefacto TypeScript es
// `tokens.ts`. El build manifest NO es un formato exportable.

/** Formatos soportados en v1, en orden canónico de registro. */
export type BuildFormat = "css" | "json" | "typescript";

/** Orden canónico estable (usado por manifest, artifacts y reporters). */
export const BUILD_FORMATS: readonly BuildFormat[] = ["css", "json", "typescript"] as const;

/** Filename relativo del artefacto por formato (bajo `design-system/build/`). */
const ARTIFACT_FILENAMES: Readonly<Record<BuildFormat, string>> = {
  css: "tokens.css",
  json: "tokens.resolved.json",
  typescript: "tokens.ts",
};

/** Content type lógico por formato (metadata de CLI/export; no es un header de red). */
const CONTENT_TYPES: Readonly<Record<BuildFormat, string>> = {
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  typescript: "application/typescript; charset=utf-8",
};

/** Guard de runtime: rechaza cualquier valor fuera de la unión (incluye `ts`). */
export function isBuildFormat(value: unknown): value is BuildFormat {
  return value === "css" || value === "json" || value === "typescript";
}

/** Filename relativo determinista del artefacto para un formato. */
export function artifactFilename(format: BuildFormat): string {
  return ARTIFACT_FILENAMES[format];
}

/** Content type lógico del artefacto para un formato. */
export function artifactContentType(format: BuildFormat): string {
  return CONTENT_TYPES[format];
}
