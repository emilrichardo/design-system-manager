// T056 + T057 (005) — Caso de uso headless de preview (capa de aplicación). Orquesta:
// catálogo → análisis del preset (una pasada) → validación → análisis del host (una invocación de `002`)
// → proyección normalizada → motor de diff (E) → `PresetApplicationPlan`. COMPLETAMENTE read-only: no
// escribe, no crea temporales, no toca mtime, no resuelve confirmación ni TTY. Distingue
// `not-found` (preset vs design-system, vía discriminante tipado), `read-error`, `invalid-preset`,
// `conflict`, `unchanged` y `success`. No importa infraestructura (recibe `analyzeTokens`/`analyzeHost`).
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import type { ManagedNode } from "../../domain/changes/equivalence.js";
import type { PresetApplicationPlan } from "../../domain/presets/preset-application-plan.js";
import { PRESET_APPLICATION_TARGET_FILE } from "../../domain/presets/preset-application-plan.js";
import type { PresetEnvelope, PresetMetadata } from "../../domain/presets/preset-envelope.js";
import { projectFoundationMetadata } from "../foundations/metadata-pass.js";
import { validatePreset } from "./validate-preset.js";
import { planPresetDiff } from "./plan-preset-diff.js";
import { projectManagedNodes } from "./project-managed-nodes.js";
import type { ManagedNodeFacts } from "./project-managed-nodes.js";
import type { PlanPresetApplication } from "./preset-ports.js";

const TOKENS_REL = MANAGED_FILES.tokens;

function presetMetadata(envelope: PresetEnvelope): PresetMetadata {
  return {
    id: envelope.id,
    name: envelope.name,
    description: envelope.description,
    version: envelope.version,
    includedCategories: [...envelope.includedCategories],
  };
}

/**
 * Genera el plan de aplicación de un preset contra el host SIN escribir. El host se analiza una sola vez
 * mediante el caso de uso enlazado de `002`; el bloque de tokens host se proyecta con una pasada de
 * metadata de `004`. El preset se analiza una sola vez (compartido por validación y candidatos).
 */
export const planPresetApplication: PlanPresetApplication = async (input, deps) => {
  const envelope = await deps.catalog.get(input.id);
  if (envelope === null) return { outcome: "not-found", plan: null, notFoundResource: "preset" };

  // Una sola pasada de análisis del preset, reutilizada por validación y candidatos.
  const presetAnalysis = deps.analyzeTokens(envelope.tokens);
  const validation = validatePreset(envelope, presetAnalysis);
  if (!validation.valid) return { outcome: "invalid-preset", plan: null };

  // Una sola invocación del analizador del host (002).
  const host = await deps.analyzeHost({ executionDir: input.executionDir });
  if (host.structuralState === "not-initialized") {
    return { outcome: "not-found", plan: null, notFoundResource: "design-system" };
  }
  const tokensDoc = host.documents[TOKENS_REL];
  if (tokensDoc !== undefined && tokensDoc.exists && tokensDoc.trust === "unavailable") {
    return { outcome: "read-error", plan: null };
  }
  const hostParsed = tokensDoc?.parsed ?? {};

  // Estado normalizado del host (reutiliza nodes de 002 + una pasada de metadata de 004).
  const hostLevels = projectFoundationMetadata(hostParsed).levels;
  const hostFacts = new Map<string, ManagedNodeFacts>();
  for (const node of host.nodes) {
    hostFacts.set(node.path, { effectiveType: node.effectiveType, level: hostLevels.get(node.path)?.level ?? "unclassified" });
  }
  const hostMap = new Map<string, ManagedNode>(
    projectManagedNodes(hostParsed, hostFacts).map((node) => [node.path, node]),
  );

  // Candidatos del preset (reutiliza los nodos ya analizados).
  const presetFacts = new Map<string, ManagedNodeFacts>();
  for (const node of presetAnalysis.nodes) {
    presetFacts.set(node.path, { effectiveType: node.effectiveType, level: node.level });
  }
  const candidates = projectManagedNodes(envelope.tokens, presetFacts);

  const { plan } = planPresetDiff({ candidates, host: hostMap });

  const wrapped: PresetApplicationPlan = {
    preset: presetMetadata(envelope),
    targetFile: PRESET_APPLICATION_TARGET_FILE,
    plan,
    hostState: host.structuralState,
    notFoundResource: null,
  };

  if (!plan.writable) return { outcome: "conflict", plan: wrapped };
  if (!plan.summary.wouldWrite) return { outcome: "unchanged", plan: wrapped };
  return { outcome: "success", plan: wrapped };
};
