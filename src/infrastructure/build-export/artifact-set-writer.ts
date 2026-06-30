// T120–T126 (006) — Writer transaccional del conjunto de artifacts (`candidate-directory-set-v1`).
// Publica `design-system/build/` como un todo o nada: staging sibling en el mismo parent → copia byte a
// byte de los unknown regular files/dirs permitidos → escribe artifacts + build manifest nuevos →
// verifica el candidato → publica con dos renames (prior `build`→backup, staging→`build`). El commit
// point es el segundo rename (`candidate-published`); desde ahí `wrote:true` y NO hay rollback
// automático. La verificación posterior al commit point que falla deja el output disponible con backup
// retenido y `recoveryRequired:true`. El filesystem está detrás de un seam inyectable (`WriterFileSystem`)
// para simular fallos de rename/permiso (incl. Windows). Nunca sigue symlinks; rutas públicas relativas.
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
import { artifactFilename, BUILD_FORMATS } from "../../domain/build-export/build-format.js";
import { BUILD_MANIFEST_FILENAME, BUILD_OUTPUT_ROOT } from "../../domain/build-export/build-manifest.js";
import type { BuildVerification, VerificationArtifactStatus } from "../../domain/build-export/verification.js";
import type { ArtifactSetWriteRequest, ArtifactSetWriteResult, ArtifactSetWriter } from "../../application/build-export/build-ports.js";
import { sha256Hex } from "./hash.js";

/** Tipo crudo de un nodo en disco (sin seguir symlinks). */
export type WriterNodeKind = "file" | "directory" | "symlink" | "absent" | "other";

/** Seam de filesystem byte-a-byte para el writer; inyectable para simular fallos. */
export interface WriterFileSystem {
  /** lstat sin seguir symlinks. */
  pathKind(path: string): Promise<WriterNodeKind>;
  readdir(path: string): Promise<readonly string[]>;
  mkdir(path: string, recursive: boolean): Promise<void>;
  /** Escritura exclusiva (falla si el destino existe). */
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  copyFile(from: string, to: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  removeTree(path: string): Promise<void>;
}

/** Implementación real del seam sobre node:fs/promises (única capa con node:fs). */
export const nodeWriterFileSystem: WriterFileSystem = {
  async pathKind(path: string): Promise<WriterNodeKind> {
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
  async readdir(path: string): Promise<readonly string[]> {
    return nodeReaddir(path);
  },
  async mkdir(path: string, recursive: boolean): Promise<void> {
    await nodeMkdir(path, { recursive });
  },
  async writeFile(path: string, bytes: Uint8Array): Promise<void> {
    await nodeWriteFile(path, bytes, { flag: "wx" });
  },
  async readFile(path: string): Promise<Uint8Array> {
    return nodeReadFile(path);
  },
  async copyFile(from: string, to: string): Promise<void> {
    await nodeCopyFile(from, to);
  },
  async rename(from: string, to: string): Promise<void> {
    await nodeRename(from, to);
  },
  async removeTree(path: string): Promise<void> {
    await nodeRm(path, { recursive: true, force: true });
  },
};

const ARTIFACT_PATHS = BUILD_FORMATS.map((f) => artifactFilename(f));
const REQUIRED_PATHS = new Set<string>([...ARTIFACT_PATHS, BUILD_MANIFEST_FILENAME]);

function safeMessage(e: unknown): string {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : null;
  return code ? `operación de filesystem fallida (${code})` : "operación de filesystem fallida";
}

/** Verificación canónica de un conjunto: compara hashes/byteLengths esperados vs leídos del disco. */
function buildVerification(artifacts: readonly VerificationArtifactStatus[]): BuildVerification {
  const status = artifacts.every((a) => a.status === "passed") ? "passed" : "failed";
  const checkFor = (path: string): VerificationArtifactStatus | undefined => artifacts.find((a) => a.relativePath === path);
  const checks = [
    { kind: "css" as const, path: artifactFilename("css") },
    { kind: "json" as const, path: artifactFilename("json") },
    { kind: "typescript" as const, path: artifactFilename("typescript") },
    { kind: "build-manifest" as const, path: BUILD_MANIFEST_FILENAME },
  ].map(({ kind, path }) => {
    const a = checkFor(path);
    return {
      kind,
      status: a?.status ?? ("skipped" as const),
      code: a && a.status === "failed" ? "artifact-hash-mismatch" : null,
      message: a && a.status === "failed" ? `Hash inesperado en ${path}.` : null,
    };
  });
  return Object.freeze({ status, checks: Object.freeze(checks), artifacts: Object.freeze([...artifacts]) });
}

interface ExpectedFile {
  readonly relativePath: string;
  readonly contentHash: string;
  readonly byteLength: number;
}

/** Re-lee desde `dir` cada archivo esperado y reporta su estado de verificación por hash/byteLength. */
async function verifySet(fs: WriterFileSystem, dir: string, expected: readonly ExpectedFile[]): Promise<BuildVerification> {
  const statuses: VerificationArtifactStatus[] = [];
  for (const e of expected) {
    let actualHash: string | null = null;
    let actualByteLength: number | null = null;
    try {
      const bytes = await fs.readFile(join(dir, e.relativePath));
      actualHash = sha256Hex(bytes);
      actualByteLength = bytes.byteLength;
    } catch {
      actualHash = null;
      actualByteLength = null;
    }
    const ok = actualHash === e.contentHash && actualByteLength === e.byteLength;
    statuses.push({
      relativePath: e.relativePath,
      expectedHash: e.contentHash,
      actualHash,
      expectedByteLength: e.byteLength,
      actualByteLength,
      status: ok ? "passed" : "failed",
    });
  }
  return buildVerification(statuses);
}

/** Copia recursiva byte a byte de un unknown regular file/dir desde `srcDir` a `dstDir`. */
async function copyUnknownNode(fs: WriterFileSystem, srcRoot: string, dstRoot: string, rel: string): Promise<"ok" | "unsafe"> {
  const srcAbs = join(srcRoot, rel);
  const dstAbs = join(dstRoot, rel);
  const kind = await fs.pathKind(srcAbs);
  if (kind === "directory") {
    await fs.mkdir(dstAbs, true);
    const entries = await fs.readdir(srcAbs);
    for (const name of [...entries].sort()) {
      const childRel = posix.join(rel, name);
      const r = await copyUnknownNode(fs, srcRoot, dstRoot, childRel);
      if (r === "unsafe") return "unsafe";
    }
    return "ok";
  }
  if (kind === "file") {
    await fs.copyFile(srcAbs, dstAbs);
    return "ok";
  }
  // symlink/special/absent → no copiable de forma segura.
  return "unsafe";
}

/** Enumera nodos desconocidos de primer nivel (no required paths) del build dir vivo. */
async function topLevelUnknownNames(fs: WriterFileSystem, buildDir: string): Promise<readonly string[]> {
  let entries: readonly string[];
  try {
    entries = await fs.readdir(buildDir);
  } catch {
    return [];
  }
  return [...entries].filter((n) => !REQUIRED_PATHS.has(n)).sort();
}

function failBeforeMove(code: string, message: string): ArtifactSetWriteResult {
  return Object.freeze({
    outcome: "write-error",
    wrote: false,
    outputAvailable: true,
    backupRelativePath: null,
    recoveryRequired: false,
    verification: null,
    conflicts: [],
    error: { code, message },
  });
}

function unsafeTarget(message: string): ArtifactSetWriteResult {
  return Object.freeze({
    outcome: "unsafe-target",
    wrote: false,
    outputAvailable: true,
    backupRelativePath: null,
    recoveryRequired: false,
    verification: null,
    conflicts: [],
    error: { code: "unsafe-target", message },
  });
}

/**
 * Construye el writer transaccional. `rootDir` es la raíz absoluta del host; `outputRoot` de la petición
 * es el path lógico relativo (`design-system/build`). El seam `fs` por defecto usa node:fs/promises.
 */
export function createArtifactSetWriter(rootDir: string, fs: WriterFileSystem = nodeWriterFileSystem): ArtifactSetWriter {
  return {
    async write(request: ArtifactSetWriteRequest): Promise<ArtifactSetWriteResult> {
      const buildDir = join(rootDir, ...BUILD_OUTPUT_ROOT.split("/"));
      const parent = dirname(buildDir);
      const base = basename(buildDir);
      const stagingDir = join(parent, `${base}.staging`);
      const backupDir = join(parent, `${base}.backup`);
      const logicalParent = posix.dirname(request.outputRoot);
      const backupRelative = posix.join(logicalParent, `${base}.backup`);

      const expectedFiles: ExpectedFile[] = [
        ...request.artifacts.map((a) => ({ relativePath: a.relativePath, contentHash: a.contentHash, byteLength: a.byteLength })),
        { relativePath: request.manifest.relativePath, contentHash: request.manifest.contentHash, byteLength: request.manifest.byteLength },
      ];

      // Defensa: nunca publicar sobre un symlink (el output debe ser dir o ausente).
      const buildKind = await fs.pathKind(buildDir);
      if (buildKind === "symlink" || buildKind === "other") {
        return unsafeTarget("El directorio de salida no es un directorio regular.");
      }

      // Limpieza de staging/backup residuales antes de empezar (best-effort).
      await fs.removeTree(stagingDir).catch(() => undefined);

      // 1) Crear staging y materializar el candidato.
      try {
        await fs.mkdir(stagingDir, true);
        // Copiar unknown nodes permitidos desde el build vivo (antes de mover nada).
        if (buildKind === "directory") {
          for (const name of await topLevelUnknownNames(fs, buildDir)) {
            const r = await copyUnknownNode(fs, buildDir, stagingDir, name);
            if (r === "unsafe") {
              await fs.removeTree(stagingDir).catch(() => undefined);
              return unsafeTarget(`Nodo desconocido no copiable de forma segura: ${name}.`);
            }
          }
        }
        for (const artifact of request.artifacts) {
          await fs.writeFile(join(stagingDir, artifact.relativePath), artifact.bytes);
        }
        await fs.writeFile(join(stagingDir, request.manifest.relativePath), request.manifest.bytes);
      } catch (e) {
        await fs.removeTree(stagingDir).catch(() => undefined);
        return failBeforeMove("staging-write-failed", safeMessage(e));
      }

      // 2) Verificar el candidato ANTES de publicar (integridad de lo que aterrizó en disco).
      const candidateVerification = await verifySet(fs, stagingDir, expectedFiles);
      if (candidateVerification.status !== "passed") {
        await fs.removeTree(stagingDir).catch(() => undefined);
        return Object.freeze({
          outcome: "write-error",
          wrote: false,
          outputAvailable: true,
          backupRelativePath: null,
          recoveryRequired: false,
          verification: candidateVerification,
          conflicts: [],
          error: { code: "candidate-verification-failed", message: "El candidato no coincide con los hashes esperados." },
        });
      }

      // 3) Publicar como conjunto: rename prior build→backup, luego staging→build.
      const priorExists = buildKind === "directory";
      if (priorExists) {
        try {
          await fs.rename(buildDir, backupDir); // primer rename
        } catch (e) {
          await fs.removeTree(stagingDir).catch(() => undefined);
          return failBeforeMove("publish-backup-rename-failed", safeMessage(e)); // [T123] aún disponible
        }
      }

      try {
        await fs.rename(stagingDir, buildDir); // segundo rename === COMMIT POINT
      } catch (e) {
        // Aún antes del commit point: intentar restaurar el backup.
        if (priorExists) {
          try {
            await fs.rename(backupDir, buildDir); // restore backup→build
            await fs.removeTree(stagingDir).catch(() => undefined);
            return failBeforeMove("publish-rename-failed", safeMessage(e)); // [T124] restore OK
          } catch (restoreErr) {
            // [T125] restore catastrófico: backup retenido, output no disponible, recovery requerido.
            await fs.removeTree(stagingDir).catch(() => undefined);
            return Object.freeze({
              outcome: "write-error",
              wrote: false,
              outputAvailable: false,
              backupRelativePath: backupRelative,
              recoveryRequired: true,
              verification: null,
              conflicts: [],
              error: { code: "publish-restore-failed", message: safeMessage(restoreErr) },
            });
          }
        }
        // Sin prior: no había build; falló la creación. Sin backup que restaurar.
        await fs.removeTree(stagingDir).catch(() => undefined);
        return Object.freeze({
          outcome: "write-error",
          wrote: false,
          outputAvailable: false,
          backupRelativePath: null,
          recoveryRequired: false,
          verification: null,
          conflicts: [],
          error: { code: "publish-rename-failed", message: safeMessage(e) },
        });
      }

      // 4) Commit point alcanzado: build/ publicado. Verificación posterior al commit point.
      const postVerification = await verifySet(fs, buildDir, expectedFiles);
      if (postVerification.status !== "passed") {
        // [T126] sin rollback automático; backup retenido; recovery requerido.
        return Object.freeze({
          outcome: "verification-error",
          wrote: true,
          outputAvailable: true,
          backupRelativePath: priorExists ? backupRelative : null,
          recoveryRequired: true,
          verification: postVerification,
          conflicts: [],
          error: { code: "post-publication-verification-failed", message: "La verificación posterior a la publicación falló." },
        });
      }

      // Éxito: limpiar el backup del build anterior.
      if (priorExists) await fs.removeTree(backupDir).catch(() => undefined);
      return Object.freeze({
        outcome: "published",
        wrote: true,
        outputAvailable: true,
        backupRelativePath: null,
        recoveryRequired: false,
        verification: postVerification,
        conflicts: [],
        error: null,
      });
    },
  };
}
