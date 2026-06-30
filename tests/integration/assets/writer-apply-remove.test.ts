// T039 (007) — apply/remove como conjunto sobre filesystem real: staging→backup→swap, contenido
// desconocido preservado, manifest actualizado, unsafe-target.
import { rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyAssetImport } from "../../../src/application/assets/apply-asset-import.js";
import { removeAsset } from "../../../src/application/assets/remove-asset.js";
import { createAssetStoreReader } from "../../../src/infrastructure/assets/asset-store-reader.js";
import { createAssetSetWriter } from "../../../src/infrastructure/assets/asset-set-writer.js";
import { validateAssetManifestV1 } from "../../../src/domain/assets/asset-manifest.js";
import { makeAssetHost, png, realProbes, type AssetHost } from "./asset-store-fixtures.js";

const hosts: AssetHost[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});
async function host(): Promise<AssetHost> {
  const h = await makeAssetHost();
  hosts.push(h);
  return h;
}
const deps = (h: AssetHost) => ({ store: createAssetStoreReader(h.rootDir), probes: realProbes, writer: createAssetSetWriter(h.rootDir) });
const source = (rel: string, bytes: Uint8Array, kind = "image" as const) => ({ sourceRef: `in/${rel}`, bytes, kind, destinationPath: rel, license: { identifier: "CC0-1.0" } });

describe("apply/remove transaccional (T039)", () => {
  it("apply publica el conjunto, preserva contenido desconocido y actualiza el manifest", async () => {
    const h = await host();
    const existing = await h.record("image", "images/keep.png", png(4, 4, 1), "image/png");
    await h.writeManifest([existing]);
    await h.writeRaw("notes.txt", new TextEncoder().encode("keep me")); // unknown
    await h.writeRaw("extra/data.bin", new TextEncoder().encode("nested")); // unknown nested

    const r = await applyAssetImport({ sources: [source("images/hero.png", png(10, 5, 2))] }, deps(h));
    expect(r.outcome).toBe("applied");
    expect(r.wrote).toBe(true);

    expect(await h.exists("images/hero.png")).toBe(true);
    expect(await h.exists("images/keep.png")).toBe(true); // managed kept
    expect(new TextDecoder().decode(await h.read("notes.txt"))).toBe("keep me"); // unknown preserved
    expect(new TextDecoder().decode(await h.read("extra/data.bin"))).toBe("nested");

    const manifest = validateAssetManifestV1(JSON.parse(new TextDecoder().decode(await h.read("assets.json"))));
    expect(manifest.ok).toBe(true);
    if (manifest.ok) expect(manifest.manifest.assets.map((a) => a.logicalPath).sort()).toEqual(["images/hero.png", "images/keep.png"]);
    // staging/backup limpiados tras éxito.
    expect((await h.siblings()).sort()).toEqual(["assets"]);
  });

  it("remove elimina archivo + entrada del manifest; conserva desconocidos", async () => {
    const h = await host();
    const a = await h.record("image", "images/a.png", png(4, 4, 1), "image/png");
    const b = await h.record("image", "images/b.png", png(4, 4, 2), "image/png");
    await h.writeManifest([a, b]);
    await h.writeRaw("unknown.bin", Uint8Array.from([9, 9]));

    const r = await removeAsset({ logicalPath: "images/a.png" }, deps(h));
    expect(r.outcome).toBe("removed");
    expect(await h.exists("images/a.png")).toBe(false);
    expect(await h.exists("images/b.png")).toBe(true);
    expect(await h.exists("unknown.bin")).toBe(true);
    const manifest = validateAssetManifestV1(JSON.parse(new TextDecoder().decode(await h.read("assets.json"))));
    if (manifest.ok) expect(manifest.manifest.assets.map((a2) => a2.logicalPath)).toEqual(["images/b.png"]);
  });

  it("remove de un path no administrado → not-found, sin tocar el filesystem", async () => {
    const h = await host();
    await h.writeManifest([]);
    await h.writeRaw("stray.png", png(2, 2));
    const r = await removeAsset({ logicalPath: "stray.png" }, deps(h));
    expect(r.outcome).toBe("not-found");
    expect(r.wrote).toBe(false);
    expect(await h.exists("stray.png")).toBe(true); // unknown nunca se elimina
  });

  it("store que es symlink → unsafe-target/conflict (sin publicar)", async () => {
    const h = await host();
    await h.writeManifest([]);
    // Reemplazar el store por un symlink.
    const target = join(h.rootDir, "design-system", "real-target");
    await import("node:fs/promises").then((m) => m.mkdir(target, { recursive: true }));
    await rm(h.storeDir, { recursive: true, force: true });
    try {
      await symlink(target, h.storeDir);
    } catch {
      return; // entorno sin symlinks: omitir
    }
    const r = await applyAssetImport({ sources: [source("images/x.png", png(3, 3))] }, deps(h));
    expect(r.outcome).toBe("conflict");
    expect(r.wrote).toBe(false);
  });
});
