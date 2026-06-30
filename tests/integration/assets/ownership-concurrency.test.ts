// T042 (007) — Ownership y concurrencia: manifest no confiable → invalid-asset-store; colisión con
// contenido desconocido → conflict; asset administrado modificado / required path desconocido entre la
// observación y la escritura → conflict (recheck por bytes/hash).
import { afterEach, describe, expect, it } from "vitest";
import { applyAssetImport } from "../../../src/application/assets/apply-asset-import.js";
import { createAssetStoreReader } from "../../../src/infrastructure/assets/asset-store-reader.js";
import { createAssetSetWriter } from "../../../src/infrastructure/assets/asset-set-writer.js";
import type { AssetStoreObservation, AssetStorePort } from "../../../src/application/assets/asset-ports.js";
import { makeAssetHost, png, realProbes, type AssetHost } from "./asset-store-fixtures.js";

const hosts: AssetHost[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});
const addHero = { sources: [{ sourceRef: "in/hero.png", bytes: png(10, 5, 2), kind: "image" as const, destinationPath: "images/hero.png", license: { identifier: "CC0-1.0" } }] };

describe("ownership & concurrency (T042)", () => {
  it("manifest no confiable → invalid-asset-store, sin escribir", async () => {
    const h = await makeAssetHost();
    hosts.push(h);
    await h.writeRaw("assets.json", new TextEncoder().encode("{not json")); // corrupto
    const r = await applyAssetImport(addHero, { store: createAssetStoreReader(h.rootDir), probes: realProbes, writer: createAssetSetWriter(h.rootDir) });
    expect(r.outcome).toBe("invalid-asset-store");
    expect(r.wrote).toBe(false);
  });

  it("colisión con contenido desconocido en el destino → conflict, sin escribir", async () => {
    const h = await makeAssetHost();
    hosts.push(h);
    await h.writeManifest([]);
    await h.writeRaw("images/hero.png", new TextEncoder().encode("unknown")); // ocupa el destino, no administrado
    const r = await applyAssetImport(addHero, { store: createAssetStoreReader(h.rootDir), probes: realProbes, writer: createAssetSetWriter(h.rootDir) });
    expect(r.outcome).toBe("conflict");
    expect(r.wrote).toBe(false);
    expect(new TextDecoder().decode(await h.read("images/hero.png"))).toBe("unknown"); // intacto
  });

  it("asset administrado modificado de forma concurrente → conflict (recheck por bytes)", async () => {
    const h = await makeAssetHost();
    hosts.push(h);
    const keep = await h.record("image", "images/keep.png", png(4, 4, 1), "image/png");
    await h.writeManifest([keep]);
    const realStore = createAssetStoreReader(h.rootDir);
    // Store fake que entrega una observación "vieja" pero el disco cambió: el writer detecta el cambio.
    const stale = await realStore.observe();
    const staleStore: AssetStorePort = { observe: () => Promise.resolve(stale as AssetStoreObservation) };
    // Modificar el asset administrado en disco DESPUÉS de la observación.
    await h.writeRaw("images/keep.png", png(4, 4, 9));
    const r = await applyAssetImport(addHero, { store: staleStore, probes: realProbes, writer: createAssetSetWriter(h.rootDir) });
    expect(r.outcome).toBe("conflict");
    expect(r.conflicts.some((c) => c.code === "source-modified")).toBe(true);
    expect(r.wrote).toBe(false);
  });
});
