// T022 (011) — Proyección pública `ViewerBrandV1` (data-model.md). Consumida por la vista `brand`
// del Viewer (E). Es una proyección PURA sobre datos ya cargados por D/007/002: nunca lee filesystem,
// nunca valida assets (007 sigue siendo la autoridad — la resolución que aquí se muestra ya vino de
// `resolveAssetReference` contra el inventario real), nunca reescribe brand. Las inferencias
// (`status: "placeholder"`/`"inferred"`) se muestran como tales, nunca como decisiones oficiales.
import type {
  BrandAssetReferenceV1,
  BrandAudienceV1,
  BrandPersonalityV1,
  BrandPrincipleV1,
  BrandProfileV1,
  BrandQualitySummaryV1,
  BrandToneDimensionV1,
  BrandUsageRuleV1,
  BrandVisualLanguageV1,
  BrandVoiceV1,
} from "../../domain/brand/index.js";
import type { NormalizedBrandDocuments } from "../brand/brand-quality-summary.js";

/** Una referencia de asset de marca proyectada para UI: statuses explícitos, sin rutas absolutas. */
export interface ViewerBrandAssetReferenceV1 {
  readonly variantRole: string | null;
  readonly logicalPath: string | null;
  readonly required: boolean;
  readonly resolution: "resolved" | "missing" | "placeholder";
  readonly assetKind: "logo" | "font" | "icon" | "image" | "unknown";
}

export interface ViewerBrandAssetGroupV1 {
  readonly kind: "logos" | "fonts" | "icons" | "imagery";
  readonly references: readonly ViewerBrandAssetReferenceV1[];
  readonly missing: readonly ViewerBrandAssetReferenceV1[];
}

export interface ViewerBrandVoiceV1 {
  readonly voicePrinciples: readonly string[];
  readonly toneDimensions: readonly (BrandToneDimensionV1 & { readonly complete: boolean })[];
  readonly terminology: { readonly preferred: readonly string[]; readonly forbidden: readonly string[] };
  readonly microcopyGuidance: string | null;
  readonly errorMessageGuidance: string | null;
  readonly ctaGuidance: string | null;
}

export interface ViewerBrandVisualLanguageV1 {
  readonly brandColors: readonly string[];
  readonly supportingColors: readonly string[];
  readonly typographicRoles: readonly { readonly role: string; readonly tokenPath: string }[];
  readonly clearSpace: string | null;
  readonly minimumSize: string | null;
  readonly iconStyle: string | null;
  readonly illustrationStyle: string | null;
  readonly photographyStyle: string | null;
  readonly imageTreatment: string | null;
  readonly compositionGuidance: string | null;
  readonly shapeLanguage: string | null;
  readonly borderLanguage: string | null;
  readonly shadowLanguage: string | null;
  readonly motionLanguage: string | null;
  readonly usageRules: readonly (BrandUsageRuleV1 & { readonly kindLabel: "do" | "dont" })[];
}

/** Identidad de marca proyectada (sólo campos declarados; `null` cuando no fue proporcionado). */
export interface ViewerBrandProfileV1 {
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
}

/**
 * Proyección completa de la vista `brand`. `status` se mantiene explícito
 * (`absent`/`placeholder`/`partial`/`complete`/`needs-user-input`) — la UI nunca lo deduce del color ni
 * lo oculta. Cuando `status === "absent"`, todos los subobjetos son vacíos canónicos (nunca `null`
 * excepto `profile`/`voice`/`visualLanguage`, que se conservan como ausentes para que la UI muestre
 * "Brand System: absent" sin recursión sobre campos que no existen).
 */
export interface ViewerBrandV1 {
  readonly status: BrandQualitySummaryV1["overallStatus"];
  readonly profile: ViewerBrandProfileV1 | null;
  readonly voice: ViewerBrandVoiceV1 | null;
  readonly visualLanguage: ViewerBrandVisualLanguageV1 | null;
  readonly assetGroups: readonly ViewerBrandAssetGroupV1[];
  readonly quality: BrandQualitySummaryV1;
  readonly standards: readonly { readonly id: string; readonly alignment: "authoritative" | "reference" | "interop-target" }[];
}

const DTCG_STANDARDS = Object.freeze([
  Object.freeze({ id: "DTCG", alignment: "authoritative" }),
  Object.freeze({ id: "Open UI", alignment: "reference" }),
  Object.freeze({ id: "WAI-ARIA APG", alignment: "reference" }),
  Object.freeze({ id: "WCAG", alignment: "reference" }),
  Object.freeze({ id: "UI Specification Schema", alignment: "interop-target" }),
] as const);

function projectProfile(profile: BrandProfileV1): ViewerBrandProfileV1 {
  return Object.freeze({
    name: profile.name,
    shortName: profile.shortName,
    description: profile.description,
    purpose: profile.purpose,
    mission: profile.mission,
    vision: profile.vision,
    values: profile.values,
    positioning: profile.positioning,
    audiences: profile.audiences,
    personality: profile.personality,
    principles: profile.principles,
    promise: profile.promise,
    differentiators: profile.differentiators,
  });
}

function projectVoice(voice: BrandVoiceV1): ViewerBrandVoiceV1 {
  return Object.freeze({
    voicePrinciples: voice.voicePrinciples,
    toneDimensions: voice.toneDimensions.map((dimension) => ({
      ...dimension,
      complete: isToneDimensionComplete(dimension),
    })),
    terminology: voice.terminology,
    microcopyGuidance: voice.microcopyGuidance,
    errorMessageGuidance: voice.errorMessageGuidance,
    ctaGuidance: voice.ctaGuidance,
  });
}

function isToneDimensionComplete(dimension: BrandToneDimensionV1): boolean {
  return dimension.examples.do.length > 0 && dimension.examples.dont.length > 0;
}

function projectVisualLanguage(visualLanguage: BrandVisualLanguageV1): ViewerBrandVisualLanguageV1 {
  const usageRules = [
    ...visualLanguage.backgroundCompatibility,
    ...visualLanguage.incorrectUsage,
  ].map((rule) => ({ ...rule, kindLabel: rule.kind as "do" | "dont" }));
  return Object.freeze({
    brandColors: visualLanguage.brandColors,
    supportingColors: visualLanguage.supportingColors,
    typographicRoles: visualLanguage.typographicRoles,
    clearSpace: visualLanguage.clearSpace,
    minimumSize: visualLanguage.minimumSize,
    iconStyle: visualLanguage.iconStyle,
    illustrationStyle: visualLanguage.illustrationStyle,
    photographyStyle: visualLanguage.photographyStyle,
    imageTreatment: visualLanguage.imageTreatment,
    compositionGuidance: visualLanguage.compositionGuidance,
    shapeLanguage: visualLanguage.shapeLanguage,
    borderLanguage: visualLanguage.borderLanguage,
    shadowLanguage: visualLanguage.shadowLanguage,
    motionLanguage: visualLanguage.motionLanguage,
    usageRules: Object.freeze(usageRules),
  });
}

function classifyAssetKind(reference: BrandAssetReferenceV1): ViewerBrandAssetReferenceV1["assetKind"] {
  const role = (reference.variantRole ?? "").toLowerCase();
  if (role.includes("font") || role === "heading" || role === "body") return "font";
  if (role.includes("icon")) return "icon";
  if (role.includes("image") || role.includes("illustration") || role.includes("photo")) return "image";
  return "logo";
}

function projectAssetReference(reference: BrandAssetReferenceV1): ViewerBrandAssetReferenceV1 {
  return Object.freeze({
    variantRole: reference.variantRole,
    logicalPath: reference.logicalPath,
    required: reference.required,
    resolution: reference.resolution,
    assetKind: classifyAssetKind(reference),
  });
}

function groupAssetReferences(
  references: readonly BrandAssetReferenceV1[],
  missingVariantRoles: ReadonlySet<string>,
): readonly ViewerBrandAssetGroupV1[] {
  const projected = references.map((reference) =>
    projectAssetReference(
      missingVariantRoles.has(reference.variantRole ?? "") && reference.resolution === "resolved"
        ? { ...reference, resolution: "missing" }
        : reference,
    ),
  );
  const buckets: Record<ViewerBrandAssetGroupV1["kind"], ViewerBrandAssetReferenceV1[]> = {
    logos: [],
    fonts: [],
    icons: [],
    imagery: [],
  };
  for (const reference of projected) {
    if (reference.assetKind === "font") buckets.fonts.push(reference);
    else if (reference.assetKind === "icon") buckets.icons.push(reference);
    else if (reference.assetKind === "image") buckets.imagery.push(reference);
    else buckets.logos.push(reference);
  }
  const order: readonly ViewerBrandAssetGroupV1["kind"][] = ["logos", "fonts", "icons", "imagery"];
  return Object.freeze(
    order
      .map((kind) => {
        const groupReferences = Object.freeze(buckets[kind]);
        return {
          kind,
          references: groupReferences,
          missing: Object.freeze(groupReferences.filter((reference) => reference.resolution !== "resolved")),
        };
      })
      .filter((group) => group.references.length > 0),
  );
}

/**
 * Proyecta `ViewerBrandV1` desde los documentos normalizados (D) y el resumen de calidad ya derivado
 * (T022/T024). `quality` ya viene con `overallStatus`/`missingAssets`/`provenanceBreakdown` calculados
 * contra el inventario real de 007 — esta función no revalida assets.
 */
export function projectBrand(documents: NormalizedBrandDocuments, quality: BrandQualitySummaryV1): ViewerBrandV1 {
  const missingVariantRoles = new Set(quality.missingAssets.map((missing) => missing.variantRole));
  return Object.freeze({
    status: quality.overallStatus,
    profile: projectProfile(documents.profile),
    voice: projectVoice(documents.voice),
    visualLanguage: projectVisualLanguage(documents.visualLanguage),
    assetGroups: groupAssetReferences(documents.visualLanguage.logoVariants, missingVariantRoles),
    quality,
    standards: DTCG_STANDARDS,
  });
}

/** Proyección de-brand-ausente (proyectos 001-010 sin `brand/`): todo vacío canónico, status `absent`. */
export function absentViewerBrand(quality: BrandQualitySummaryV1): ViewerBrandV1 {
  return Object.freeze({
    status: quality.overallStatus,
    profile: null,
    voice: null,
    visualLanguage: null,
    assetGroups: Object.freeze([]),
    quality,
    standards: DTCG_STANDARDS,
  });
}
