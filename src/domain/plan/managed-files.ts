// Rutas administradas por `init`, centralizadas para evitar duplicación entre capas (ADR-0004).
// Rutas relativas a la raíz anfitriona, en formato POSIX. NO se crean archivos aquí.
export const MANAGED_FILES = {
  config: "neuraz-ds.config.json",
  manifest: "design-system/design-system.json",
  tokens: "design-system/tokens/base.tokens.json",
} as const;

/** Conjunto exacto y ordenado de archivos que `init` crea (ADR-0004). */
export const EXPECTED_FILES: readonly string[] = [
  MANAGED_FILES.config,
  MANAGED_FILES.manifest,
  MANAGED_FILES.tokens,
];
