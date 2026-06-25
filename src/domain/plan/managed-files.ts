// Rutas administradas por `init`, centralizadas para evitar duplicación entre capas (ADR-0004).
// Rutas relativas a la raíz anfitriona, en formato POSIX. NO se crean archivos aquí.
/** Directorio del Design System (relativo a la raíz anfitriona). */
export const DESIGN_SYSTEM_DIR = "design-system";
/** Subdirectorio de fuentes de tokens (relativo a DESIGN_SYSTEM_DIR). */
export const TOKENS_DIR = "tokens";
/** Versión del formato de tokens administrado (DTCG estable). */
export const FORMAT_VERSION = "2025.10";

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
