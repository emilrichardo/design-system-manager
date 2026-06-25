// Puertos (contratos) de la capa de aplicación. Tipos puros: sin Node, sin filesystem,
// sin Commander/Clack, sin texto de terminal. La infraestructura los implementa.
import type { Issue } from "../domain/issue.js";

// ── Validadores de documentos (T029/T028) inyectados en el orquestador (T030) ────────

/** Puerto: valida los documentos del Design System. Devuelve Issues (vacío = válido). */
export interface DocumentValidators {
  validateConfig(data: unknown): readonly Issue[];
  validateManifest(data: unknown): readonly Issue[];
  validateDtcg(data: unknown): readonly Issue[];
}

// ── Puerto de filesystem (T031) ──────────────────────────────────────────────────────
// Operaciones mínimas necesarias para la escritura transaccional. No expone toda la API de
// Node. La infraestructura lo implementa con node:fs/promises; admite adapters en memoria.

export interface FileSystem {
  /** Tipo de la entrada (lstat, no sigue symlinks); "absent" si no existe. */
  lstatKind(path: string): Promise<ManagedFileKind>;
  /** Crea un directorio (recursivo opcional). */
  mkdir(path: string, recursive: boolean): Promise<void>;
  /** Crea un directorio temporal único con el prefijo dado; devuelve su ruta. */
  mkdtemp(prefix: string): Promise<string>;
  /** Lee un archivo UTF-8. */
  readFile(path: string): Promise<string>;
  /** Escribe un archivo con creación exclusiva (falla si ya existe). */
  writeFileExclusive(path: string, content: string): Promise<void>;
  /** Renombra/mueve una ruta. */
  rename(from: string, to: string): Promise<void>;
  /** Elimina un archivo (tolera ausencia). */
  removeFile(path: string): Promise<void>;
  /** Elimina un directorio vacío. */
  removeDir(path: string): Promise<void>;
  /** Elimina un árbol completo (uso exclusivo para limpiar staging controlado). */
  removeTree(path: string): Promise<void>;
  /** Resuelve la ruta real (sigue symlinks). */
  realpath(path: string): Promise<string>;
}

// ── Preparación y resultado de la transacción de escritura ───────────────────────────

/** Archivo preparado en memoria (contenido ya serializado), listo para escribir. */
export interface PreparedFile {
  readonly relativePath: string;
  readonly content: string;
}

export type TransactionResult =
  | { readonly status: "committed"; readonly files: readonly string[] }
  | { readonly status: "conflict"; readonly conflicts: readonly string[] }
  | {
      readonly status: "failed";
      readonly category: "filesystem" | "post-verify";
      readonly errors: readonly Issue[];
      readonly rollbackErrors?: readonly Issue[];
    };


// ── Resolución de la raíz anfitriona (T017 / ADR-0002) ───────────────────────────────

export interface HostRoot {
  /** Directorio real desde el que se ejecutó el comando. */
  readonly executionDir: string;
  /** Raíz anfitriona resuelta (directorio del package.json más cercano), ruta real. */
  readonly rootDir: string;
  /** Ruta del package.json que define la raíz anfitriona. */
  readonly packageJsonPath: string;
  /** Raíz Git más cercana (tope de búsqueda) si existe; null si no hay repositorio. */
  readonly gitRootDir: string | null;
  /** Límite autorizado de escritura (= rootDir). */
  readonly writeBoundary: string;
  /** true si existe un package.json ancestro adicional dentro del gitRoot (monorepo). */
  readonly isMonorepoChild: boolean;
}

export type HostErrorCode =
  | "execution-dir-missing"
  | "not-a-directory"
  | "package-json-missing"
  | "package-json-unreadable"
  | "package-json-invalid"
  | "unexpected-file-type";

export interface HostError {
  readonly code: HostErrorCode;
  readonly message: string;
  readonly path?: string;
}

export type HostRootResolution =
  | { readonly ok: true; readonly hostRoot: HostRoot }
  | { readonly ok: false; readonly error: HostError };

/** Puerto: resuelve la raíz anfitriona a partir del directorio de ejecución. */
export interface HostRootResolver {
  resolve(executionDir: string): HostRootResolution;
}

// ── Inspección de presencia de archivos administrados (T021) ─────────────────────────

/** Estado preliminar basado SOLO en presencia (sin validar contenido). */
export type PreliminaryState = "none" | "potentially-partial" | "potentially-complete";

export type ManagedFileKind = "file" | "directory" | "symlink" | "other" | "absent";

export interface ManagedFilePresence {
  readonly path: string;
  readonly present: boolean;
  readonly kind: ManagedFileKind;
}

export interface ManagedFilesPresence {
  readonly present: readonly string[];
  readonly missing: readonly string[];
  readonly allPresent: boolean;
  readonly nonePresent: boolean;
  /** none / potentially-partial / potentially-complete. La validez se decide después (T030b). */
  readonly preliminary: PreliminaryState;
  readonly details: readonly ManagedFilePresence[];
}

/** Puerto: inspecciona la presencia de los archivos administrados en una raíz. */
export interface HostInspector {
  inspectPresence(rootDir: string): ManagedFilesPresence;
}
