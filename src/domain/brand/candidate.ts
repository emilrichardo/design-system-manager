// T004 (011) — `CandidateV1` (data-model.md). Contrato puro; SIN productor real en `011` (crawler,
// analizador de imágenes, Figma e IA son `014`-`020`, fuera de alcance). Reutiliza el mismo vocabulario
// de evidencia que Brand System (`BrandEvidenceV1`) — un solo vocabulario de provenance en todo el
// producto, per contract.
import type { Issue } from "../issue.js";
import type { BrandEvidenceV1, BrandReviewState } from "./brand-evidence.js";
import { isBrandReviewState } from "./brand-evidence.js";

export const CANDIDATE_TARGET_LEVELS = ["brand", "foundations", "tokens", "assets", "components", "patterns", "templates"] as const;
export type CandidateTargetLevel = (typeof CANDIDATE_TARGET_LEVELS)[number];

export interface CandidateIssueV1 {
  readonly code: string;
  readonly severity: "warning" | "error";
  readonly message: string;
}

export interface CandidateV1 {
  readonly id: string;
  readonly targetLevel: CandidateTargetLevel;
  readonly proposedValue: unknown;
  readonly evidence: readonly BrandEvidenceV1[];
  readonly confidence: number;
  readonly issues: readonly CandidateIssueV1[];
  readonly reviewState: BrandReviewState;
}

const TARGET_LEVEL_SET: ReadonlySet<string> = new Set(CANDIDATE_TARGET_LEVELS);

export function isCandidateTargetLevel(value: unknown): value is CandidateTargetLevel {
  return typeof value === "string" && TARGET_LEVEL_SET.has(value);
}

/**
 * Invariante obligatoria (data-model.md): ningún caso de uso puede persistir un `CandidateV1` en la
 * fuente final salvo que `reviewState === "approved"` **por una acción explícita separada** — el mismo
 * boundary de aprobación que `TokenMutationResultV1` (008) y el Editor (010). Esta función es el único
 * punto de verdad para esa decisión; ningún escritor futuro debe reimplementarla.
 */
export function isApprovedForPersistence(candidate: CandidateV1): boolean {
  return candidate.reviewState === "approved";
}

export function validateCandidateShape(value: Partial<CandidateV1>): readonly Issue[] {
  const issues: Issue[] = [];
  if (typeof value.id !== "string" || value.id.length === 0) {
    issues.push({ code: "candidate-id-invalid", message: "CandidateV1.id debe ser un string no vacío." });
  }
  if (value.targetLevel !== undefined && !isCandidateTargetLevel(value.targetLevel)) {
    issues.push({ code: "candidate-target-level-invalid", message: `CandidateV1.targetLevel inválido: "${String(value.targetLevel)}".` });
  }
  if (value.confidence !== undefined && !(typeof value.confidence === "number" && Number.isFinite(value.confidence) && value.confidence >= 0 && value.confidence <= 1)) {
    issues.push({ code: "candidate-confidence-invalid", message: "CandidateV1.confidence debe estar en [0,1]." });
  }
  if (value.reviewState !== undefined && !isBrandReviewState(value.reviewState)) {
    issues.push({ code: "candidate-review-state-invalid", message: `CandidateV1.reviewState inválido: "${String(value.reviewState)}".` });
  }
  return issues;
}
