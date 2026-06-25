// Capa de infraestructura (adapters). Fase 3: resolución de raíz, seguridad de rutas,
// verificación de package.json e inspección de presencia.
export { resolveHostRoot } from "./host-root/resolve-host-root.js";
export { verifyPackageJson } from "./host-root/require-package-json.js";
export type { VerifyResult } from "./host-root/require-package-json.js";
export { assertWithinRoot } from "./host-root/path-guard.js";
export type { Containment, ContainmentReason } from "./host-root/path-guard.js";
export { inspectPresence } from "./host-root/inspect-presence.js";
