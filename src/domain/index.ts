// Capa de dominio (reglas puras, sin I/O). API pública del dominio.
export * from "./issue.js";
export * from "./errors.js";
export * from "./identity/name.js";
export * from "./identity/slug.js";
export * from "./identity/slugify.js";
export * from "./identity/version.js";
export * from "./identity/design-system-identity.js";
export * from "./state/previous-state.js";
export * from "./plan/managed-files.js";
export * from "./plan/initialization-plan.js";
export * from "./result/initialization-result.js";
export * from "./validation/validation-result.js";
