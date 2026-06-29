// T072 (006) — `BuildPlan`: intención de publicación a nivel de aplicación (sin handles de Node). Es un
// modelo de dominio puro; el writer transaccional (Checkpoint J) lo consumirá. Invariante: el conjunto
// candidato es completo, nunca parcial.
import type { BuildArtifact } from "./artifact.js";
import type { BuildManifestV1 } from "./build-manifest.js";

/** Clasificación del build manifest previo (autoridad de ownership). */
export type PreviousBuildManifest =
  | { readonly state: "absent" }
  | { readonly state: "unreadable" }
  | { readonly state: "unsupported" }
  | { readonly state: "parsed"; readonly manifest: BuildManifestV1 };

/** Política de preservación de nodos desconocidos en el output (detalle exhaustivo en Checkpoint I). */
export interface UnknownPreservationPolicy {
  readonly preserveRegularFiles: boolean;
  readonly preserveRegularDirectories: boolean;
}

/** Manifest candidato + sus bytes/hash serializados. */
export interface CandidateBuildManifest {
  readonly manifest: BuildManifestV1;
  readonly bytes: Uint8Array;
  readonly contentHash: string;
  readonly byteLength: number;
}

export interface BuildPlan {
  readonly outputRoot: string;
  readonly sourceHash: string;
  /** Conjunto candidato completo de artifacts. */
  readonly artifacts: readonly BuildArtifact[];
  readonly manifest: CandidateBuildManifest;
  readonly previousBuildManifest: PreviousBuildManifest;
  /** Artifacts + build manifest. */
  readonly requiredPaths: readonly string[];
  readonly unknownPolicy: UnknownPreservationPolicy;
}
