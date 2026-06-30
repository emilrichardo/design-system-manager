// T115 (006) — Detección de concurrencia pre-commit, pura y basada en bytes/hash (NUNCA mtime/size).
// Compara el estado esperado (capturado en el análisis inicial) contra una re-observación byte-only del
// output: sourceHash, build manifest hash, managed artifacts (hash+byteLength), estados de required
// paths y symlink. El primer desajuste bloquea con `conflict`; el source mismatch es `source-modified`.
import type { BuildConflict, BuildConflictCode } from "../../domain/build-export/build-outcome.js";
import type { RequiredPathState } from "../../domain/build-export/build-snapshot.js";

export interface ManagedArtifactExpectation {
  readonly relativePath: string;
  readonly contentHash: string;
  readonly byteLength: number;
}

export interface RequiredPathExpectation {
  readonly relativePath: string;
  readonly state: RequiredPathState;
}

export interface ConcurrencyState {
  readonly sourceHash: string;
  readonly buildManifestHash: string | null;
  readonly managedArtifacts: readonly ManagedArtifactExpectation[];
  readonly requiredPathStates: readonly RequiredPathExpectation[];
}

export type ConcurrencyCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly conflict: BuildConflict };

function conflict(code: BuildConflictCode, path: string | null, message: string): ConcurrencyCheck {
  return { ok: false, conflict: Object.freeze({ code, path, format: null, severity: "error", message, blocksWrite: true }) };
}

/** Verifica que el estado observado coincide con el esperado; primer desajuste → `conflict`. */
export function checkConcurrency(expected: ConcurrencyState, observed: ConcurrencyState): ConcurrencyCheck {
  if (expected.sourceHash !== observed.sourceHash) {
    return conflict("source-modified", null, "La fuente cambió entre el análisis y la publicación.");
  }
  if (expected.buildManifestHash !== observed.buildManifestHash) {
    return conflict("untrusted-build-manifest", null, "El build manifest previo cambió entre el análisis y la publicación.");
  }

  const observedArtifacts = new Map(observed.managedArtifacts.map((a) => [a.relativePath, a]));
  for (const art of expected.managedArtifacts) {
    const now = observedArtifacts.get(art.relativePath);
    if (now === undefined) return conflict("managed-artifact-missing", art.relativePath, `Artifact administrado desapareció: ${art.relativePath}.`);
    if (now.contentHash !== art.contentHash || now.byteLength !== art.byteLength) {
      return conflict("managed-artifact-modified", art.relativePath, `Artifact administrado cambió: ${art.relativePath}.`);
    }
  }

  const observedStates = new Map(observed.requiredPathStates.map((s) => [s.relativePath, s.state]));
  for (const expectedState of expected.requiredPathStates) {
    const now = observedStates.get(expectedState.relativePath) ?? "absent";
    if (now !== expectedState.state) {
      const code: BuildConflictCode = now === "symlink" ? "unsupported-unknown-node" : "required-path-owned-by-unknown";
      return conflict(code, expectedState.relativePath, `El required path ${expectedState.relativePath} cambió de estado (${expectedState.state} → ${now}).`);
    }
  }

  return { ok: true };
}
