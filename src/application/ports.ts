// Puertos (contratos) de la capa de aplicación. Tipos puros: sin Node, sin filesystem,
// sin Commander/Clack, sin texto de terminal. La infraestructura los implementa.

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
