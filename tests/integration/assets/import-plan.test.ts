// T032 (007) — planAssetImport: add/duplicate/blocked, dimensiones, dedup, licencia requerida, límites,
// determinismo y NO escritura. Usa probes reales (infra) y un AssetStorePort fake.
import { describe, expect, it } from "vitest";
import { planAssetImport } from "../../../src/application/assets/plan-asset-import.js";
import { detectMime } from "../../../src/infrastructure/assets/mime-detector.js";
import { readDimensions } from "../../../src/infrastructure/assets/dimension-reader.js";
import { validateFont } from "../../../src/infrastructure/assets/font-validator.js";
import { sanitizeSvg } from "../../../src/infrastructure/assets/svg-sanitizer.js";
import { sha256Hex } from "../../../src/infrastructure/assets/hash.js";
import { serializeAssetManifestV1, type AssetManifestV1 } from "../../../src/domain/assets/asset-manifest.js";
import { UNSPECIFIED_LICENSE, type AssetRecord } from "../../../src/domain/assets/asset-record.js";
import { ASSET_LIMITS } from "../../../src/domain/assets/asset-limits.js";
import type { AssetProbesPort, AssetStoreObservation, AssetStorePort, ImportSource } from "../../../src/application/assets/asset-ports.js";

const probes: AssetProbesPort = { detectMime, readDimensions, validateFont, sanitizeSvg, hash: sha256Hex };
const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
function png(w: number, h: number): Uint8Array {
  return Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, ...ascii("IHDR"), 0, 0, (w >> 8) & 255, w & 255, 0, 0, (h >> 8) & 255, h & 255, 1, 2, 3, 4]);
}
const svg = (s: string): Uint8Array => new TextEncoder().encode(s);

function manifestValue(assets: AssetRecord[]): unknown {
  const m: AssetManifestV1 = { formatVersion: "1.0.0", assets };
  return JSON.parse(serializeAssetManifestV1(m));
}
function store(observation: AssetStoreObservation): AssetStorePort {
  return { observe: () => Promise.resolve(observation) };
}
function obs(over: Partial<AssetStoreObservation> = {}): AssetStoreObservation {
  return { manifest: { state: "absent" }, managedPaths: [], managedPathStates: [], unknownNodes: [], ...over };
}
function source(over: Partial<ImportSource> = {}): ImportSource {
  return { sourceRef: "in/a.png", bytes: png(10, 5), kind: "image", destinationPath: "images/a.png", ...over };
}

describe("planAssetImport (T032)", () => {
  it("add: PNG válido con licencia → verdict add, dimensiones y hash", async () => {
    const r = await planAssetImport({ sources: [source({ license: { identifier: "CC0-1.0" } })] }, { store: store(obs()), probes });
    expect(r.outcome).toBe("planned");
    const c = r.plan!.candidates[0];
    expect(c.verdict).toBe("add");
    expect(c.mimeType).toBe("image/png");
    expect(c.dimensions).toEqual({ width: 10, height: 5, unit: "px" });
    expect(c.license.status).toBe("declared");
    expect(r.plan!.summary).toEqual({ add: 1, duplicate: 0, blocked: 0 });
  });

  it("licencia: sin metadata → warning license-required (no bloquea)", async () => {
    const r = await planAssetImport({ sources: [source()] }, { store: store(obs()), probes });
    const c = r.plan!.candidates[0];
    expect(c.verdict).toBe("add");
    expect(c.license.status).toBe("unspecified");
    expect(c.issues.some((i) => i.code === "license-required" && i.severity === "warning")).toBe(true);
  });

  it("duplicate: hash existente en el manifest → duplicate + duplicateOf", async () => {
    const bytes = png(8, 8);
    const existing: AssetRecord = {
      logicalPath: "images/exist.png", kind: "image", mimeType: "image/png", byteLength: bytes.byteLength,
      contentHash: sha256Hex(bytes), dimensions: { width: 8, height: 8, unit: "px" },
      provenance: { kind: "local-import", sourceRef: "in/exist.png" }, license: UNSPECIFIED_LICENSE,
    };
    const observation = obs({ manifest: { state: "parsed", value: manifestValue([existing]) }, managedPaths: ["images/exist.png"], managedPathStates: [{ relativePath: "images/exist.png", state: "file", contentHash: existing.contentHash, byteLength: bytes.byteLength }] });
    const r = await planAssetImport({ sources: [source({ bytes, destinationPath: "images/new.png" })] }, { store: store(observation), probes });
    const c = r.plan!.candidates[0];
    expect(c.verdict).toBe("duplicate");
    expect(c.duplicateOf).toBe("images/exist.png");
  });

  it("blocked: MIME no soportado", async () => {
    const r = await planAssetImport({ sources: [source({ bytes: Uint8Array.from([0, 1, 2, 3]) })] }, { store: store(obs()), probes });
    const c = r.plan!.candidates[0];
    expect(c.verdict).toBe("blocked");
    expect(c.destinationPath).toBeNull();
    expect(c.issues.some((i) => i.code === "unsupported-mime")).toBe(true);
  });

  it("blocked: kind incompatible con MIME (png declarado font)", async () => {
    const r = await planAssetImport({ sources: [source({ kind: "font" })] }, { store: store(obs()), probes });
    expect(r.plan!.candidates[0].verdict).toBe("blocked");
    expect(r.plan!.candidates[0].issues.some((i) => i.code === "unsupported-mime")).toBe(true);
  });

  it("blocked: path inseguro (traversal)", async () => {
    const r = await planAssetImport({ sources: [source({ destinationPath: "../escape.png" })] }, { store: store(obs()), probes });
    expect(r.plan!.candidates[0].verdict).toBe("blocked");
    expect(r.plan!.candidates[0].issues.some((i) => i.code === "path-unsafe")).toBe(true);
  });

  it("svg con script → sanitizado (add) con preview; el original no se muta", async () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>1</script><rect/></svg>';
    const src = source({ sourceRef: "in/i.svg", bytes: svg(dirty), kind: "svg", destinationPath: "svg/i.svg" });
    const r = await planAssetImport({ sources: [src] }, { store: store(obs()), probes });
    const c = r.plan!.candidates[0];
    expect(c.verdict).toBe("add");
    expect(c.mimeType).toBe("image/svg+xml");
    expect(c.sanitization?.removed).toEqual(expect.arrayContaining(["script", "event-handler"]));
    // El hash es de los bytes saneados, distinto del original sucio.
    expect(c.contentHash).not.toBe(sha256Hex(svg(dirty)));
  });

  it("svg no saneable / no-svg → blocked", async () => {
    const r = await planAssetImport({ sources: [source({ bytes: svg("<html></html>"), kind: "svg", destinationPath: "svg/x.svg" })] }, { store: store(obs()), probes });
    expect(r.plan!.candidates[0].verdict).toBe("blocked");
  });

  it("colisión con contenido desconocido en el destino → blocked owned-by-unknown", async () => {
    const observation = obs({ unknownNodes: [{ relativePath: "images/a.png", rawKind: "regular-file", byteLength: 3, depth: 1 }] });
    const r = await planAssetImport({ sources: [source()] }, { store: store(observation), probes });
    expect(r.plan!.candidates[0].issues.some((i) => i.code === "owned-by-unknown")).toBe(true);
    expect(r.plan!.candidates[0].verdict).toBe("blocked");
  });

  it("límite global de bytes → add bloqueado por too-large", async () => {
    const big: AssetRecord = {
      logicalPath: "images/big.png", kind: "image", mimeType: "image/png", byteLength: ASSET_LIMITS.maxTotalBytes,
      contentHash: "d".repeat(64), dimensions: null, provenance: { kind: "local-import", sourceRef: "in/big" }, license: UNSPECIFIED_LICENSE,
    };
    const observation = obs({ manifest: { state: "parsed", value: manifestValue([big]) }, managedPaths: ["images/big.png"], managedPathStates: [{ relativePath: "images/big.png", state: "file", contentHash: big.contentHash, byteLength: big.byteLength }] });
    const r = await planAssetImport({ sources: [source()] }, { store: store(observation), probes });
    const c = r.plan!.candidates[0];
    expect(c.verdict).toBe("blocked");
    expect(c.issues.some((i) => i.code === "too-large")).toBe(true);
  });

  it("manifest no confiable → invalid-asset-store (no se planifica)", async () => {
    const r = await planAssetImport({ sources: [source()] }, { store: store(obs({ manifest: { state: "unreadable" } })), probes });
    expect(r.outcome).toBe("invalid-asset-store");
    expect(r.plan).toBeNull();
  });

  it("determinista: dos ejecuciones idénticas producen el mismo plan", async () => {
    const input = { sources: [source({ destinationPath: "images/a.png" }), source({ sourceRef: "in/b.png", bytes: png(4, 4), destinationPath: "images/b.png" })] };
    const a = await planAssetImport(input, { store: store(obs()), probes });
    const b = await planAssetImport(input, { store: store(obs()), probes });
    expect(JSON.stringify(a.plan)).toBe(JSON.stringify(b.plan));
  });
});
