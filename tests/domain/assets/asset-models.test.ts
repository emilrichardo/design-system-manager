// T007 (007) — Modelos de dominio de assets: enums cerrados, compatibilidad kind↔MIME, invariantes de
// licencia/outcome/recovery, validación y serialización canónica del manifest, orden canónico.
import { describe, expect, it } from "vitest";
import {
  ASSET_KINDS,
  ASSET_OUTCOMES,
  EMPTY_ASSET_MANIFEST,
  UNSPECIFIED_LICENSE,
  compareAssets,
  declaredLicense,
  isAssetKind,
  isAssetMimeType,
  isMimeCompatibleWithKind,
  isSafeAssetPath,
  isSha256Hex,
  licenseInvariantHolds,
  orderAssets,
  recoveryInvariantHolds,
  serializeAssetManifestV1,
  validateAssetManifestV1,
  wroteInvariantHolds,
  type AssetManifestV1,
  type AssetRecord,
} from "../../../src/domain/assets/index.js";

const HASH = "a".repeat(64);
function record(over: Partial<AssetRecord> = {}): AssetRecord {
  return {
    logicalPath: "images/hero.png",
    kind: "image",
    mimeType: "image/png",
    byteLength: 10,
    contentHash: HASH,
    dimensions: { width: 100, height: 50, unit: "px" },
    provenance: { kind: "local-import", sourceRef: "incoming/hero.png" },
    license: UNSPECIFIED_LICENSE,
    ...over,
  };
}
function manifest(assets: AssetRecord[]): AssetManifestV1 {
  return { formatVersion: "1.0.0", assets };
}

describe("asset enums & guards", () => {
  it("AssetKind es un conjunto cerrado de 5", () => {
    expect(ASSET_KINDS).toEqual(["font", "logo", "svg", "icon", "image"]);
    expect(isAssetKind("image")).toBe(true);
    expect(isAssetKind("video")).toBe(false);
  });

  it("MIME guard y compatibilidad kind↔MIME", () => {
    expect(isAssetMimeType("image/png")).toBe(true);
    expect(isAssetMimeType("image/tiff")).toBe(false);
    expect(isMimeCompatibleWithKind("font", "font/woff2")).toBe(true);
    expect(isMimeCompatibleWithKind("font", "image/png")).toBe(false);
    expect(isMimeCompatibleWithKind("svg", "image/svg+xml")).toBe(true);
    expect(isMimeCompatibleWithKind("svg", "image/png")).toBe(false);
    expect(isMimeCompatibleWithKind("icon", "image/svg+xml")).toBe(true);
    expect(isMimeCompatibleWithKind("icon", "image/png")).toBe(true);
    expect(isMimeCompatibleWithKind("image", "image/svg+xml")).toBe(false);
  });

  it("guards de hash y path", () => {
    expect(isSha256Hex(HASH)).toBe(true);
    expect(isSha256Hex("xyz")).toBe(false);
    expect(isSafeAssetPath("fonts/inter.woff2")).toBe(true);
    expect(isSafeAssetPath("../escape")).toBe(false);
    expect(isSafeAssetPath("/abs")).toBe(false);
    expect(isSafeAssetPath("a\\b")).toBe(false);
  });
});

describe("license never assumed", () => {
  it("UNSPECIFIED es la única forma sin valor explícito", () => {
    expect(UNSPECIFIED_LICENSE).toEqual({ status: "unspecified", identifier: null, notice: null });
    expect(licenseInvariantHolds(UNSPECIFIED_LICENSE)).toBe(true);
  });

  it("declaredLicense sin valor degrada a unspecified (no asume)", () => {
    expect(declaredLicense({})).toEqual(UNSPECIFIED_LICENSE);
    expect(declaredLicense({ identifier: "CC-BY-4.0" }).status).toBe("declared");
  });

  it("invariante: declared exige identifier o notice", () => {
    expect(licenseInvariantHolds({ status: "declared", identifier: null, notice: null })).toBe(false);
  });
});

describe("outcomes & recovery", () => {
  it("no existen partial/success/blocked como outcomes", () => {
    expect((ASSET_OUTCOMES as readonly string[]).includes("partial")).toBe(false);
    expect((ASSET_OUTCOMES as readonly string[]).includes("success")).toBe(false);
    expect((ASSET_OUTCOMES as readonly string[]).includes("blocked")).toBe(false);
  });

  it("wrote invariant", () => {
    expect(wroteInvariantHolds("applied", true)).toBe(true);
    expect(wroteInvariantHolds("listed", false)).toBe(true);
    expect(wroteInvariantHolds("listed", true)).toBe(false);
    expect(wroteInvariantHolds("verification-error", true)).toBe(true);
  });

  it("recovery invariant: write-error before move vs post-commit verification-error", () => {
    expect(recoveryInvariantHolds("write-error", { storeAvailable: true, backupRelativePath: null, recoveryRequired: false })).toBe(true);
    expect(recoveryInvariantHolds("write-error", { storeAvailable: false, backupRelativePath: "design-system/assets.backup", recoveryRequired: true })).toBe(true);
    expect(recoveryInvariantHolds("verification-error", { storeAvailable: true, backupRelativePath: "design-system/assets.backup", recoveryRequired: true })).toBe(true);
    expect(recoveryInvariantHolds("verification-error", { storeAvailable: true, backupRelativePath: null, recoveryRequired: false })).toBe(false);
  });
});

describe("manifest validation & serialization", () => {
  it("manifest vacío es válido", () => {
    expect(validateAssetManifestV1(EMPTY_ASSET_MANIFEST).ok).toBe(true);
  });

  it("acepta un manifest bien formado", () => {
    const r = validateAssetManifestV1(manifest([record()]));
    expect(r.ok).toBe(true);
  });

  it("rechaza claves desconocidas, MIME incompatible, hash inválido, duplicados", () => {
    expect(validateAssetManifestV1({ formatVersion: "1.0.0", assets: [], extra: 1 }).ok).toBe(false);
    expect(validateAssetManifestV1(manifest([record({ kind: "font", mimeType: "image/png" })])).ok).toBe(false);
    expect(validateAssetManifestV1(manifest([record({ contentHash: "nope" })])).ok).toBe(false);
    expect(validateAssetManifestV1(manifest([record(), record()])).ok).toBe(false); // duplicado por logicalPath
    expect(validateAssetManifestV1({ formatVersion: "2.0.0", assets: [] }).ok).toBe(false);
  });

  it("rechaza licencia declared sin valor explícito", () => {
    expect(validateAssetManifestV1(manifest([record({ license: { status: "declared", identifier: null, notice: null } })])).ok).toBe(false);
  });

  it("serialización canónica: 2 espacios, LF final, parseable, determinista", () => {
    const text = serializeAssetManifestV1(manifest([record()]));
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.endsWith("}\n\n")).toBe(false);
    expect(text).toContain('\n  "');
    expect(() => JSON.parse(text)).not.toThrow();
    expect(serializeAssetManifestV1(manifest([record()]))).toBe(text);
    const reparsed = validateAssetManifestV1(JSON.parse(text));
    expect(reparsed.ok).toBe(true);
  });
});

describe("canonical order", () => {
  it("ordena por kind y luego por logicalPath bytewise", () => {
    const a = orderAssets([
      { kind: "image", logicalPath: "images/z.png" },
      { kind: "font", logicalPath: "fonts/b.woff2" },
      { kind: "font", logicalPath: "fonts/a.woff2" },
      { kind: "svg", logicalPath: "svg/icon.svg" },
    ]);
    expect(a.map((x) => x.logicalPath)).toEqual(["fonts/a.woff2", "fonts/b.woff2", "svg/icon.svg", "images/z.png"]);
    expect(compareAssets({ kind: "font", logicalPath: "a" }, { kind: "image", logicalPath: "a" })).toBeLessThan(0);
  });
});
