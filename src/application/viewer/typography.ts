// T004/T031 (009) — Tipos de `ViewerTypographyV1`/`ViewerLicenseState` (data-model.md,
// contracts/viewer-typography-v1.contract.md) y `projectTypography` (Checkpoint D): lee subcampos
// TAL CUAL desde el `resolvedValue` ya cargado (nunca un default fabricado); enlaza con `007` por
// coincidencia de nombre de familia contra el `logicalPath` del asset de fuente (007 no expone metadata
// de familia tipada — es el único identificador disponible; no se re-consulta `listAssets`, se reusa el
// resultado ya obtenido en la sesión).
import type { ViewerTokenV1, SafeJsonValue } from "./token.js";
import type { ViewerAssetV1 } from "./asset.js";

/**
 * Estado de licencia mostrado en la vista Typography (data-model.md, enumeración `ViewerLicenseState`).
 * `no-matching-asset` es específico del Viewer (nunca persistido ni escrito a `007`).
 */
export type ViewerLicenseState = "declared" | "unspecified" | "no-matching-asset";

/**
 * Proyección de un token typography (`category === "typography"`). Todo subcampo es `null` cuando el
 * valor DTCG resuelto no lo declara — nunca un default/adivinado (FR-011).
 */
export interface ViewerTypographyV1 {
  readonly token: ViewerTokenV1;
  readonly family: string | null;
  readonly weight: string | number | null;
  readonly style: string | null;
  readonly size: SafeJsonValue | null;
  readonly lineHeight: SafeJsonValue | null;
  readonly letterSpacing: SafeJsonValue | null;
  readonly linkedFontAsset: ViewerAssetV1 | null;
  readonly licenseState: ViewerLicenseState;
}

interface TypographySubfields {
  readonly family: string | null;
  readonly weight: string | number | null;
  readonly style: string | null;
  readonly size: SafeJsonValue | null;
  readonly lineHeight: SafeJsonValue | null;
  readonly letterSpacing: SafeJsonValue | null;
}

const EMPTY_SUBFIELDS: TypographySubfields = { family: null, weight: null, style: null, size: null, lineHeight: null, letterSpacing: null };

/**
 * Lee los subcampos DTCG estándar TAL CUAL desde `resolvedValue`, según el `effectiveType` ya resuelto:
 * `typography` (compuesto DTCG con sus propios campos estándar `fontFamily`/`fontWeight`/`fontStyle`/
 * `fontSize`/`lineHeight`/`letterSpacing`), o un tipo escalar único (`fontFamily`/`fontWeight` solos).
 * Cualquier otro `effectiveType` (p. ej. `dimension`/`number` sueltos bajo la categoría typography, o
 * indeterminable) ⇒ todos los subcampos `null` — nunca se adivina a qué subcampo pertenecería.
 */
function readSubfields(effectiveType: string | null, value: SafeJsonValue): TypographySubfields {
  if (effectiveType === "fontFamily") {
    return { ...EMPTY_SUBFIELDS, family: readFontFamily(value) };
  }
  if (effectiveType === "fontWeight") {
    return { ...EMPTY_SUBFIELDS, weight: typeof value === "string" || typeof value === "number" ? value : null };
  }
  if (effectiveType === "typography" && typeof value === "object" && value !== null && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const family = readFontFamily(rec["fontFamily"] as SafeJsonValue);
    const weight = typeof rec["fontWeight"] === "string" || typeof rec["fontWeight"] === "number" ? (rec["fontWeight"] as string | number) : null;
    const style = typeof rec["fontStyle"] === "string" ? rec["fontStyle"] : null;
    return {
      family,
      weight,
      style,
      size: rec["fontSize"] ?? null,
      lineHeight: rec["lineHeight"] ?? null,
      letterSpacing: rec["letterSpacing"] ?? null,
    };
  }
  return EMPTY_SUBFIELDS;
}

function readFontFamily(value: SafeJsonValue): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string")) {
    return value.join(", ");
  }
  return null;
}

/** Normaliza un nombre de familia para comparación difusa (minúsculas, solo alfanuméricos). */
function normalizeFamilyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Nombre base del asset (sin directorios ni extensión) para comparar contra una familia tipográfica. */
function assetBaseName(logicalPath: string): string {
  const last = logicalPath.split("/").pop() ?? logicalPath;
  return last.replace(/\.[^.]+$/, "");
}

/**
 * Enlaza con un asset de fuente (`007`, `kind === "font"`) ya cargado en la sesión (sin una segunda
 * `listAssets`), por coincidencia difusa entre `family` y el nombre base del asset — `007` no expone
 * metadata de familia tipada; es el único identificador disponible.
 */
function findLinkedFontAsset(family: string | null, fontAssets: readonly ViewerAssetV1[]): ViewerAssetV1 | null {
  if (family === null) return null;
  const target = normalizeFamilyName(family);
  if (target.length === 0) return null;
  return fontAssets.find((a) => normalizeFamilyName(assetBaseName(a.logicalPath)) === target) ?? null;
}

function deriveLicenseState(linkedFontAsset: ViewerAssetV1 | null): ViewerLicenseState {
  if (linkedFontAsset === null) return "no-matching-asset";
  return linkedFontAsset.license.status === "declared" ? "declared" : "unspecified";
}

/**
 * Proyecta `ViewerTypographyV1` desde un `ViewerTokenV1` ya categorizado como `typography` y los assets
 * `font` YA cargados en la sesión (una sola `listAssets`, reusada — nunca una segunda consulta por token).
 */
export function projectTypography(token: ViewerTokenV1, fontAssets: readonly ViewerAssetV1[]): ViewerTypographyV1 {
  const subfields = readSubfields(token.effectiveType, token.resolvedValue);
  const linkedFontAsset = findLinkedFontAsset(subfields.family, fontAssets);
  return { token, ...subfields, linkedFontAsset, licenseState: deriveLicenseState(linkedFontAsset) };
}
