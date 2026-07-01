// T001/T004 (011) — Superficie pública del dominio de Brand System. Solo tipos y funciones puras; sin
// filesystem, sin CLI, sin dependencia de Viewer/Editor/Asset Manager concretos (writer/casos de uso
// son checkpoint D).
export type { BrandReviewState, BrandEvidenceV1 } from "./brand-evidence.js";
export { BRAND_REVIEW_STATES, isBrandReviewState, createBrandEvidence, isValidBrandEvidence } from "./brand-evidence.js";
export type { BrandDocumentKey, BrandDocumentSnapshot, BrandSourceSnapshot } from "./brand-store.js";
export { BRAND_ROOT, BRAND_FILES } from "./brand-store.js";

export type { BrandProfileStatus, BrandAudienceV1, BrandPersonalityV1, BrandPrincipleV1, BrandProfileV1 } from "./brand-profile.js";
export {
  BRAND_PROFILE_STATUSES,
  BRAND_PROFILE_FORMAT_VERSION,
  emptyBrandProfile,
  countCompletedCoreFields,
  coreFieldCount,
} from "./brand-profile.js";

export type { BrandToneDimensionV1, BrandVoiceV1 } from "./brand-voice.js";
export { BRAND_VOICE_FORMAT_VERSION, emptyBrandVoice, isToneDimensionComplete } from "./brand-voice.js";

export type {
  BrandAssetResolution,
  BrandAssetReferenceV1,
  BrandUsageRuleV1,
  BrandTypographicRoleV1,
  BrandVisualLanguageV1,
} from "./brand-visual-language.js";
export {
  BRAND_ASSET_RESOLUTIONS,
  BRAND_VISUAL_LANGUAGE_FORMAT_VERSION,
  REQUIRED_LOGO_VARIANT_ROLES,
  placeholderAssetReference,
  resolveAssetReference,
  emptyBrandVisualLanguage,
} from "./brand-visual-language.js";

export type { BrandQualityStatus, BrandMissingAssetV1, BrandQualitySummaryV1 } from "./brand-quality.js";
export { BRAND_QUALITY_STATUSES, emptyProvenanceBreakdown, absentBrandQualitySummary, isBrandProfileStatus } from "./brand-quality.js";

export type { CandidateTargetLevel, CandidateIssueV1, CandidateV1 } from "./candidate.js";
export { CANDIDATE_TARGET_LEVELS, isCandidateTargetLevel, isApprovedForPersistence, validateCandidateShape } from "./candidate.js";
