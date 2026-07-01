// Capa de aplicación (puertos + casos de uso). Fase 3: puertos de resolución/inspección.
// No debe depender de Commander, @clack/prompts, Node ni infraestructura concreta.
export * from "./ports.js";
export * from "./validate-plan.js";
export * from "./initialize-design-system.js";
// Feature 002 — puertos de validate/inspect (lectura segura, tubería, casos de uso, reporters).
export * from "./analysis-ports.js";
export { analyzeExistingDesignSystem } from "./analyze-existing-design-system.js";
export type { PipelineLimits } from "./analyze-existing-design-system.js";
export { validateDesignSystem } from "./validate-design-system.js";
export { inspectDesignSystem } from "./inspect-design-system.js";
// Feature 003 — contrato JSON v1 (DTO + mappers comunes, headless).
export * from "./json/index.js";
// Feature 004 — tipos del resultado de foundations (headless; Checkpoint A).
export * from "./foundations/index.js";
// Feature 005 — puertos headless de presets.
export * from "./presets/index.js";
// Feature 010 — contratos headless del Visual Token Editor.
export * from "./editor/index.js";
