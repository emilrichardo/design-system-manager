// T009 (004) — Parser PURO de la declaración foundation de UN nodo (token o grupo), sin recorrer
// descendientes. Lee `$extensions["ar.neuraz.design-system-manager"].foundation.level` (ADR-0014,
// contract foundation-extension-v1). NUNCA muta, normaliza ni expone el objeto `$extensions`/valores
// arbitrarios; solo devuelve una unión discriminada con un motivo estable y mínimo. Dominio puro.
import type { PersistedFoundationLevel } from "./foundation-level.js";

/** Namespace vendor estable de Neuraz para metadata DTCG. */
export const NEURAZ_EXTENSION_NAMESPACE = "ar.neuraz.design-system-manager";

/** Motivo estable de una declaración inválida (sin exponer contenido ni stack). */
export type FoundationDeclarationInvalidReason =
  | "namespace-not-object"
  | "foundation-not-object"
  | "level-missing"
  | "level-not-string"
  | "level-unsupported";

/** Resultado del parser para un nodo: ausente, válido o inválido (discriminado). */
export type FoundationDeclaration =
  | { readonly kind: "absent" }
  | { readonly kind: "valid"; readonly level: PersistedFoundationLevel }
  | { readonly kind: "invalid"; readonly reason: FoundationDeclarationInvalidReason };

const ABSENT: FoundationDeclaration = { kind: "absent" };

/** ¿`v` es un record JSON (objeto plano, no `null`, no array)? */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Analiza la declaración foundation propia de un nodo. No desciende a hijos. No normaliza el `level`
 * (`" primitive "`/`"SEMANTIC"` son inválidos). `unclassified` nunca es válido (es estado derivado).
 */
export function parseFoundationExtension(node: unknown): FoundationDeclaration {
  if (!isRecord(node)) return ABSENT;
  const extensions = node.$extensions;
  if (extensions === undefined) return ABSENT;
  if (!isRecord(extensions)) return ABSENT; // `$extensions` malformado: no es asunto de foundations
  if (!(NEURAZ_EXTENSION_NAMESPACE in extensions)) return ABSENT;

  const ns = extensions[NEURAZ_EXTENSION_NAMESPACE];
  if (!isRecord(ns)) return { kind: "invalid", reason: "namespace-not-object" };
  if (!("foundation" in ns)) return ABSENT; // namespace presente sin declaración foundation

  const foundation = ns.foundation;
  if (!isRecord(foundation)) return { kind: "invalid", reason: "foundation-not-object" };
  if (!("level" in foundation)) return { kind: "invalid", reason: "level-missing" };

  const level = foundation.level;
  if (typeof level !== "string") return { kind: "invalid", reason: "level-not-string" };
  if (level === "primitive" || level === "semantic") return { kind: "valid", level };
  return { kind: "invalid", reason: "level-unsupported" };
}
