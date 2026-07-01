// T022/T024 (011) — Derivación pura de `BrandQualitySummaryV1` (data-model.md) desde un
// `BrandSourceSnapshot` YA cargado (D) + el inventario real de assets de `007` (ya leído por la capa
// de aplicación). Dominio de aplicación: sin filesystem, sin Commander, sin dependencia del Viewer.
// Nunca inventa presencia de brand ni de assets: si el snapshot está `absent`, devuelve el resumen
// `absent` canónico (compatibilidad con 001-010 sin Brand System, FR-017/SC-003).
import {
  absentBrandQualitySummary,
  coreFieldCount,
  countCompletedCoreFields,
  emptyBrandVisualLanguage,
  emptyBrandProfile,
  emptyBrandVoice,
  emptyProvenanceBreakdown,
  resolveAssetReference,
  type BrandEvidenceV1,
  type BrandProfileV1,
  type BrandProfileStatus,
  type BrandQualitySummaryV1,
  type BrandSourceSnapshot,
  type BrandUsageRuleV1,
  type BrandVisualLanguageV1,
  type BrandVoiceV1,
} from "../../domain/brand/index.js";
import type { ProvenanceStatus } from "../../domain/provenance.js";

/** Documentos brand ya normalizados a sus formas canónicas (o vacíos si faltan/no parsean). */
export interface NormalizedBrandDocuments {
  readonly profile: BrandProfileV1;
  readonly voice: BrandVoiceV1;
  readonly visualLanguage: BrandVisualLanguageV1;
  readonly usageGuidelines: readonly BrandUsageRuleV1[];
}

/** Normaliza el snapshot a las formas canónicas. Nunca lanza; si un documento falta o no parsea,
 * usa la forma `empty*` (estado explícito `placeholder`/`absent`, nunca inferencia silenciosa). */
export function normalizeBrandDocuments(snapshot: BrandSourceSnapshot): NormalizedBrandDocuments {
  const profileDoc = snapshot.documents.brandProfile;
  const voiceDoc = snapshot.documents.voice;
  const visualLanguageDoc = snapshot.documents.visualLanguage;
  const usageDoc = snapshot.documents.usageGuidelines;
  return {
    profile: profileDoc.state === "parsed" && isBrandProfile(profileDoc.value) ? profileDoc.value : emptyBrandProfile(),
    voice: voiceDoc.state === "parsed" && isBrandVoice(voiceDoc.value) ? voiceDoc.value : emptyBrandVoice(),
    visualLanguage:
      visualLanguageDoc.state === "parsed" && isBrandVisualLanguage(visualLanguageDoc.value)
        ? visualLanguageDoc.value
        : emptyBrandVisualLanguage(),
    usageGuidelines:
      usageDoc.state === "parsed" && Array.isArray(usageDoc.value)
        ? (usageDoc.value as readonly BrandUsageRuleV1[])
        : Object.freeze([] as readonly BrandUsageRuleV1[]),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBrandProfile(value: unknown): value is BrandProfileV1 {
  return isRecord(value) && value.formatVersion === "1.0.0";
}

function isBrandVoice(value: unknown): value is BrandVoiceV1 {
  return isRecord(value) && value.formatVersion === "1.0.0";
}

function isBrandVisualLanguage(value: unknown): value is BrandVisualLanguageV1 {
  return isRecord(value) && value.formatVersion === "1.0.0";
}

function collectEvidence(documents: NormalizedBrandDocuments): readonly BrandEvidenceV1[] {
  const evidences: BrandEvidenceV1[] = [];
  for (const principle of documents.profile.principles) {
    if (principle.evidence !== null) evidences.push(principle.evidence);
  }
  return Object.freeze(evidences);
}

function provenanceBreakdownFrom(evidence: readonly BrandEvidenceV1[]): Readonly<Record<ProvenanceStatus, number>> {
  const breakdown = emptyProvenanceBreakdown();
  for (const entry of evidence) {
    breakdown[entry.status] = (breakdown[entry.status] ?? 0) + 1;
  }
  return Object.freeze(breakdown);
}

/**
 * Deriva el `BrandQualitySummaryV1` desde el snapshot ya cargado y el inventario real de assets de
 * `007` (`knownAssetLogicalPaths`). `knownAssetLogicalPaths` puede estar vacío (projects sin assets):
 * en ese caso, todo `logoVariants.required` con `logicalPath` fuera del inventario se reporta como
 * `missing` (nunca se asume resuelto). Si el snapshot está `absent`, devuelve el resumen `absent`
 * canónico sin tocar el inventario.
 */
export function deriveBrandQualitySummary(
  snapshot: BrandSourceSnapshot,
  knownAssetLogicalPaths: ReadonlySet<string>,
): BrandQualitySummaryV1 {
  if (snapshot.status === "absent") return absentBrandQualitySummary();

  const documents = normalizeBrandDocuments(snapshot);
  const resolvedLogoVariants = documents.visualLanguage.logoVariants.map((reference) =>
    resolveAssetReference(reference, knownAssetLogicalPaths),
  );
  const missingAssets = resolvedLogoVariants
    .filter((reference) => reference.required && reference.resolution !== "resolved")
    .map((reference) => ({
      variantRole: reference.variantRole ?? "(unspecified)",
      reason: reference.resolution === "placeholder" ? "placeholder" : "missing",
    }));

  const evidence = collectEvidence(documents);
  const breakdown = provenanceBreakdownFrom(evidence);

  // `overallStatus` se deriva del `status` del perfil (canónico) salvo cuando hay missing assets
  // requeridos: en ese caso nunca puede ser `complete` (baja a `needs-user-input` para señalizar la
  // acción pendiente, sin reescribir el `status` persistido del perfil — eso es decisión del Editor).
  const profileStatus: BrandProfileStatus = documents.profile.status;
  const hasMissing = missingAssets.length > 0;
  const overallStatus: BrandQualitySummaryV1["overallStatus"] =
    profileStatus === "complete" && hasMissing
      ? "needs-user-input"
      : profileStatus;

  return Object.freeze({
    overallStatus,
    missingAssets: Object.freeze(missingAssets),
    fieldsCompleted: countCompletedCoreFields(documents.profile),
    fieldsTotal: coreFieldCount(),
    provenanceBreakdown: breakdown,
  });
}
