// T003 (007) — Manifest de assets v1 (autoridad de ownership) y su validación/serialización canónica.
// Dominio puro. NO importa código de tokens/build (separación estricta): define sus propios guards de
// path/hash. Serialización determinista: `JSON.stringify(...,2)+"\n"`, UTF-8, sin BOM, LF final único.
import { isAssetKind, type AssetKind } from "./asset-kind.js";
import { isAssetMimeType, isMimeCompatibleWithKind } from "./asset-mime.js";
import { licenseInvariantHolds, type AssetLicense, type AssetProvenance, type AssetRecord } from "./asset-record.js";

export const ASSET_MANIFEST_FORMAT_VERSION = "1.0.0";
export const ASSET_MANIFEST_FILENAME = "assets.json";
export const ASSET_STORE_ROOT = "design-system/assets";

/** Manifest de assets v1. `formatVersion` es la primera clave; `assets` en orden canónico. */
export interface AssetManifestV1 {
  readonly formatVersion: typeof ASSET_MANIFEST_FORMAT_VERSION;
  readonly assets: readonly AssetRecord[];
}

/** SHA-256 hex en minúsculas (64 chars `[0-9a-f]`). */
export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

/** Path lógico relativo seguro: no vacío, sin absolute/drive/UNC, sin traversal ni backslash. */
export function isSafeAssetPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("/") || value.startsWith("\\")) return false;
  if (/^[A-Za-z]:/.test(value)) return false;
  if (value.includes("\\")) return false;
  const segments = value.split("/");
  return segments.every((s) => s.length > 0 && s !== "." && s !== "..");
}

export type AssetManifestValidation =
  | { readonly ok: true; readonly manifest: AssetManifestV1 }
  | { readonly ok: false; readonly reason: string };

function invalid(reason: string): AssetManifestValidation {
  return { ok: false, reason };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const ROOT_KEYS = ["formatVersion", "assets"] as const;
const RECORD_KEYS = ["logicalPath", "kind", "mimeType", "byteLength", "contentHash", "dimensions", "provenance", "license"] as const;
const DIM_KEYS = ["width", "height", "unit"] as const;
const PROV_KEYS = ["kind", "sourceRef"] as const;
const LIC_KEYS = ["status", "identifier", "notice"] as const;

function validateDimensions(value: unknown): boolean {
  if (value === null) return true;
  if (!isPlainRecord(value)) return false;
  for (const k of Object.keys(value)) if (!(DIM_KEYS as readonly string[]).includes(k)) return false;
  const okNum = (n: unknown): boolean => n === null || (typeof n === "number" && Number.isFinite(n) && n >= 0);
  if (!okNum(value.width) || !okNum(value.height)) return false;
  return value.unit === null || value.unit === "px" || value.unit === "user";
}

function validateProvenance(value: unknown): value is AssetProvenance {
  if (!isPlainRecord(value)) return false;
  for (const k of Object.keys(value)) if (!(PROV_KEYS as readonly string[]).includes(k)) return false;
  return value.kind === "local-import" && typeof value.sourceRef === "string" && isSafeAssetPath(value.sourceRef);
}

function validateLicense(value: unknown): value is AssetLicense {
  if (!isPlainRecord(value)) return false;
  for (const k of Object.keys(value)) if (!(LIC_KEYS as readonly string[]).includes(k)) return false;
  const { status, identifier, notice } = value;
  if (status !== "declared" && status !== "unspecified") return false;
  if (!(identifier === null || typeof identifier === "string")) return false;
  if (!(notice === null || typeof notice === "string")) return false;
  return licenseInvariantHolds({ status, identifier, notice });
}

/** Valida una estructura ya parseada como `AssetManifestV1` confiable. Rechaza claves extra, duplicados,
 *  hashes/paths inválidos y MIME incompatible con el kind. */
export function validateAssetManifestV1(candidate: unknown): AssetManifestValidation {
  if (!isPlainRecord(candidate)) return invalid("manifest no es un objeto plano");
  for (const key of Object.keys(candidate)) {
    if (!(ROOT_KEYS as readonly string[]).includes(key)) return invalid(`clave raíz desconocida: ${key}`);
  }
  if (candidate.formatVersion !== ASSET_MANIFEST_FORMAT_VERSION) return invalid("formatVersion no soportada");
  if (!Array.isArray(candidate.assets)) return invalid("assets no es un array");

  const seenPaths = new Set<string>();
  const assets: AssetRecord[] = [];
  for (const entry of candidate.assets) {
    if (!isPlainRecord(entry)) return invalid("asset no es un objeto plano");
    for (const k of Object.keys(entry)) if (!(RECORD_KEYS as readonly string[]).includes(k)) return invalid(`clave de asset desconocida: ${k}`);
    if (!isAssetKind(entry.kind)) return invalid("kind de asset desconocido");
    const kind: AssetKind = entry.kind;
    if (!isAssetMimeType(entry.mimeType)) return invalid("mimeType de asset desconocido");
    if (!isMimeCompatibleWithKind(kind, entry.mimeType)) return invalid(`mimeType incompatible con kind ${kind}`);
    if (typeof entry.logicalPath !== "string" || !isSafeAssetPath(entry.logicalPath)) return invalid("logicalPath inseguro");
    if (typeof entry.byteLength !== "number" || !Number.isInteger(entry.byteLength) || entry.byteLength < 0) return invalid("byteLength inválido");
    if (!isSha256Hex(entry.contentHash)) return invalid("contentHash inválido");
    if (!validateDimensions(entry.dimensions)) return invalid("dimensions inválidas");
    if (!validateProvenance(entry.provenance)) return invalid("provenance inválida");
    if (!validateLicense(entry.license)) return invalid("license inválida");
    if (seenPaths.has(entry.logicalPath)) return invalid("logicalPath duplicado");
    seenPaths.add(entry.logicalPath);
    assets.push(
      Object.freeze({
        logicalPath: entry.logicalPath,
        kind,
        mimeType: entry.mimeType,
        byteLength: entry.byteLength,
        contentHash: entry.contentHash,
        dimensions: entry.dimensions === null ? null : Object.freeze({ ...(entry.dimensions as object) }),
        provenance: Object.freeze({ ...(entry.provenance as object) }),
        license: Object.freeze({ ...(entry.license as object) }),
      }) as AssetRecord,
    );
  }
  return { ok: true, manifest: Object.freeze({ formatVersion: ASSET_MANIFEST_FORMAT_VERSION, assets: Object.freeze(assets) }) };
}

/** Serialización canónica determinista del manifest (2 espacios, LF final, sin BOM). */
export function serializeAssetManifestV1(manifest: AssetManifestV1): string {
  const document = {
    formatVersion: manifest.formatVersion,
    assets: manifest.assets.map((a) => ({
      logicalPath: a.logicalPath,
      kind: a.kind,
      mimeType: a.mimeType,
      byteLength: a.byteLength,
      contentHash: a.contentHash,
      dimensions: a.dimensions,
      provenance: a.provenance,
      license: a.license,
    })),
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

/** Manifest vacío válido (estado inicial cuando no hay assets administrados). */
export const EMPTY_ASSET_MANIFEST: AssetManifestV1 = Object.freeze({ formatVersion: ASSET_MANIFEST_FORMAT_VERSION, assets: Object.freeze([]) });
