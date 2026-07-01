// T001 (011) — `BrandVisualLanguageV1`/`BrandAssetReferenceV1`/`BrandUsageRuleV1` — data-model.md.
// Sin dependencia del Asset Manager concreto (007): la resolución de `logicalPath` contra el
// inventario real se inyecta como `readonly Set<string>` ya obtenido por la capa de aplicación vía
// puerto (nunca `node:fs` ni un cliente de `007` importado aquí).
export const BRAND_ASSET_RESOLUTIONS = ["resolved", "missing", "placeholder"] as const;
export type BrandAssetResolution = (typeof BRAND_ASSET_RESOLUTIONS)[number];

export interface BrandAssetReferenceV1 {
  readonly logicalPath: string | null;
  readonly variantRole: string | null;
  readonly required: boolean;
  readonly resolution: BrandAssetResolution;
}

export function placeholderAssetReference(variantRole: string, required: boolean): BrandAssetReferenceV1 {
  return Object.freeze({ logicalPath: null, variantRole, required, resolution: "placeholder" });
}

/** Deriva `resolution` contra el inventario real (ya leído por la aplicación) — nunca inventa presencia. */
export function resolveAssetReference(ref: BrandAssetReferenceV1, knownLogicalPaths: ReadonlySet<string>): BrandAssetReferenceV1 {
  if (ref.logicalPath === null) {
    return { ...ref, resolution: ref.required ? "missing" : "placeholder" };
  }
  return { ...ref, resolution: knownLogicalPaths.has(ref.logicalPath) ? "resolved" : "missing" };
}

export interface BrandUsageRuleV1 {
  readonly id: string;
  readonly kind: "do" | "dont";
  readonly description: string;
  readonly relatedAsset: string | null;
}

export interface BrandTypographicRoleV1 {
  readonly role: string;
  readonly tokenPath: string;
}

export const BRAND_VISUAL_LANGUAGE_FORMAT_VERSION = "1.0.0";

export interface BrandVisualLanguageV1 {
  readonly formatVersion: typeof BRAND_VISUAL_LANGUAGE_FORMAT_VERSION;
  readonly logoVariants: readonly BrandAssetReferenceV1[];
  readonly clearSpace: string | null;
  readonly minimumSize: string | null;
  readonly backgroundCompatibility: readonly BrandUsageRuleV1[];
  readonly incorrectUsage: readonly BrandUsageRuleV1[];
  readonly brandColors: readonly string[];
  readonly supportingColors: readonly string[];
  readonly typographicRoles: readonly BrandTypographicRoleV1[];
  readonly iconStyle: string | null;
  readonly illustrationStyle: string | null;
  readonly photographyStyle: string | null;
  readonly imageTreatment: string | null;
  readonly compositionGuidance: string | null;
  readonly shapeLanguage: string | null;
  readonly borderLanguage: string | null;
  readonly shadowLanguage: string | null;
  readonly motionLanguage: string | null;
}

export function emptyBrandVisualLanguage(): BrandVisualLanguageV1 {
  return Object.freeze({
    formatVersion: BRAND_VISUAL_LANGUAGE_FORMAT_VERSION,
    logoVariants: Object.freeze([]),
    clearSpace: null,
    minimumSize: null,
    backgroundCompatibility: Object.freeze([]),
    incorrectUsage: Object.freeze([]),
    brandColors: Object.freeze([]),
    supportingColors: Object.freeze([]),
    typographicRoles: Object.freeze([]),
    iconStyle: null,
    illustrationStyle: null,
    photographyStyle: null,
    imageTreatment: null,
    compositionGuidance: null,
    shapeLanguage: null,
    borderLanguage: null,
    shadowLanguage: null,
    motionLanguage: null,
  });
}

/** Variantes de logo requeridas por `web-complete` (checkpoint B) — solo el vocabulario, sin asset real. */
export const REQUIRED_LOGO_VARIANT_ROLES = ["primary", "monochrome", "horizontal", "vertical", "dark-background"] as const;
