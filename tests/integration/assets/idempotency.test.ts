// T041 (007) — Idempotencia: una segunda aplicación sin cambios resuelve `unchanged`/`wrote:false` y NO
// invoca el writer (0 staging/rename/escritura). Más un test unitario de `decideUnchanged`.
import { afterEach, describe, expect, it } from "vitest";
import { applyAssetImport } from "../../../src/application/assets/apply-asset-import.js";
import { decideUnchanged } from "../../../src/application/assets/idempotency.js";
import { createAssetStoreReader } from "../../../src/infrastructure/assets/asset-store-reader.js";
import { createAssetSetWriter } from "../../../src/infrastructure/assets/asset-set-writer.js";
import type { AssetSetWriteRequest, AssetSetWriteResult, AssetSetWriterPort } from "../../../src/application/assets/asset-ports.js";
import { makeAssetHost, png, realProbes, type AssetHost } from "./asset-store-fixtures.js";

const hosts: AssetHost[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

function countingWriter(rootDir: string): AssetSetWriterPort & { calls: number } {
  const real = createAssetSetWriter(rootDir);
  const w = {
    calls: 0,
    write(req: AssetSetWriteRequest): Promise<AssetSetWriteResult> {
      w.calls += 1;
      return real.write(req);
    },
  };
  return w;
}

describe("apply idempotency (T041)", () => {
  it("segunda aplicación sin cambios → unchanged, writer no invocado de nuevo", async () => {
    const h = await makeAssetHost();
    hosts.push(h);
    await h.writeManifest([]);
    const writer = countingWriter(h.rootDir);
    const deps = { store: createAssetStoreReader(h.rootDir), probes: realProbes, writer };
    const src = { sources: [{ sourceRef: "in/hero.png", bytes: png(10, 5, 2), kind: "image" as const, destinationPath: "images/hero.png", license: { identifier: "CC0-1.0" } }] };

    const first = await applyAssetImport(src, deps);
    expect(first.outcome).toBe("applied");
    expect(writer.calls).toBe(1);

    const second = await applyAssetImport(src, deps);
    expect(second.outcome).toBe("unchanged");
    expect(second.wrote).toBe(false);
    expect(writer.calls).toBe(1); // 0 nuevas publicaciones
  });
});

describe("decideUnchanged (T041)", () => {
  const onDisk = [{ relativePath: "images/a.png", state: "file" as const, contentHash: "a".repeat(64), byteLength: 10 }];

  it("unchanged cuando manifest igual y writes ya presentes", () => {
    const d = decideUnchanged({ priorManifestHash: "m".repeat(64), desiredManifestHash: "m".repeat(64), writes: [{ logicalPath: "images/a.png", contentHash: "a".repeat(64) }], deletes: [], onDisk });
    expect(d.unchanged).toBe(true);
  });

  it("changed si manifest difiere", () => {
    expect(decideUnchanged({ priorManifestHash: "m".repeat(64), desiredManifestHash: "n".repeat(64), writes: [], deletes: [], onDisk }).unchanged).toBe(false);
  });

  it("changed si hay deletes", () => {
    expect(decideUnchanged({ priorManifestHash: "m".repeat(64), desiredManifestHash: "m".repeat(64), writes: [], deletes: ["images/a.png"], onDisk }).unchanged).toBe(false);
  });

  it("changed si un write no está presente con el mismo hash", () => {
    expect(decideUnchanged({ priorManifestHash: "m".repeat(64), desiredManifestHash: "m".repeat(64), writes: [{ logicalPath: "images/a.png", contentHash: "z".repeat(64) }], deletes: [], onDisk }).unchanged).toBe(false);
  });
});
