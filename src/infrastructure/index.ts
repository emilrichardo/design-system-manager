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
export { createManagedDocumentReader } from "./analysis/managed-document-reader.js";
export type { ManagedDocumentReaderDeps } from "./analysis/managed-document-reader.js";
export { toDomainFileKind } from "./analysis/file-kind-mapper.js";
export { detectConflicts } from "./fs/detect-conflicts.js";
export { verifyPersisted } from "./fs/verify-persisted.js";
export { commitTransaction } from "./fs/transactional-writer.js";
export {
  hostRootResolver,
  stateClassifier,
  documentPreparer,
  transactionalWriter,
} from "./initialize-adapters.js";
export { ClackPrompter } from "./prompts/clack-prompter.js";
export type { ClackApi } from "./prompts/clack-prompter.js";
export { TerminalReporter } from "./reporter/terminal-reporter.js";
export type { OutputWriter } from "./reporter/terminal-reporter.js";
// Feature 003 — presentación JSON: serializer + reporters JSON (una sola emisión en `completed`).
export { serializeJsonV1 } from "./reporter/json-serializer.js";
export { ValidateJsonReporter } from "./reporter/validate-json-reporter.js";
export { InspectJsonReporter } from "./reporter/inspect-json-reporter.js";
// Feature 005 — catálogo de presets empaquetado (assets inertes resueltos vía import.meta.url).
export {
  bundledPresetsBaseUrl,
  loadBundledPresetCatalog,
  createBundledPresetCatalog,
} from "./presets/bundled-preset-catalog.js";
export type {
  CatalogInvalidReason,
  CatalogLoadResult,
  BundledCatalogOptions,
} from "./presets/bundled-preset-catalog.js";
export { readJsonAsset } from "./presets/preset-asset-reader.js";
export type { AssetReadResult } from "./presets/preset-asset-reader.js";
// Feature 005 — validación de presets en memoria (reutiliza el motor DTCG de 002 y foundations de 004).
export { validatePresetEnvelope } from "./presets/preset-envelope-validator.js";
export type { PresetEnvelopeValidationResult } from "./presets/preset-envelope-validator.js";
export {
  analyzePresetTokens,
  analyzePresetTokensPort,
  createPresetValidator,
} from "./presets/preset-token-analyzer.js";
export type { AnalyzePresetTokensDeps } from "./presets/preset-token-analyzer.js";
