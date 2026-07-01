// T009 (006) — Modelos y puertos internos del análisis compartido de build/export. Capa de aplicación:
// solo tipos y contratos; sin filesystem, sin Commander, sin infraestructura concreta. Reutiliza el
// análisis de `002` (DesignSystemAnalysis, TokenNodeSummary) y la inspección de foundations de `004`.
import type { DesignSystemAnalysis } from "../../domain/analysis/design-system-analysis.js";
import type { AliasState, NodeTrust } from "../../domain/analysis/token-node-summary.js";
import type { BuildArtifact } from "../../domain/build-export/artifact.js";
import type { BuildFormat } from "../../domain/build-export/build-format.js";
import type { BuildConflict } from "../../domain/build-export/build-outcome.js";
import type { BuildVerification } from "../../domain/build-export/verification.js";
import type { NormalizedTokenSet } from "../../domain/build-export/normalized-token.js";
import type { FoundationsInspection } from "../foundations/foundations-ports.js";
import type { PreviousBuildManifestInput, RequiredPathNode } from "./ownership.js";

/** Registro de resolución por token, derivado del análisis único (sin segundo grafo de aliases). */
export interface ResolvedTokenRecord {
  /** Ruta canónica `a.b.c`. */
  readonly path: string;
  /** `$value` declarado en la fuente (copia defensiva). */
  readonly declaredValue: unknown;
  /** Valor final resuelto siguiendo el alias inmediato→final cuando el alias es válido. */
  readonly resolvedValue: unknown;
  /** Target de alias inmediato, o `null` en un token concreto. */
  readonly immediateAliasTarget: string | null;
  /** Cadena inmediato→final (`[]` en un token concreto). */
  readonly aliasChain: readonly string[];
  /** `$type` efectivo reutilizado del análisis (`null` si indeterminable). */
  readonly effectiveType: string | null;
  /** Estado del alias reutilizado del grafo del análisis. */
  readonly aliasState: AliasState;
  /** Confiabilidad del nodo reutilizada del análisis. */
  readonly trust: NodeTrust;
}

/** Mapa de lookup readonly; refleja el orden de `ResolvedTokenView.tokens`. */
export type TokenResolutionMap = ReadonlyMap<string, ResolvedTokenRecord>;

/** Vista de resolución interna producida durante el análisis reutilizado, antes de los renderers. */
export interface ResolvedTokenView {
  readonly tokens: readonly ResolvedTokenRecord[];
  readonly byPath: TokenResolutionMap;
  /** Igual que `AnalyzedSourceSnapshot.sourceHash`. */
  readonly sourceHash: string;
}

/**
 * Captura semántica única de la fuente (`design-system/tokens/base.tokens.json`). Modelo interno: nunca
 * se serializa directamente; los resultados públicos exponen solo path lógico y hash.
 */
export interface AnalyzedSourceSnapshot {
  readonly logicalSourcePath: string;
  /** Bytes exactos leídos una sola vez (internos; no se exponen en resultados públicos). */
  readonly rawBytes: Uint8Array;
  /** SHA-256 hex de los bytes iniciales exactos. */
  readonly sourceHash: string;
  /** Texto decodificado UTF-8 (interno). */
  readonly decodedText: string;
  /** Documento parseado una sola vez (interno). */
  readonly parsedDocument: unknown;
  /** Análisis `002` reutilizado (un solo recorrido/grafo/tipos). */
  readonly analysis: DesignSystemAnalysis;
  /** Vista de resolución derivada del mismo análisis. */
  readonly resolvedTokenView: ResolvedTokenView;
  /** Proyección de foundations `004` (una sola), o `null` si la fuente no es inspeccionable. */
  readonly foundationProjection: FoundationsInspection | null;
}

/** Outcome de la lectura semántica inicial (mapeado luego a outcomes públicos en G/H). */
export type SourceSnapshotOutcome = "ready" | "not-found" | "read-error" | "invalid-design-system";

/** Resultado discriminado del lector de snapshot. */
export type SourceSnapshotResult =
  | { readonly outcome: "ready"; readonly snapshot: AnalyzedSourceSnapshot }
  | { readonly outcome: Exclude<SourceSnapshotOutcome, "ready">; readonly snapshot: null; readonly reason: string };

/** Puerto: produce el snapshot semántico a partir del directorio de ejecución del host. */
export interface SourceSnapshotReader {
  read(input: { readonly executionDir: string }): Promise<SourceSnapshotResult>;
}

// ── T090 (006) — Puertos de renderer, ownership inspector y writer (inyectados; sin infra aquí) ──

/** Error seguro de un renderer (sin `Error`/stack/rutas absolutas). */
export interface ArtifactRenderError {
  readonly format: BuildFormat;
  readonly code: string;
  readonly tokenPath: string | null;
  readonly type: string | null;
  readonly message: string;
}

/** Resultado normalizado de un renderer: artifact completo o `unsupported-value` con errores. */
export type ArtifactRenderResult =
  | { readonly outcome: "rendered"; readonly artifact: BuildArtifact }
  | { readonly outcome: "unsupported-value"; readonly errors: readonly ArtifactRenderError[] };

/** Puerto de renderer puro por formato; recibe el `NormalizedTokenSet` y no lo muta. */
export interface ArtifactRenderer {
  readonly format: BuildFormat;
  render(set: NormalizedTokenSet): ArtifactRenderResult;
}

/** Inspección del output provista por infraestructura (Checkpoint I); el clasificador es puro. */
export interface BuildOutputInspection {
  readonly previousManifest: PreviousBuildManifestInput;
  readonly artifactNodes: readonly RequiredPathNode[];
}

/** Puerto: inspecciona `design-system/build/` y devuelve el estado para clasificar ownership. */
export interface BuildOutputInspector {
  inspect(): Promise<BuildOutputInspection>;
}

/** Manifest candidato (bytes + hash) para el writer. */
export interface CandidateManifestInput {
  readonly relativePath: string;
  readonly bytes: Uint8Array;
  readonly contentHash: string;
  readonly byteLength: number;
}

export interface CandidateExtraFileInput {
  readonly relativePath: string;
  readonly bytes: Uint8Array;
  readonly contentHash: string;
  readonly byteLength: number;
}

/** Petición de publicación del conjunto completo (sin publicaciones parciales). */
export interface ArtifactSetWriteRequest {
  readonly outputRoot: string;
  readonly artifacts: readonly BuildArtifact[];
  readonly extraFiles: readonly CandidateExtraFileInput[];
  readonly manifest: CandidateManifestInput;
  readonly strategy: "candidate-directory-set-v1";
  readonly expectedHashes: {
    readonly source: string;
    readonly artifacts: Readonly<Record<string, string>>;
    readonly extraFiles: Readonly<Record<string, string>>;
    readonly buildManifest: string;
  };
}

export type ArtifactSetWriteOutcome =
  | "published"
  | "unchanged"
  | "conflict"
  | "unsafe-target"
  | "write-error"
  | "verification-error";

export interface ArtifactSetWriteResult {
  readonly outcome: ArtifactSetWriteOutcome;
  readonly wrote: boolean;
  readonly outputAvailable: boolean;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
  readonly verification: BuildVerification | null;
  readonly conflicts: readonly BuildConflict[];
  readonly error: { readonly code: string; readonly message: string } | null;
}

/** Puerto del writer transaccional (implementación real en el Checkpoint J). */
export interface ArtifactSetWriter {
  write(request: ArtifactSetWriteRequest): Promise<ArtifactSetWriteResult>;
}
