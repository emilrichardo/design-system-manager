import { classifyAssetOwnership } from "../assets/ownership.js";
import type { AssetStorePort } from "../assets/asset-ports.js";
import type { BrandAssetReferenceV1, BrandVisualLanguageV1 } from "../../domain/brand/index.js";
import { resolveAssetReference } from "../../domain/brand/index.js";
import { analysisError, type AnalysisIssue } from "../../domain/analysis/analysis-issue.js";

export interface ValidateBrandInput {
  readonly visualLanguage: BrandVisualLanguageV1;
}

export type BrandValidationOutcome = "valid" | "invalid-brand" | "invalid-asset-store" | "read-error";

export interface BrandValidationResult {
  readonly outcome: BrandValidationOutcome;
  readonly visualLanguage: BrandVisualLanguageV1;
  readonly issues: readonly AnalysisIssue[];
  readonly error: { readonly code: string; readonly message: string } | null;
}

export interface ValidateBrandDependencies {
  readonly store: AssetStorePort;
}

function missingAssetIssue(reference: BrandAssetReferenceV1): AnalysisIssue {
  const assetRef = reference.logicalPath ?? reference.variantRole ?? "(unspecified)";
  return analysisError(
    "brand-asset-reference-missing",
    `La referencia de brand asset "${assetRef}" no existe en el inventario administrado.`,
    { document: "tokens", path: reference.logicalPath ?? reference.variantRole ?? "brand.visual-language.logoVariants" },
  );
}

export async function validateBrand(
  input: ValidateBrandInput,
  deps: ValidateBrandDependencies,
): Promise<BrandValidationResult> {
  let observation;
  try {
    observation = await deps.store.observe();
  } catch {
    return {
      outcome: "read-error",
      visualLanguage: input.visualLanguage,
      issues: [],
      error: { code: "read-error", message: "No se pudo leer el asset store." },
    };
  }

  const ownership = classifyAssetOwnership(observation);
  if (ownership.state === "untrusted-asset-manifest") {
    return {
      outcome: "invalid-asset-store",
      visualLanguage: input.visualLanguage,
      issues: ownership.conflicts.map((conflict) =>
        analysisError(conflict.code, conflict.message, { document: "tokens", ...(conflict.path !== null ? { path: conflict.path } : {}) }),
      ),
      error: { code: "invalid-asset-store", message: "El manifest de assets no es confiable." },
    };
  }

  const knownLogicalPaths = new Set((ownership.manifest?.assets ?? []).map((asset) => asset.logicalPath));
  const resolvedLogoVariants = input.visualLanguage.logoVariants.map((reference) =>
    resolveAssetReference(reference, knownLogicalPaths),
  );
  const issues = resolvedLogoVariants
    .filter((reference) => reference.resolution === "missing")
    .map((reference) => missingAssetIssue(reference));

  return {
    outcome: issues.length === 0 ? "valid" : "invalid-brand",
    visualLanguage: {
      ...input.visualLanguage,
      logoVariants: Object.freeze(resolvedLogoVariants),
    },
    issues: Object.freeze(issues),
    error: null,
  };
}
