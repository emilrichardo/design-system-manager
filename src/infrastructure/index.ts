// Capa de infraestructura (adapters). Fase 3: resolución de raíz, seguridad de rutas,
// verificación de package.json e inspección de presencia.
export { resolveHostRoot } from "./host-root/resolve-host-root.js";
export { verifyPackageJson } from "./host-root/require-package-json.js";
export type { VerifyResult } from "./host-root/require-package-json.js";
export { assertWithinRoot } from "./host-root/path-guard.js";
export type { Containment, ContainmentReason } from "./host-root/path-guard.js";
export { inspectPresence } from "./host-root/inspect-presence.js";
export { classifyState } from "./host-root/classify-state.js";
export { documentValidators } from "./validation/schema-validators.js";
export { validateDtcgDocument } from "./validation/dtcg-validator.js";
export { serializeJson } from "./serialization/json.js";
export { prepareFiles } from "./serialization/prepare-files.js";
export { nodeFileSystem } from "./fs/node-file-system.js";
export { detectConflicts } from "./fs/detect-conflicts.js";
export { verifyPersisted } from "./fs/verify-persisted.js";
export { commitTransaction } from "./fs/transactional-writer.js";
export {
  hostRootResolver,
  stateClassifier,
  documentPreparer,
  transactionalWriter,
} from "./initialize-adapters.js";
