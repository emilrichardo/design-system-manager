// T001 (011) — `BrandProfileV1` y entidades relacionadas (`BrandAudienceV1`, `BrandPersonalityV1`,
// `BrandPrincipleV1`) — data-model.md. Equilibrio entre campos estructurados (arrays/status) y
// contenido narrativo (Markdown libre en `string | null`); no se fuerza todo a un esquema rígido.
import type { BrandEvidenceV1 } from "./brand-evidence.js";

export const BRAND_PROFILE_STATUSES = ["complete", "partial", "placeholder", "needs-user-input"] as const;
export type BrandProfileStatus = (typeof BRAND_PROFILE_STATUSES)[number];

export interface BrandAudienceV1 {
  readonly name: string;
  readonly description: string | null;
  readonly needs: readonly string[];
}

export interface BrandPersonalityV1 {
  readonly attributes: readonly string[];
  readonly narrative: string | null;
}

export interface BrandPrincipleV1 {
  readonly id: string;
  readonly statement: string;
  readonly rationale: string | null;
  readonly evidence: BrandEvidenceV1 | null;
}

export const BRAND_PROFILE_FORMAT_VERSION = "1.0.0";

export interface BrandProfileV1 {
  readonly formatVersion: typeof BRAND_PROFILE_FORMAT_VERSION;
  readonly name: string | null;
  readonly shortName: string | null;
  readonly description: string | null;
  readonly purpose: string | null;
  readonly mission: string | null;
  readonly vision: string | null;
  readonly values: readonly string[];
  readonly positioning: string | null;
  readonly audiences: readonly BrandAudienceV1[];
  readonly personality: BrandPersonalityV1 | null;
  readonly principles: readonly BrandPrincipleV1[];
  readonly promise: string | null;
  readonly differentiators: readonly string[];
  readonly status: BrandProfileStatus;
}

/** Placeholder válido y explícito (nunca inventa nombre/misión/valores) — usado por `web-complete` (checkpoint B). */
export function emptyBrandProfile(): BrandProfileV1 {
  return Object.freeze({
    formatVersion: BRAND_PROFILE_FORMAT_VERSION,
    name: null,
    shortName: null,
    description: null,
    purpose: null,
    mission: null,
    vision: null,
    values: Object.freeze([]),
    positioning: null,
    audiences: Object.freeze([]),
    personality: null,
    principles: Object.freeze([]),
    promise: null,
    differentiators: Object.freeze([]),
    status: "placeholder",
  });
}

const CORE_FIELD_COUNT = 8; // name, shortName, description, purpose, mission, vision, positioning, promise

/**
 * Deriva el estado de completitud a partir de campos presentes; nunca se marca `complete` si faltan
 * campos núcleo, y nunca se marca `placeholder` si hay al menos un campo núcleo completado (pasa a
 * `partial`/`needs-user-input` según corresponda en `BrandQualitySummaryV1`, no aquí).
 */
export function countCompletedCoreFields(profile: BrandProfileV1): number {
  const fields = [profile.name, profile.shortName, profile.description, profile.purpose, profile.mission, profile.vision, profile.positioning, profile.promise];
  return fields.filter((f) => f !== null && f.trim().length > 0).length;
}

export function coreFieldCount(): number {
  return CORE_FIELD_COUNT;
}
