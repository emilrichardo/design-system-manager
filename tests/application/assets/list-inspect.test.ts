// T024 (007) — Casos de uso de lectura: listado/orden, manifest vacío, corrupto, inspección, not-found,
// summary y ownership. Usa un AssetStorePort fake (sin filesystem real).
import { describe, expect, it } from "vitest";
import { listAssets } from "../../../src/application/assets/list-assets.js";
import { inspectAsset } from "../../../src/application/assets/inspect-asset.js";
import { serializeAssetManifestV1, type AssetManifestV1 } from "../../../src/domain/assets/asset-manifest.js";
import { UNSPECIFIED_LICENSE, type AssetRecord } from "../../../src/domain/assets/asset-record.js";
import type { AssetStoreObservation, AssetStorePort, ManagedPathStatus } from "../../../src/application/assets/asset-ports.js";

const HASH = "b".repeat(64);
function rec(over: Partial<AssetRecord> = {}): AssetRecord {
  return {
    logicalPath: "images/a.png",
    kind: "image",
    mimeType: "image/png",
    byteLength: 10,
    contentHash: HASH,
    dimensions: { width: 10, height: 10, unit: "px" },
    provenance: { kind: "local-import", sourceRef: "in/a.png" },
    license: UNSPECIFIED_LICENSE,
    ...over,
  };
}
function fakeStore(observation: AssetStoreObservation): AssetStorePort {
  return { observe: () => Promise.resolve(observation) };
}
function parsedManifest(assets: AssetRecord[]): unknown {
  const m: AssetManifestV1 = { formatVersion: "1.0.0", assets };
  return JSON.parse(serializeAssetManifestV1(m));
}
function states(assets: AssetRecord[]): ManagedPathStatus[] {
  return assets.map((a) => ({ relativePath: a.logicalPath, state: "file" as const, contentHash: a.contentHash, byteLength: a.byteLength }));
}
function observation(assets: AssetRecord[], over: Partial<AssetStoreObservation> = {}): AssetStoreObservation {
  return {
    manifest: { state: "parsed", value: parsedManifest(assets) },
    managedPaths: assets.map((a) => a.logicalPath),
    managedPathStates: states(assets),
    unknownNodes: [],
    ...over,
  };
}

describe("listAssets (T024)", () => {
  it("manifest ausente → listed vacío (estado válido)", async () => {
    const r = await listAssets({ store: fakeStore({ manifest: { state: "absent" }, managedPaths: [], managedPathStates: [], unknownNodes: [] }) });
    expect(r.outcome).toBe("listed");
    expect(r.assets).toEqual([]);
    expect(r.summary.totalAssets).toBe(0);
  });

  it("lista en orden canónico con summary por kind", async () => {
    const assets = [rec({ logicalPath: "images/z.png" }), rec({ logicalPath: "fonts/a.woff2", kind: "font", mimeType: "font/woff2", dimensions: null })];
    const r = await listAssets({ store: fakeStore(observation(assets)) });
    expect(r.outcome).toBe("listed");
    expect(r.assets.map((a) => a.logicalPath)).toEqual(["fonts/a.woff2", "images/z.png"]); // font antes que image
    expect(r.summary.byKind.font).toBe(1);
    expect(r.summary.byKind.image).toBe(1);
    expect(r.summary.totalByteLength).toBe(20);
  });

  it("manifest corrupto → invalid-asset-store", async () => {
    const r = await listAssets({ store: fakeStore({ manifest: { state: "unreadable" }, managedPaths: [], managedPathStates: [], unknownNodes: [] }) });
    expect(r.outcome).toBe("invalid-asset-store");
    expect(r.conflicts[0]?.code).toBe("untrusted-asset-manifest");
  });

  it("manifest válido pero inválido en contenido → invalid-asset-store", async () => {
    const r = await listAssets({ store: fakeStore({ manifest: { state: "parsed", value: { formatVersion: "1.0.0", assets: [{ bogus: true }] } }, managedPaths: [], managedPathStates: [], unknownNodes: [] }) });
    expect(r.outcome).toBe("invalid-asset-store");
  });

  it("error de lectura → read-error", async () => {
    const store: AssetStorePort = { observe: () => Promise.reject(new Error("io")) };
    const r = await listAssets({ store });
    expect(r.outcome).toBe("read-error");
  });

  it("asset administrado ausente en disco → warning (no bloquea listado)", async () => {
    const assets = [rec()];
    const obs = observation(assets, { managedPathStates: [{ relativePath: "images/a.png", state: "absent", contentHash: null, byteLength: null }] });
    const r = await listAssets({ store: fakeStore(obs) });
    expect(r.outcome).toBe("listed");
    expect(r.conflicts.some((c) => c.code === "asset-missing")).toBe(true);
  });
});

describe("inspectAsset (T024)", () => {
  it("inspecciona un asset administrado", async () => {
    const assets = [rec()];
    const r = await inspectAsset({ logicalPath: "images/a.png" }, { store: fakeStore(observation(assets)) });
    expect(r.outcome).toBe("inspected");
    expect(r.inspection?.record.mimeType).toBe("image/png");
    expect(r.inspection?.pathState).toBe("file");
  });

  it("path no administrado → not-found", async () => {
    const r = await inspectAsset({ logicalPath: "images/missing.png" }, { store: fakeStore(observation([rec()])) });
    expect(r.outcome).toBe("not-found");
  });

  it("manifest corrupto → invalid-asset-store", async () => {
    const r = await inspectAsset({ logicalPath: "x" }, { store: fakeStore({ manifest: { state: "unreadable" }, managedPaths: [], managedPathStates: [], unknownNodes: [] }) });
    expect(r.outcome).toBe("invalid-asset-store");
  });
});
