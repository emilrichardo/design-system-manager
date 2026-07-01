// T046 (009) — `projectAssetsFromList`: paridad campo a campo con `007`, `sanitization` siempre `null`
// (007 no la recalcula para assets ya almacenados — límite conocido, nunca fabricada), `license.status
// === "unspecified"` ⇒ identifier/notice nulos, `ownership.state` derivado sin una segunda observación.
import { describe, expect, it } from "vitest";
import { projectAssetsFromList } from "../../../src/application/viewer/asset.js";
import { UNSPECIFIED_LICENSE, declaredLicense, type AssetRecord } from "../../../src/domain/assets/asset-record.js";
import type { AssetListResult } from "../../../src/application/assets/asset-ports.js";

function record(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    logicalPath: "images/hero.png",
    kind: "image",
    mimeType: "image/png",
    byteLength: 2048,
    contentHash: "b".repeat(64),
    dimensions: { width: 10, height: 5, unit: "px" },
    provenance: { kind: "local-import", sourceRef: "hero.png" },
    license: UNSPECIFIED_LICENSE,
    ...overrides,
  };
}

function listResult(overrides: Partial<AssetListResult> = {}): AssetListResult {
  return {
    outcome: "listed",
    assets: [record()],
    summary: { totalAssets: 1, byKind: { font: 0, logo: 0, svg: 0, icon: 1, image: 0 }, totalByteLength: 2048 },
    conflicts: [],
    error: null,
    ...overrides,
  };
}

describe("projectAssetsFromList (T046)", () => {
  it("paridad campo a campo con AssetRecord (007)", () => {
    const svgRecord = record({ logicalPath: "svg/icon.svg", kind: "svg", mimeType: "image/svg+xml", dimensions: { width: 24, height: 24, unit: "user" } });
    const [projected] = projectAssetsFromList(listResult({ assets: [svgRecord] }));
    expect(projected).toMatchObject({
      logicalPath: svgRecord.logicalPath,
      kind: svgRecord.kind,
      mimeType: svgRecord.mimeType,
      byteLength: svgRecord.byteLength,
      contentHash: svgRecord.contentHash,
      dimensions: svgRecord.dimensions,
      provenance: svgRecord.provenance,
      license: svgRecord.license,
    });
  });

  it("sanitization es siempre null (007 no la recalcula para assets ya almacenados), incluso para SVG", () => {
    const svgRecord = record({ kind: "svg", mimeType: "image/svg+xml" });
    const [projected] = projectAssetsFromList(listResult({ assets: [svgRecord] }));
    expect(projected?.sanitization).toBeNull();
  });

  it("sanitization es null para kinds no-SVG también", () => {
    const [projected] = projectAssetsFromList(listResult());
    expect(projected?.kind).toBe("image");
    expect(projected?.sanitization).toBeNull();
  });

  it("license.status === 'unspecified' ⇒ identifier y notice nulos (invariante de 007)", () => {
    const [projected] = projectAssetsFromList(listResult());
    expect(projected?.license.status).toBe("unspecified");
    expect(projected?.license.identifier).toBeNull();
    expect(projected?.license.notice).toBeNull();
  });

  it("license.status === 'declared' preserva identifier/notice", () => {
    const declared = record({ license: declaredLicense({ identifier: "MIT", notice: "Copyright Acme" }) });
    const [projected] = projectAssetsFromList(listResult({ assets: [declared] }));
    expect(projected?.license).toEqual({ status: "declared", identifier: "MIT", notice: "Copyright Acme" });
  });

  it("sin assets: proyección vacía (el estado 'empty' de ownership no tiene ningún registro que portarlo)", () => {
    const result = projectAssetsFromList(listResult({ assets: [], summary: { totalAssets: 0, byKind: { font: 0, logo: 0, svg: 0, icon: 0, image: 0 }, totalByteLength: 0 } }));
    expect(result).toEqual([]);
  });

  it("ownership.state = 'trusted' cuando hay assets y ningún conflicto de manifest", () => {
    const [projected] = projectAssetsFromList(listResult());
    expect(projected?.ownership.state).toBe("trusted");
  });

  it("ownership.state = 'untrusted-asset-manifest' cuando hay ese conflicto", () => {
    const [projected] = projectAssetsFromList(
      listResult({ conflicts: [{ code: "untrusted-asset-manifest", path: null, severity: "error", message: "manifest inválido", blocksWrite: true }] }),
    );
    expect(projected?.ownership.state).toBe("untrusted-asset-manifest");
  });

  it("issues por-asset: solo los conflictos con ese path exacto", () => {
    const [projected] = projectAssetsFromList(
      listResult({
        conflicts: [
          { code: "license-required", path: "images/hero.png", severity: "warning", message: "sin licencia", blocksWrite: false },
          { code: "svg-unsafe", path: "svg/other.svg", severity: "error", message: "otro asset", blocksWrite: true },
        ],
      }),
    );
    expect(projected?.issues).toHaveLength(1);
    expect(projected?.issues[0]).toMatchObject({ source: "assets", code: "license-required", path: "images/hero.png" });
  });

  it("nunca expone bytes crudos (solo metadata ya calculada por 007)", () => {
    const [projected] = projectAssetsFromList(listResult());
    expect(projected).not.toHaveProperty("bytes");
    expect(projected).not.toHaveProperty("content");
  });
});
