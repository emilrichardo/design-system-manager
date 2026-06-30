// Helpers de prueba del writer transaccional (006, Checkpoint J): construcción de artifacts/peticiones
// y un seam `WriterFileSystem` que envuelve al real e inyecta fallos en operaciones elegidas.
import { createHash } from "node:crypto";
import { nodeWriterFileSystem, type WriterFileSystem } from "../../src/infrastructure/build-export/artifact-set-writer.js";
import { artifactFilename, BUILD_FORMATS } from "../../src/domain/build-export/build-format.js";
import { BUILD_MANIFEST_FILENAME, BUILD_OUTPUT_ROOT } from "../../src/domain/build-export/build-manifest.js";
import { createBuildArtifact, type BuildArtifact } from "../../src/domain/build-export/artifact.js";
import type { ArtifactSetWriteRequest, CandidateManifestInput } from "../../src/application/build-export/build-ports.js";

const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

export function makeArtifact(format: (typeof BUILD_FORMATS)[number], text: string): BuildArtifact {
  const bytes = enc(text);
  return createBuildArtifact({ format, relativePath: artifactFilename(format), contentType: "text/plain", bytes, contentHash: sha(bytes) });
}

export function makeManifest(text = '{"formatVersion":"1.0.0"}'): CandidateManifestInput {
  const bytes = enc(text);
  return { relativePath: BUILD_MANIFEST_FILENAME, bytes, contentHash: sha(bytes), byteLength: bytes.byteLength };
}

/** Petición canónica con los tres artifacts y un manifest, lista para publicar. */
export function makeRequest(overrides: Partial<ArtifactSetWriteRequest> = {}): ArtifactSetWriteRequest {
  const artifacts = BUILD_FORMATS.map((f) => makeArtifact(f, `/* ${f} */`));
  const manifest = makeManifest();
  return {
    outputRoot: BUILD_OUTPUT_ROOT,
    artifacts,
    manifest,
    strategy: "candidate-directory-set-v1",
    expectedHashes: {
      source: "0".repeat(64),
      artifacts: Object.fromEntries(artifacts.map((a) => [a.relativePath, a.contentHash])),
      buildManifest: manifest.contentHash,
    },
    ...overrides,
  };
}

export interface FailHooks {
  /** Cuenta de invocaciones a cada operación, para inspección en tests. */
  readonly calls: { rename: number; writeFile: number; copyFile: number; removeTree: number };
  /** Devuelve un Error para abortar la operación, o undefined/void para dejar pasar. */
  rename?: (from: string, to: string, n: number) => Error | void;
  writeFile?: (path: string, n: number) => Error | void;
  copyFile?: (from: string, to: string, n: number) => Error | void;
  removeTree?: (path: string, n: number) => Error | void;
  /** Reemplaza los bytes leídos en `path` (p. ej. para corromper la lectura post-commit). */
  readFile?: (path: string) => Uint8Array | void;
}

/** Envuelve un `WriterFileSystem` real e inyecta fallos según los hooks dados. */
export function failingFs(base: WriterFileSystem = nodeWriterFileSystem, hooks: Partial<FailHooks> = {}): WriterFileSystem & { hooks: FailHooks } {
  const h: FailHooks = { calls: { rename: 0, writeFile: 0, copyFile: 0, removeTree: 0 }, ...hooks };
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
    async copyFile(from, to) {
      const n = ++h.calls.copyFile;
      const fail = h.copyFile?.(from, to, n);
      if (fail) throw errno(fail, "EACCES");
      await base.copyFile(from, to);
    },
    async rename(from, to) {
      const n = ++h.calls.rename;
      const fail = h.rename?.(from, to, n);
      if (fail) throw errno(fail, "EPERM");
      await base.rename(from, to);
    },
    async removeTree(p) {
      const n = ++h.calls.removeTree;
      const fail = h.removeTree?.(p, n);
      if (fail) throw errno(fail, "EBUSY");
      await base.removeTree(p);
    },
  };
}
