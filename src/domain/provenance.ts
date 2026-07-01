// T001–T002 (011) — Vocabulario único de provenance/confidence, compartido por Brand System
// (`domain/brand/**`) y por la metadata de capa de tokens (`domain/token-mutations/token-layer.ts`).
// Un solo vocabulario en todo el producto (brief §Provenance): nunca uno por dominio.
// Dominio puro: sin `node:fs`, sin `Error`, sin rutas absolutas.

/** Estado de procedencia de un dato (marca, token o candidato). Nunca se asume `official`/`user-confirmed`. */
export const PROVENANCE_STATUSES = ["official", "observed", "inferred", "generated", "placeholder", "user-confirmed"] as const;
export type ProvenanceStatus = (typeof PROVENANCE_STATUSES)[number];

const STATUS_SET: ReadonlySet<string> = new Set(PROVENANCE_STATUSES);

export function isProvenanceStatus(value: unknown): value is ProvenanceStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

/** `confidence` siempre en `[0,1]` o `null` cuando no aplica (p. ej. `status` ya es `official`/`user-confirmed`). */
export function isValidConfidence(value: unknown): value is number | null {
  if (value === null) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export interface ProvenanceV1 {
  readonly status: ProvenanceStatus;
  readonly confidence: number | null;
}

/** `official`/`user-confirmed` no requieren `confidence` (son hechos, no inferencias); el resto sí lo admite. */
export function isCoherentProvenance(provenance: ProvenanceV1): boolean {
  if (!isProvenanceStatus(provenance.status)) return false;
  if (!isValidConfidence(provenance.confidence)) return false;
  return true;
}
