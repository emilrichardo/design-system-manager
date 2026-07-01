import type { ViewerAssetV1 } from "./asset.js";
import type { SafeJsonValue, ViewerTokenV1 } from "./token.js";

export type ViewerTypographyKind =
  | "font-family"
  | "font-size"
  | "font-weight"
  | "line-height"
  | "letter-spacing"
  | "typography-composite";

export interface FontAssetMatchV1 {
  readonly logicalPath: string;
  readonly family: string | null;
  readonly weight: string | null;
  readonly style: string | null;
  readonly format: string | null;
  readonly license: {
    readonly status: "declared" | "unspecified";
    readonly identifier: string | null;
  };
  readonly matchState: "matched" | "ambiguous";
}

export interface ViewerTypographyFontFamilyV1 {
  readonly kind: "font-family";
  readonly token: ViewerTokenV1;
  readonly family: string | null;
  readonly matchedAssets: readonly FontAssetMatchV1[];
  readonly matchState: "matched" | "no-candidates" | "ambiguous";
}

export interface ViewerTypographyValueV1 {
  readonly kind: "font-size" | "font-weight" | "line-height" | "letter-spacing";
  readonly token: ViewerTokenV1;
  readonly value: SafeJsonValue | null;
}

export interface ViewerTypographyCompositeV1 {
  readonly kind: "typography-composite";
  readonly token: ViewerTokenV1;
  readonly family: string | null;
  readonly weight: string | number | null;
  readonly style: string | null;
  readonly size: SafeJsonValue | null;
  readonly lineHeight: SafeJsonValue | null;
  readonly letterSpacing: SafeJsonValue | null;
  readonly matchedAssets: readonly FontAssetMatchV1[];
  readonly matchState: "matched" | "no-candidates" | "ambiguous";
}

export type ViewerTypographyV1 =
  | ViewerTypographyFontFamilyV1
  | ViewerTypographyValueV1
  | ViewerTypographyCompositeV1;

interface TypographyCompositeFields {
  readonly family: string | null;
  readonly weight: string | number | null;
  readonly style: string | null;
  readonly size: SafeJsonValue | null;
  readonly lineHeight: SafeJsonValue | null;
  readonly letterSpacing: SafeJsonValue | null;
}

const EMPTY_COMPOSITE_FIELDS: TypographyCompositeFields = {
  family: null,
  weight: null,
  style: null,
  size: null,
  lineHeight: null,
  letterSpacing: null,
};

function readFontFamily(value: SafeJsonValue): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string")) {
    return value.join(", ");
  }
  return null;
}

function readCompositeFields(value: SafeJsonValue): TypographyCompositeFields {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return EMPTY_COMPOSITE_FIELDS;
  const record = value as Record<string, unknown>;
  return {
    family: readFontFamily((record.fontFamily ?? null) as SafeJsonValue),
    weight: typeof record.fontWeight === "string" || typeof record.fontWeight === "number" ? record.fontWeight : null,
    style: typeof record.fontStyle === "string" ? record.fontStyle : null,
    size: (record.fontSize ?? null) as SafeJsonValue | null,
    lineHeight: (record.lineHeight ?? null) as SafeJsonValue | null,
    letterSpacing: (record.letterSpacing ?? null) as SafeJsonValue | null,
  };
}

function normalizeFamilyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assetBaseName(logicalPath: string): string {
  const last = logicalPath.split("/").pop() ?? logicalPath;
  return last.replace(/\.[^.]+$/, "");
}

function assetFormat(asset: ViewerAssetV1): string | null {
  const format = asset.mimeType.split("/")[1] ?? null;
  return format === null ? null : format.toLowerCase();
}

function createFontAssetMatch(asset: ViewerAssetV1, matchState: "matched" | "ambiguous"): FontAssetMatchV1 {
  return {
    logicalPath: asset.logicalPath,
    family: null,
    weight: null,
    style: null,
    format: assetFormat(asset),
    license: {
      status: asset.license.status,
      identifier: asset.license.identifier,
    },
    matchState,
  };
}

function matchFontAssets(family: string | null, fontAssets: readonly ViewerAssetV1[]): Pick<ViewerTypographyFontFamilyV1, "matchedAssets" | "matchState"> {
  if (family === null) return { matchedAssets: [], matchState: "no-candidates" };
  const target = normalizeFamilyName(family);
  if (target.length === 0) return { matchedAssets: [], matchState: "no-candidates" };
  // El inventario actual de 007 no expone metadata tipográfica estructurada; mientras exista esa
  // limitación, la coincidencia reutiliza el identificador disponible del asset sin fabricar defaults.
  const matches = fontAssets.filter((asset) => normalizeFamilyName(assetBaseName(asset.logicalPath)) === target);
  if (matches.length === 0) return { matchedAssets: [], matchState: "no-candidates" };
  if (matches.length === 1) return { matchedAssets: [createFontAssetMatch(matches[0]!, "matched")], matchState: "matched" };
  return { matchedAssets: matches.map((asset) => createFontAssetMatch(asset, "ambiguous")), matchState: "ambiguous" };
}

function inferValueKind(token: ViewerTokenV1): ViewerTypographyValueV1["kind"] {
  const path = token.path.toLowerCase();
  if (path.includes("line-height") || path.includes("lineheight")) return "line-height";
  if (path.includes("letter-spacing") || path.includes("letterspacing")) return "letter-spacing";
  if (token.effectiveType === "fontWeight") return "font-weight";
  return "font-size";
}

export function projectTypography(token: ViewerTokenV1, fontAssets: readonly ViewerAssetV1[]): ViewerTypographyV1 {
  if (token.effectiveType === "typography") {
    const fields = readCompositeFields(token.resolvedValue);
    const match = matchFontAssets(fields.family, fontAssets);
    return { kind: "typography-composite", token, ...fields, ...match };
  }

  if (token.effectiveType === "fontFamily") {
    const family = readFontFamily(token.resolvedValue);
    const match = matchFontAssets(family, fontAssets);
    return { kind: "font-family", token, family, ...match };
  }

  return {
    kind: inferValueKind(token),
    token,
    value:
      token.effectiveType === "fontWeight" ||
      token.effectiveType === "dimension" ||
      token.effectiveType === "number"
        ? token.resolvedValue
        : null,
  };
}
