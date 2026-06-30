// T040 (007) — Recuperación del writer con inyección de fallos (seams): fallo antes del commit point,
// fallo del primer rename, fallo del segundo rename con restore OK / restore fallido, y verificación
// posterior al commit fallida (sin rollback automático).
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyAssetImport } from "../../../src/application/assets/apply-asset-import.js";
import { createAssetStoreReader } from "../../../src/infrastructure/assets/asset-store-reader.js";
import { createAssetSetWriter } from "../../../src/infrastructure/assets/asset-set-writer.js";
import { failingAssetFs, makeAssetHost, png, realProbes, type AssetHost, type FailHooks } from "./asset-store-fixtures.js";

const hosts: AssetHost[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function seeded(): Promise<AssetHost> {
  const h = await makeAssetHost();
  hosts.push(h);
  const keep = await h.record("image", "images/keep.png", png(4, 4, 1), "image/png");
  await h.writeManifest([keep]);
  return h;
}
function depsWith(h: AssetHost, hooks: Partial<FailHooks>) {
  return { store: createAssetStoreReader(h.rootDir), probes: realProbes, writer: createAssetSetWriter(h.rootDir, failingAssetFs(hooks)) };
}
const add = { sources: [{ sourceRef: "in/hero.png", bytes: png(10, 5, 2), kind: "image" as const, destinationPath: "images/hero.png", license: { identifier: "CC0-1.0" } }] };

describe("writer recovery (T040)", () => {
  it("fallo antes de mover (staging write) → write-error, store disponible, sin backup/recovery", async () => {
    const h = await seeded();
    const r = await applyAssetImport(add, depsWith(h, { writeFile: (p) => (p.endsWith("hero.png") ? new Error("EACCES") : undefined) }));
    expect(r.outcome).toBe("write-error");
    expect(r.recovery).toEqual({ storeAvailable: true, backupRelativePath: null, recoveryRequired: false });
    expect(await h.exists("images/hero.png")).toBe(false); // store intacto
  });

  it("fallo del primer rename (store→backup) → write-error, store intacto", async () => {
    const h = await seeded();
    const r = await applyAssetImport(add, depsWith(h, { rename: (_f, _t, n) => (n === 1 ? new Error("EPERM") : undefined) }));
    expect(r.outcome).toBe("write-error");
    expect(r.recovery?.storeAvailable).toBe(true);
    expect(r.recovery?.recoveryRequired).toBe(false);
  });

  it("segundo rename falla, restore OK → write-error recuperable (sin backup retenido)", async () => {
    const h = await seeded();
    const r = await applyAssetImport(add, depsWith(h, { rename: (_f, _t, n) => (n === 2 ? new Error("EPERM") : undefined) }));
    expect(r.outcome).toBe("write-error");
    expect(r.recovery).toEqual({ storeAvailable: true, backupRelativePath: null, recoveryRequired: false });
    expect(await h.exists("images/keep.png")).toBe(true); // restaurado
  });

  it("segundo rename falla y restore falla → write-error catastrófico (backup retenido, recovery)", async () => {
    const h = await seeded();
    const r = await applyAssetImport(add, depsWith(h, { rename: (_f, _t, n) => (n >= 2 ? new Error("EPERM") : undefined) }));
    expect(r.outcome).toBe("write-error");
    expect(r.recovery?.storeAvailable).toBe(false);
    expect(r.recovery?.recoveryRequired).toBe(true);
    expect(r.recovery?.backupRelativePath).toBe("design-system/assets.backup");
    expect(r.recovery?.backupRelativePath?.startsWith("/")).toBe(false);
  });

  it("verificación posterior al commit fallida → verification-error, wrote true, backup retenido, sin rollback", async () => {
    const h = await seeded();
    const corrupt = join(h.storeDir, "images", "hero.png");
    const r = await applyAssetImport(add, depsWith(h, { readFile: (p) => (p === corrupt ? new TextEncoder().encode("CORRUPT") : undefined) }));
    expect(r.outcome).toBe("verification-error");
    expect(r.wrote).toBe(true);
    expect(r.recovery).toEqual({ storeAvailable: true, backupRelativePath: "design-system/assets.backup", recoveryRequired: true });
    // sin rollback: el contenido nuevo permanece publicado.
    expect(await h.exists("images/hero.png")).toBe(true);
    expect((await h.siblings()).includes("assets.backup")).toBe(true);
  });
});
