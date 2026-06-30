// T007 (008) — Puertos y tipos internos del caso de uso de mutaciones. Capa de aplicación: solo
// contratos; sin Node, sin Commander, sin filesystem ni infraestructura concreta. La infraestructura
// implementa estos puertos (snapshot reader que reúsa `002`/`006`; writer single-file que reúsa `005`).
import type { DtcgValue } from "../../domain/token-mutations/operation.js";
import type { SourceSnapshotIdentity } from "../../domain/token-mutations/outcome.js";

/**
 * Vista analizada de la fuente de tokens, derivada de UNA lectura/análisis (`002`/`004`). Expone solo lo
 * que el planner/validación necesitan, sin filtrar internals (trust, AST, bytes).
 */
export interface AnalyzedTokenSource {
  /** Documento DTCG parseado (objeto plano JSON-safe); se clona para construir el candidato. */
  readonly document: unknown;
  /** Identidad del snapshot (path lógico + hash de los bytes exactos). */
  readonly identity: SourceSnapshotIdentity;
  /** ¿Existe un token concreto o alias en este path? */
  hasToken(path: string): boolean;
  /** ¿Existe un grupo (objeto sin `$value`) en este path? */
  hasGroup(path: string): boolean;
  /** Paths de todos los tokens (concretos y alias), en orden del documento. */
  tokenPaths(): readonly string[];
  /** Target inmediato de alias del token, o `null` si es un token concreto. */
  aliasTargetOf(path: string): string | null;
  /** `$type` efectivo reutilizado del análisis, o `null` si indeterminable. */
  effectiveType(path: string): string | null;
  /** Valor resuelto final (copia defensiva, JSON-safe). */
  resolvedValue(path: string): DtcgValue;
  /** Paths de tokens cuyo alias resuelve (directa o transitivamente) a `path`. */
  dependentsOf(path: string): readonly string[];
}

/** Outcome de la lectura semántica del source. */
export type SourceSnapshotOutcome = "ready" | "not-found" | "read-error" | "invalid-design-system";

export type SourceSnapshotResult =
  | { readonly outcome: "ready"; readonly source: AnalyzedTokenSource }
  | { readonly outcome: Exclude<SourceSnapshotOutcome, "ready">; readonly source: null; readonly reason: string };

/** Puerto: produce la vista analizada de la fuente a partir del directorio de ejecución del host. */
export interface SourceSnapshotPort {
  read(input: { readonly executionDir: string }): Promise<SourceSnapshotResult>;
}

// ── Writer transaccional single-file (implementación en infraestructura, reusa `005`) ──────────────

export interface TokenSourceWriteRequest {
  /** Bytes/texto canónico del documento candidato a escribir. */
  readonly candidateText: string;
  readonly candidateHash: string;
  /** Hash esperado de la fuente actual (snapshot identity) para detectar cambio concurrente. */
  readonly expectedSourceHash: string;
}

export type TokenSourceWriteOutcome = "written" | "unchanged" | "concurrent-modification" | "write-error" | "verification-error";

export interface TokenSourceWriteResult {
  readonly outcome: TokenSourceWriteOutcome;
  readonly wrote: boolean;
  readonly sourceAvailable: boolean;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
  readonly error: { readonly code: string; readonly message: string } | null;
}

/** Puerto: escritura transaccional single-file de la fuente de tokens (temp→identity→replace→backup→verify). */
export interface TokenSourceWriterPort {
  write(request: TokenSourceWriteRequest): Promise<TokenSourceWriteResult>;
}
