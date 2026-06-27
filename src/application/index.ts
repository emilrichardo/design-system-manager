// Capa de aplicación (puertos + casos de uso). Fase 3: puertos de resolución/inspección.
// No debe depender de Commander, @clack/prompts, Node ni infraestructura concreta.
export * from "./ports.js";
export * from "./validate-plan.js";
export * from "./initialize-design-system.js";
// Feature 002 — puertos de validate/inspect (lectura segura, tubería, casos de uso, reporters).
export * from "./analysis-ports.js";
export { analyzeExistingDesignSystem } from "./analyze-existing-design-system.js";
export type { PipelineLimits } from "./analyze-existing-design-system.js";
