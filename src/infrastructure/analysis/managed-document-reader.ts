// T024/T025 — Implementación concreta de ManagedDocumentReader (lectura segura, observacionalmente
// pura). Compone el FileSystem extendido de `001` (lstatKind/byteSize) y reutiliza el path-guard
// (assertWithinRoot) — NO reimplementa contención. La lectura binaria + decodificación UTF-8 estricta
// se encapsula aquí (node:fs), sin exponer Buffer fuera de infraestructura. No escribe, no repara, no
// sigue symlinks externos, no parsea schemas/DTCG.
import { readFile } from "node:fs/promises";
import type { FileSystem } from "../../application/ports.js";
import type {
  ManagedDocumentReadRequest,
  ManagedDocumentReadResult,
  ManagedDocumentReader,
  ReadableManagedDocument,
} from "../../application/analysis-ports.js";
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import { assertWithinRoot } from "../host-root/path-guard.js";

/** Ruta canónica administrada por documento (reutiliza MANAGED_FILES de `001`, sin duplicar strings). */
const CANONICAL_PATH: Readonly<Record<ReadableManagedDocument, string>> = {
  config: MANAGED_FILES.config,
  manifest: MANAGED_FILES.manifest,
  tokens: MANAGED_FILES.tokens,
};

function fail(
  reason: Extract<ManagedDocumentReadResult, { ok: false }>["reason"],
  message: string,
): ManagedDocumentReadResult {
  return { ok: false, reason, message };
}

function normalize(rel: string): string {
  return rel.replace(/\\/g, "/");
}

export interface ManagedDocumentReaderDeps {
  readonly fileSystem: FileSystem;
}

/**
 * Crea un `ManagedDocumentReader` concreto. Secuencia por lectura:
 * autorizar documento+ruta → contención (path-guard) → tipo (archivo regular) → tamaño previo
 * (≤ maxBytes) → lectura de bytes → UTF-8 estricto → verificación de tamaño real → resultado.
 * Detección **defensiva** de cambios en la ventana lstat→byteSize→read (no es una lectura atómica).
 */
export function createManagedDocumentReader(deps: ManagedDocumentReaderDeps): ManagedDocumentReader {
  const { fileSystem } = deps;

  return {
    async read(request: ManagedDocumentReadRequest): Promise<ManagedDocumentReadResult> {
      const { rootDir, document, relativePath, maxBytes } = request;

      // 1. document + relativePath deben coincidir con la ruta canónica administrada.
      if (normalize(relativePath) !== CANONICAL_PATH[document]) {
        return fail(
          "outside-root",
          `Ruta no autorizada para '${document}': se esperaba '${CANONICAL_PATH[document]}'.`,
        );
      }

      // 2. Contención dentro de la raíz (reusa path-guard de 001; no sigue symlinks externos).
      const contained = assertWithinRoot(rootDir, relativePath);
      if (!contained.ok) {
        switch (contained.reason) {
          case "escape":
            return fail("outside-root", contained.message);
          case "external-symlink":
          case "broken-symlink":
            return fail("symlink-external", contained.message);
          case "unresolvable-root":
            return fail("read-failed", contained.message);
        }
      }
      const realPath = contained.realPath;

      // 3. Tipo: debe ser archivo regular (sin seguir un symlink ya descartado por el guard).
      const kind = await fileSystem.lstatKind(realPath);
      if (kind === "absent") return fail("absent", `Documento ausente: ${relativePath}`);
      if (kind === "symlink") return fail("symlink-external", `Symlink no permitido: ${relativePath}`);
      if (kind !== "file") return fail("not-regular-file", `No es un archivo regular: ${relativePath}`);

      // 4. Tamaño ANTES de leer (stat). Si ya supera el límite, NO se lee.
      let preSize: number;
      try {
        preSize = await fileSystem.byteSize(realPath);
      } catch {
        return fail("read-failed", `No se pudo obtener el tamaño: ${relativePath}`);
      }
      if (preSize > maxBytes) {
        return fail("too-large", `Documento demasiado grande (${preSize} > ${maxBytes} bytes).`);
      }

      // 5. Lectura de bytes (encapsulada en infra). Desaparición/permiso → read-failed.
      let bytes: Uint8Array;
      try {
        bytes = await readFile(realPath);
      } catch {
        return fail("read-failed", `No se pudo leer el documento: ${relativePath}`);
      }

      // 6. Defensa TOCTOU: si tras leer los bytes superan el límite, rechazar igualmente.
      if (bytes.byteLength > maxBytes) {
        return fail("too-large", `Documento demasiado grande tras lectura (${bytes.byteLength} bytes).`);
      }

      // 7. Decodificación UTF-8 ESTRICTA (FR-004); secuencias inválidas ⇒ invalid-encoding (no throw).
      let decoded: string;
      try {
        decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        return fail("invalid-encoding", `Bytes UTF-8 inválidos en: ${relativePath}`);
      }
      // BOM UTF-8 inicial: se elimina de forma consistente (el parseo posterior no lo tolera).
      const content = decoded.charCodeAt(0) === 0xfeff ? decoded.slice(1) : decoded;

      return { ok: true, document, relativePath, content, sizeBytes: bytes.byteLength };
    },
  };
}
