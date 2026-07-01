// T001 (011) — `BrandEvidenceV1` (data-model.md). Dominio puro: sin `node:fs`, sin `Error`.
import { isProvenanceStatus, isValidConfidence, type ProvenanceStatus } from "../provenance.js";

export const BRAND_REVIEW_STATES = ["pending", "approved", "rejected"] as const;
export type BrandReviewState = (typeof BRAND_REVIEW_STATES)[number];

const REVIEW_STATE_SET: ReadonlySet<string> = new Set(BRAND_REVIEW_STATES);

export function isBrandReviewState(value: unknown): value is BrandReviewState {
  return typeof value === "string" && REVIEW_STATE_SET.has(value);
}

/** Nunca se asume `official`/`user-confirmed`: `status` por defecto debe declararse explícitamente. */
export interface BrandEvidenceV1 {
  readonly source: string | null;
  readonly evidence: string | null;
  readonly confidence: number | null;
  readonly author: string | null;
  readonly license: string | null;
  readonly origin: string | null;
  readonly date: string | null;
  readonly status: ProvenanceStatus;
  readonly reviewState: BrandReviewState;
}

export function createBrandEvidence(input: {
  readonly source?: string | null;
  readonly evidence?: string | null;
  readonly confidence?: number | null;
  readonly author?: string | null;
  readonly license?: string | null;
  readonly origin?: string | null;
  readonly date?: string | null;
  readonly status: ProvenanceStatus;
  readonly reviewState?: BrandReviewState;
}): BrandEvidenceV1 {
  return Object.freeze({
    source: input.source ?? null,
    evidence: input.evidence ?? null,
    confidence: input.confidence ?? null,
    author: input.author ?? null,
    license: input.license ?? null,
    origin: input.origin ?? null,
    date: input.date ?? null,
    status: input.status,
    reviewState: input.reviewState ?? "pending",
  });
}

/** Valida forma; no lanza. Devuelve `true` solo si `status`/`reviewState`/`confidence` son coherentes. */
export function isValidBrandEvidence(value: BrandEvidenceV1): boolean {
  return isProvenanceStatus(value.status) && isBrandReviewState(value.reviewState) && isValidConfidence(value.confidence);
}
