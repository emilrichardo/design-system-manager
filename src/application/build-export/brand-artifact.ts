import {
  absentBrandQualitySummary,
  coreFieldCount,
  countCompletedCoreFields,
  emptyProvenanceBreakdown,
  type BrandEvidenceV1,
  type BrandProfileV1,
  type BrandQualitySummaryV1,
  type BrandUsageRuleV1,
  type BrandVisualLanguageV1,
  type BrandVoiceV1,
  type BrandSourceSnapshot,
} from "../../domain/brand/index.js";
import { resolveAssetReference } from "../../domain/brand/index.js";

export const BRAND_ARTIFACT_RELATIVE_PATH = "brand.json";

export interface BrandArtifactDocumentV1 {
  readonly formatVersion: "1.0.0";
  readonly profile: BrandProfileV1;
  readonly voice: BrandVoiceV1;
  readonly visualLanguage: BrandVisualLanguageV1;
  readonly usageGuidelines: readonly BrandUsageRuleV1[];
  readonly evidence: readonly BrandEvidenceV1[];
  readonly qualitySummary: BrandQualitySummaryV1;
}

export interface BrandArtifactBuildResult {
  readonly status: "absent" | "generated";
  readonly bytes: Uint8Array | null;
  readonly byteLength: number | null;
}

function serialize(document: BrandArtifactDocumentV1): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(document, null, 2)}\n`);
}

function evidenceOf(profile: BrandProfileV1): readonly BrandEvidenceV1[] {
  return profile.principles
    .map((principle) => principle.evidence)
    .filter((evidence): evidence is BrandEvidenceV1 => evidence !== null);
}

function qualitySummary(profile: BrandProfileV1, visualLanguage: BrandVisualLanguageV1): BrandQualitySummaryV1 {
  const resolvedLogoVariants = visualLanguage.logoVariants.map((reference) =>
    resolveAssetReference(reference, new Set(visualLanguage.logoVariants.flatMap((entry) => (entry.logicalPath === null ? [] : [entry.logicalPath])))),
  );
  const missingAssets = resolvedLogoVariants
    .filter((reference) => reference.required && reference.resolution !== "resolved")
    .map((reference) => ({
      variantRole: reference.variantRole ?? "(unspecified)",
      reason: reference.resolution === "placeholder" ? "placeholder" : "missing",
    }));
  return {
    overallStatus: profile.status,
    missingAssets: Object.freeze(missingAssets),
    fieldsCompleted: countCompletedCoreFields(profile),
    fieldsTotal: coreFieldCount(),
    provenanceBreakdown: Object.freeze(emptyProvenanceBreakdown()),
  };
}

export function buildBrandArtifact(snapshot: BrandSourceSnapshot): BrandArtifactBuildResult {
  if (snapshot.status === "absent") {
    return { status: "absent", bytes: null, byteLength: null };
  }

  const profile = (snapshot.documents.brandProfile.value ??
    null) as BrandProfileV1 | null;
  const voice = (snapshot.documents.voice.value ?? null) as BrandVoiceV1 | null;
  const visualLanguage = (snapshot.documents.visualLanguage.value ?? null) as BrandVisualLanguageV1 | null;
  const usageGuidelines = ((snapshot.documents.usageGuidelines.value ?? []) as readonly BrandUsageRuleV1[]) ?? [];

  if (profile === null || voice === null || visualLanguage === null) {
    return { status: "absent", bytes: null, byteLength: null };
  }

  const document: BrandArtifactDocumentV1 = {
    formatVersion: "1.0.0",
    profile,
    voice,
    visualLanguage,
    usageGuidelines,
    evidence: evidenceOf(profile),
    qualitySummary: qualitySummary(profile, visualLanguage),
  };

  const bytes = serialize(document);
  return {
    status: "generated",
    bytes,
    byteLength: bytes.byteLength,
  };
}

export function emptyBrandArtifactSummary(): BrandQualitySummaryV1 {
  return absentBrandQualitySummary();
}
