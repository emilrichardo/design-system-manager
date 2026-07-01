// T001 (011) — `BrandQualitySummaryV1` (data-model.md). Derivado/proyectado, no persistido; el mismo
// vocabulario de estado (`overallStatus`) se reutiliza para `brand: absent` en proyectos 001-010 sin
// Brand System (compatibilidad, FR-017).
import type { ProvenanceStatus } from "../provenance.js";
import { BRAND_PROFILE_STATUSES, type BrandProfileStatus } from "./brand-profile.js";

/** Superconjunto de `BrandProfileStatus` + `absent` (proyecto sin `design-system/brand/`). */
export const BRAND_QUALITY_STATUSES = [...BRAND_PROFILE_STATUSES, "absent"] as const;
export type BrandQualityStatus = (typeof BRAND_QUALITY_STATUSES)[number];

export interface BrandMissingAssetV1 {
  readonly variantRole: string;
  readonly reason: string;
}

export interface BrandQualitySummaryV1 {
  readonly overallStatus: BrandQualityStatus;
  readonly missingAssets: readonly BrandMissingAssetV1[];
  readonly fieldsCompleted: number;
  readonly fieldsTotal: number;
  readonly provenanceBreakdown: Readonly<Record<ProvenanceStatus, number>>;
}

export function emptyProvenanceBreakdown(): Record<ProvenanceStatus, number> {
  return { official: 0, observed: 0, inferred: 0, generated: 0, placeholder: 0, "user-confirmed": 0 };
}

/** `brand: absent` — nunca `invalid` (FR-017/SC-003, compatibilidad con 001-010 sin Brand System). */
export function absentBrandQualitySummary(): BrandQualitySummaryV1 {
  return Object.freeze({
    overallStatus: "absent",
    missingAssets: Object.freeze([]),
    fieldsCompleted: 0,
    fieldsTotal: 0,
    provenanceBreakdown: Object.freeze(emptyProvenanceBreakdown()),
  });
}

export function isBrandProfileStatus(value: BrandQualityStatus): value is BrandProfileStatus {
  return (BRAND_PROFILE_STATUSES as readonly string[]).includes(value);
}
