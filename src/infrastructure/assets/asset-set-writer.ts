// T034/T038 (007) — Writer transaccional del asset store (`candidate-directory-set-v1`). Publica
// `design-system/assets/` como un todo o nada: staging sibling → copia byte a byte del contenido
// conservado (managed kept + unknown preservado) → escribe writes + manifest nuevos → recheck de
// concurrencia por bytes (no mtime) → verifica el candidato → publica con dos renames (prior→backup,
// staging→store). El commit point es el segundo rename; desde ahí `wrote:true` y NO hay rollback
// automático. La verificación posterior fallida deja el store disponible con backup retenido y
// `recoveryRequired:true`. Filesystem detrás de un seam inyectable; nunca sigue symlinks; rutas públicas
// relativas. No toca tokens/host/build.
import {
  copyFile as nodeCopyFile,
  lstat,
  mkdir as nodeMkdir,
  readFile as nodeReadFile,
  readdir as nodeReaddir,
  rename as nodeRename,
  rm as nodeRm,
  writeFile as nodeWriteFile,
} from "node:fs/promises";
import { basename, dirname, join, posix } from "node:path";
import { ASSET_MANIFEST_FILENAME, ASSET_STORE_ROOT } from "../../domain/assets/asset-manifest.js";
import type { AssetIssue, AssetIssueCode } from "../../domain/assets/asset-outcome.js";
import type { AssetSetWriteRequest, AssetSetWriteResult, AssetSetWriterPort } from "../../application/assets/asset-ports.js";
import { sha256Hex } from "./hash.js";

export type WriterNodeKind = "file" | "directory" | "symlink" | "absent" | "other";

export interface AssetWriterFileSystem {
  pathKind(path: string): Promise<WriterNodeKind>;
  readdir(path: string): Promise<readonly string[]>;
  mkdir(path: string, recursive: boolean): Promise<void>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  copyFile(from: string, to: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  removeTree(path: string): Promise<void>;
}

export const nodeAssetWriterFs: AssetWriterFileSystem = {
  async pathKind(path) {
    try {
      const st = await lstat(path);
      if (st.isSymbolicLink()) return "symlink";
      if (st.isDirectory()) return "directory";
      if (st.isFile()) return "file";
      return "other";
    } catch {
      return "absent";
    }
  },
  readdir: (path) => nodeReaddir(path),
  async mkdir(path, recursive) {
    await nodeMkdir(path, { recursive });
  },
  async writeFile(path, bytes) {
    await nodeWriteFile(path, bytes, { flag: "wx" });
  },
  readFile: (path) => nodeReadFile(path),
  async copyFile(from, to) {
    await nodeCopyFile(from, to);
  },
  async rename(from, to) {
    await nodeRename(from, to);
  },
  async removeTree(path) {
    await nodeRm(path, { recursive: true, force: true });
  },
};

function issue(code: AssetIssueCode, path: string | null, message: string): AssetIssue {
  return Object.freeze({ code, path, severity: "error", message, blocksWrite: true });
}

function safeMessage(e: unknown): string {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : null;
  return code ? `operación de filesystem fallida (${code})` : "operación de filesystem fallida";
}

function failBeforeMove(code: string, message: string, conflicts: AssetIssue[] = []): AssetSetWriteResult {
  return Object.freeze({
    outcome: "write-error",
    wrote: false,
    storeAvailable: true,
    backupRelativePath: null,
    recoveryRequired: false,
    conflicts,
    error: { code, message },
  });
}

function conflictResult(conflicts: AssetIssue[]): AssetSetWriteResult {
  return Object.freeze({
    outcome: "conflict",
    wrote: false,
    storeAvailable: true,
    backupRelativePath: null,
    recoveryRequired: false,
    conflicts,
    error: null,
  });
}

function unsafeTarget(message: string): AssetSetWriteResult {
  return Object.freeze({
    outcome: "unsafe-target",
    wrote: false,
    storeAvailable: true,
    backupRelativePath: null,
    recoveryRequired: false,
    conflicts: [issue("owned-by-unknown", null, message)],
    error: { code: "unsafe-target", message },
  });
}

/** Copia recursiva byte a byte de un nodo conservado; bloquea ante symlink/especial. */
async function copyKept(fs: AssetWriterFileSystem, srcRoot: string, dstRoot: string, rel: string, skip: ReadonlySet<string>): Promise<"ok" | "unsafe"> {
  if (rel === ASSET_MANIFEST_FILENAME || skip.has(rel)) return "ok";
  const srcAbs = join(srcRoot, rel);
  const kind = await fs.pathKind(srcAbs);
  if (kind === "directory") {
    await fs.mkdir(join(dstRoot, rel), true);
    const entries = await fs.readdir(srcAbs);
    for (const name of [...entries].sort()) {
      const r = await copyKept(fs, srcRoot, dstRoot, posix.join(rel, name), skip);
      if (r === "unsafe") return "unsafe";
    }
    return "ok";
  }
  if (kind === "file") {
    await fs.mkdir(dirname(join(dstRoot, rel)), true);
    await fs.copyFile(srcAbs, join(dstRoot, rel));
    return "ok";
  }
  return "unsafe"; // symlink/special: no copiable de forma segura
}

export function createAssetSetWriter(rootDir: string, fs: AssetWriterFileSystem = nodeAssetWriterFs): AssetSetWriterPort {
  return {
    async write(request: AssetSetWriteRequest): Promise<AssetSetWriteResult> {
      const storeDir = join(rootDir, ...ASSET_STORE_ROOT.split("/"));
      const parent = dirname(storeDir);
      const base = basename(storeDir);
      const stagingDir = join(parent, `${base}.staging`);
      const backupDir = join(parent, `${base}.backup`);
      const logicalParent = posix.dirname(request.storeRoot);
      const backupRelative = posix.join(logicalParent, `${base}.backup`);
      const okOutcome = request.operation === "remove" ? "removed" : "applied";

      const storeKind = await fs.pathKind(storeDir);
      if (storeKind === "symlink" || storeKind === "other") return unsafeTarget("El asset store no es un directorio regular.");
      const priorExists = storeKind === "directory";

      // Recheck de concurrencia (bytes/hash, no mtime): el manifest y los assets administrados previos
      // deben coincidir con lo observado por el caso de uso.
      const manifestAbs = join(storeDir, ASSET_MANIFEST_FILENAME);
      const currentManifestHash = (await fs.pathKind(manifestAbs)) === "file" ? sha256Hex(await fs.readFile(manifestAbs)) : null;
      if (currentManifestHash !== request.prior.manifestHash) {
        return conflictResult([issue("untrusted-asset-manifest", null, "El manifest cambió entre la observación y la escritura.")]);
      }
      for (const [rel, expectedHash] of Object.entries(request.prior.assetHashes)) {
        const abs = join(storeDir, rel);
        if ((await fs.pathKind(abs)) !== "file") return conflictResult([issue("source-modified", rel, `Asset administrado ausente o no regular: ${rel}.`)]);
        if (sha256Hex(await fs.readFile(abs)) !== expectedHash) return conflictResult([issue("source-modified", rel, `Asset administrado modificado de forma concurrente: ${rel}.`)]);
      }

      // 1) Crear staging y materializar el siguiente estado completo del store.
      await fs.removeTree(stagingDir).catch(() => undefined);
      const skip = new Set<string>([...request.deletes, ...request.writes.map((w) => w.logicalPath)]);
      try {
        await fs.mkdir(stagingDir, true);
        if (priorExists) {
          for (const name of [...(await fs.readdir(storeDir))].sort()) {
            const r = await copyKept(fs, storeDir, stagingDir, name, skip);
            if (r === "unsafe") {
              await fs.removeTree(stagingDir).catch(() => undefined);
              return unsafeTarget(`Contenido no copiable de forma segura: ${name}.`);
            }
          }
        }
        for (const w of request.writes) {
          await fs.mkdir(dirname(join(stagingDir, w.logicalPath)), true);
          await fs.writeFile(join(stagingDir, w.logicalPath), w.bytes);
        }
        await fs.writeFile(join(stagingDir, ASSET_MANIFEST_FILENAME), request.manifest.bytes);
      } catch (e) {
        await fs.removeTree(stagingDir).catch(() => undefined);
        return failBeforeMove("staging-write-failed", safeMessage(e));
      }

      // 2) Verificar el candidato (writes + manifest) antes de publicar.
      const expected: { rel: string; hash: string; len: number }[] = [
        ...request.writes.map((w) => ({ rel: w.logicalPath, hash: w.contentHash, len: w.byteLength })),
        { rel: ASSET_MANIFEST_FILENAME, hash: request.manifest.contentHash, len: request.manifest.byteLength },
      ];
      for (const e of expected) {
        let bytes: Uint8Array;
        try {
          bytes = await fs.readFile(join(stagingDir, e.rel));
        } catch {
          await fs.removeTree(stagingDir).catch(() => undefined);
          return failBeforeMove("candidate-verification-failed", `Candidato ilegible: ${e.rel}.`);
        }
        if (sha256Hex(bytes) !== e.hash || bytes.byteLength !== e.len) {
          await fs.removeTree(stagingDir).catch(() => undefined);
          return failBeforeMove("candidate-verification-failed", `El candidato no coincide con el hash esperado: ${e.rel}.`);
        }
      }

      // 3) Publicar como conjunto: prior→backup, luego staging→store.
      if (priorExists) {
        try {
          await fs.rename(storeDir, backupDir);
        } catch (e) {
          await fs.removeTree(stagingDir).catch(() => undefined);
          return failBeforeMove("publish-backup-rename-failed", safeMessage(e));
        }
      }
      try {
        await fs.rename(stagingDir, storeDir); // COMMIT POINT
      } catch (e) {
        if (priorExists) {
          try {
            await fs.rename(backupDir, storeDir); // restore
            await fs.removeTree(stagingDir).catch(() => undefined);
            return failBeforeMove("publish-rename-failed", safeMessage(e));
          } catch (restoreErr) {
            await fs.removeTree(stagingDir).catch(() => undefined);
            return Object.freeze({
              outcome: "write-error",
              wrote: false,
              storeAvailable: false,
              backupRelativePath: backupRelative,
              recoveryRequired: true,
              conflicts: [],
              error: { code: "publish-restore-failed", message: safeMessage(restoreErr) },
            });
          }
        }
        await fs.removeTree(stagingDir).catch(() => undefined);
        return Object.freeze({
          outcome: "write-error",
          wrote: false,
          storeAvailable: false,
          backupRelativePath: null,
          recoveryRequired: false,
          conflicts: [],
          error: { code: "publish-rename-failed", message: safeMessage(e) },
        });
      }

      // 4) Verificación posterior al commit point.
      for (const e of expected) {
        let bytes: Uint8Array | null = null;
        try {
          bytes = await fs.readFile(join(storeDir, e.rel));
        } catch {
          bytes = null;
        }
        if (bytes === null || sha256Hex(bytes) !== e.hash || bytes.byteLength !== e.len) {
          return Object.freeze({
            outcome: "verification-error",
            wrote: true,
            storeAvailable: true,
            backupRelativePath: priorExists ? backupRelative : null,
            recoveryRequired: true,
            conflicts: [],
            error: { code: "post-publication-verification-failed", message: `La verificación posterior falló: ${e.rel}.` },
          });
        }
      }

      if (priorExists) await fs.removeTree(backupDir).catch(() => undefined);
      return Object.freeze({
        outcome: okOutcome,
        wrote: true,
        storeAvailable: true,
        backupRelativePath: null,
        recoveryRequired: false,
        conflicts: [],
        error: null,
      });
    },
  };
}
