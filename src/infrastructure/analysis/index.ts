// Barrel de infraestructura de análisis (feature 002). Exporta solo implementaciones públicas.
export * from "./managed-document-reader.js";
export * from "./file-kind-mapper.js";
export { createDtcgReadValidator, createDtcgAnalyzer } from "./dtcg-read-validator.js";
export { traverseDtcgTree } from "./traverse-dtcg-tree.js";
export type { DtcgTraversalResult, TraversalLimits } from "./traverse-dtcg-tree.js";
