// Helpers de integración del Asset Manager (007, Checkpoint E): host temporal con `design-system/assets/`,
// probes reales y un AssetWriterFileSystem con inyección de fallos. NO es un archivo de test.
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { detectMime } from "../../../src/infrastructure/assets/mime-detector.js";
import { readDimensions } from "../../../src/infrastructure/assets/dimension-reader.js";
import { validateFont } from "../../../src/infrastructure/assets/font-validator.js";
import { sanitizeSvg } from "../../../src/infrastructure/assets/svg-sanitizer.js";
import { sha256Hex } from "../../../src/infrastructure/assets/hash.js";
import { nodeAssetWriterFs, type AssetWriterFileSystem } from "../../../src/infrastructure/assets/asset-set-writer.js";
import { serializeAssetManifestV1, type AssetManifestV1 } from "../../../src/domain/assets/asset-manifest.js";
import type { AssetRecord } from "../../../src/domain/assets/asset-record.js";
import type { AssetProbesPort } from "../../../src/application/assets/asset-ports.js";

export const realProbes: AssetProbesPort = { detectMime, readDimensions, validateFont, sanitizeSvg, hash: sha256Hex };

export const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
export function png(w: number, h: number, tag = 0): Uint8Array {
  return Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, ...ascii("IHDR"), 0, 0, (w >> 8) & 255, w & 255, 0, 0, (h >> 8) & 255, h & 255, tag, 0, 0, 0]);
}

export interface AssetHost {
  readonly rootDir: string;
  readonly storeDir: string;
  cleanup(): Promise<void>;
  record(kind: AssetRecord["kind"], rel: string, bytes: Uint8Array, mimeType: AssetRecord["mimeType"]): Promise<AssetRecord>;
  writeManifest(records: AssetRecord[]): Promise<void>;
  writeRaw(rel: string, bytes: Uint8Array): Promise<void>;
  read(rel: string): Promise<Uint8Array>;
  exists(rel: string): Promise<boolean>;
  listStore(): Promise<string[]>;
  siblings(): Promise<string[]>;
}

/** Crea un host con `design-system/assets/` vacío. */
export async function makeAssetHost(): Promise<AssetHost> {
  const rootDir = await mkdtemp(join(tmpdir(), "asset-host-"));
  const storeDir = join(rootDir, "design-system", "assets");
  await mkdir(storeDir, { recursive: true });
  const abs = (rel: string): string => join(storeDir, rel);
  return {
    rootDir,
    storeDir,
    cleanup: () => rm(rootDir, { recursive: true, force: true }),
    async record(kind, rel, bytes, mimeType) {
      await mkdir(dirname(abs(rel)), { recursive: true });
      await writeFile(abs(rel), bytes);
      return {
        logicalPath: rel,
        kind,
        mimeType,
        byteLength: bytes.byteLength,
        contentHash: sha256Hex(bytes),
        dimensions: null,
        provenance: { kind: "local-import", sourceRef: `in/${rel}` },
        license: { status: "unspecified", identifier: null, notice: null },
      };
    },
    async writeManifest(records) {
      const manifest: AssetManifestV1 = { formatVersion: "1.0.0", assets: records };
      await writeFile(join(storeDir, "assets.json"), serializeAssetManifestV1(manifest), "utf8");
    },
    async writeRaw(rel, bytes) {
      await mkdir(dirname(abs(rel)), { recursive: true });
      await writeFile(abs(rel), bytes);
    },
    read: (rel) => readFile(abs(rel)),
    async exists(rel) {
      try {
        await readFile(abs(rel));
        return true;
      } catch {
        return false;
      }
    },
    listStore: () => readdir(storeDir),
    siblings: () => readdir(join(rootDir, "design-system")),
  };
}

export interface FailHooks {
  readonly calls: { rename: number; writeFile: number };
  rename?: (from: string, to: string, n: number) => Error | void;
  writeFile?: (path: string, n: number) => Error | void;
  readFile?: (path: string) => Uint8Array | void;
}

/** Envuelve el fs real e inyecta fallos según los hooks. */
export function failingAssetFs(hooks: Partial<FailHooks> = {}, base: AssetWriterFileSystem = nodeAssetWriterFs): AssetWriterFileSystem & { hooks: FailHooks } {
  const h: FailHooks = { calls: { rename: 0, writeFile: 0 }, ...hooks };
  const errno = (e: Error, code: string): Error => Object.assign(e, { code });
  return {
    hooks: h,
    pathKind: (p) => base.pathKind(p),
    readdir: (p) => base.readdir(p),
    mkdir: (p, r) => base.mkdir(p, r),
    async writeFile(p, b) {
      const n = ++h.calls.writeFile;
      const fail = h.writeFile?.(p, n);
      if (fail) throw errno(fail, "EACCES");
      await base.writeFile(p, b);
    },
    async readFile(p) {
      const replaced = h.readFile?.(p);
      if (replaced) return replaced;
      return base.readFile(p);
    },
    copyFile: (from, to) => base.copyFile(from, to),
    async rename(from, to) {
      const n = ++h.calls.rename;
      const fail = h.rename?.(from, to, n);
      if (fail) throw errno(fail, "EPERM");
      await base.rename(from, to);
    },
    removeTree: (p) => base.removeTree(p),
  };
}
