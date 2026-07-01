// T026 (008) — Adapter de escritura transaccional single-file de la fuente de tokens
// (`design-system/tokens/base.tokens.json`): temp→verify→identity check→backup→replace (rename =
// COMMIT POINT)→verificación posterior→restore si falla. Reutiliza el seam inyectable `WriterFileSystem`
// de `006` (no `node:fs` directo) para permitir fault injection determinista en tests; por defecto usa
// `nodeWriterFileSystem`. NO hay rollback automático tras una verificación posterior exitosa: solo se
// intenta restaurar el backup cuando la verificación posterior FALLA. Restaurar copia el backup sobre el
// target (nunca lo mueve) para conservar el backup como rastro de auditoría — `recoveryRequired` queda en
// `true` tanto si la restauración tuvo éxito como si falló. Nunca toca `design-system/build/**`,
// `design-system/assets/**` ni el host manifest. Ruta del posible refactor de una abstracción de
// escritura single-file compartida con `005` documentada en `specs/008-token-mutations` (T052); no se
// modifica `005`.
import { dirname, join } from "node:path";
import { nodeWriterFileSystem, type WriterFileSystem } from "../build-export/artifact-set-writer.js";
import { sha256Hex } from "../build-export/hash.js";
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import type { TokenSourceWriteRequest, TokenSourceWriteResult, TokenSourceWriterPort } from "../../application/token-mutations/ports.js";

const RELATIVE_PATH = MANAGED_FILES.tokens;

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function safeMessage(e: unknown): string {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : null;
  return code ? `operación de filesystem fallida (${code})` : "operación de filesystem fallida";
}

function unchanged(): TokenSourceWriteResult {
  return { outcome: "unchanged", wrote: false, sourceAvailable: true, backupRelativePath: null, recoveryRequired: false, error: null };
}

function written(): TokenSourceWriteResult {
  return { outcome: "written", wrote: true, sourceAvailable: true, backupRelativePath: null, recoveryRequired: false, error: null };
}

/** Fallo antes del commit point (rename): la fuente original nunca fue tocada. */
function preCommitFailure(code: string, message: string): TokenSourceWriteResult {
  return { outcome: "write-error", wrote: false, sourceAvailable: true, backupRelativePath: null, recoveryRequired: false, error: { code, message } };
}

function concurrentChange(): TokenSourceWriteResult {
  return {
    outcome: "concurrent-modification",
    wrote: false,
    sourceAvailable: true,
    backupRelativePath: null,
    recoveryRequired: false,
    error: { code: "concurrent-source-change", message: "La fuente cambió antes de escribir." },
  };
}

/** Verificación posterior falló pero el restore (backup→target) tuvo éxito. */
function restored(backupRelativePath: string, message: string): TokenSourceWriteResult {
  return {
    outcome: "verification-error",
    wrote: false,
    sourceAvailable: true,
    backupRelativePath,
    recoveryRequired: true,
    error: { code: "post-write-verification-failed", message },
  };
}

/** Verificación posterior falló y el restore también falló: estado catastrófico, requiere intervención manual. */
function restoreFailed(backupRelativePath: string | null, message: string): TokenSourceWriteResult {
  return {
    outcome: "write-error",
    wrote: false,
    sourceAvailable: false,
    backupRelativePath,
    recoveryRequired: true,
    error: { code: "post-write-restore-failed", message },
  };
}

/** Construye el writer ligado a `rootDir` (raíz absoluta del host); `fs` es inyectable para tests. */
export function createTokenSourceWriter(rootDir: string, fs: WriterFileSystem = nodeWriterFileSystem): TokenSourceWriterPort {
  const targetAbs = join(rootDir, ...RELATIVE_PATH.split("/"));
  const dir = dirname(targetAbs);
  const backupRelative = `${RELATIVE_PATH}.bak`;
  const backupAbs = join(rootDir, ...backupRelative.split("/"));

  async function attemptRestore(reason: string): Promise<TokenSourceWriteResult> {
    try {
      await fs.copyFile(backupAbs, targetAbs);
      return restored(backupRelative, reason);
    } catch (e) {
      return restoreFailed(backupRelative, safeMessage(e));
    }
  }

  return {
    async write(request: TokenSourceWriteRequest): Promise<TokenSourceWriteResult> {
      if (request.candidateHash === request.expectedSourceHash) return unchanged();

      let currentBytes: Uint8Array;
      try {
        currentBytes = await fs.readFile(targetAbs);
      } catch (e) {
        return preCommitFailure("source-read-error", safeMessage(e));
      }
      if (decodeUtf8(currentBytes) === null) return preCommitFailure("source-decode-error", "La fuente actual no es UTF-8 válido.");
      if (sha256Hex(currentBytes) !== request.expectedSourceHash) return concurrentChange();

      const tmpAbs = join(dir, `.${RELATIVE_PATH.split("/").pop()}.${process.pid}.${currentBytes.byteLength}.tmp`);
      const candidateBytes = encode(request.candidateText);

      try {
        await fs.writeFile(tmpAbs, candidateBytes);
      } catch (e) {
        return preCommitFailure("temp-write-error", safeMessage(e));
      }

      try {
        const verifyBytes = await fs.readFile(tmpAbs);
        if (sha256Hex(verifyBytes) !== request.candidateHash) {
          await fs.removeTree(tmpAbs).catch(() => undefined);
          return preCommitFailure("temp-verify-error", "El archivo temporal no coincide con el candidato.");
        }
      } catch (e) {
        await fs.removeTree(tmpAbs).catch(() => undefined);
        return preCommitFailure("temp-verify-error", safeMessage(e));
      }

      try {
        await fs.copyFile(targetAbs, backupAbs);
      } catch (e) {
        await fs.removeTree(tmpAbs).catch(() => undefined);
        return preCommitFailure("backup-create-error", safeMessage(e));
      }

      try {
        await fs.rename(tmpAbs, targetAbs); // COMMIT POINT
      } catch (e) {
        await fs.removeTree(tmpAbs).catch(() => undefined);
        await fs.removeTree(backupAbs).catch(() => undefined);
        return preCommitFailure("rename-error", safeMessage(e));
      }

      let publishedBytes: Uint8Array;
      try {
        publishedBytes = await fs.readFile(targetAbs);
      } catch (e) {
        return attemptRestore(safeMessage(e));
      }
      if (sha256Hex(publishedBytes) === request.candidateHash) {
        await fs.removeTree(backupAbs).catch(() => undefined);
        return written();
      }
      return attemptRestore("La verificación posterior a la escritura falló.");
    },
  };
}
