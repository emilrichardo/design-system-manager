// T074 (006) — Clasificador puro de ownership del output. La ÚNICA autoridad es el build manifest
// previo (`design-system/build/manifest.json`); el host manifest no se usa para ownership. No lee
// filesystem: recibe un snapshot de nodos (puerto del Checkpoint I) y la lectura previa del manifest.
// Nunca sigue symlinks. No escribe; solo clasifica. Conflictos deterministas y mensajes seguros
// (paths lógicos relativos, sin rutas absolutas, sin `Error`/stack).
import { BUILD_FORMATS, artifactFilename, type BuildFormat } from "../../domain/build-export/build-format.js";
import { validateBuildManifestV1 } from "../../domain/build-export/build-manifest.js";
import type { BuildConflict, BuildConflictCode, BuildOwnership, BuildOwnershipState } from "../../domain/build-export/build-outcome.js";

/** Estado en disco de un required path (provisto por el inspector de filesystem; symlinks no se siguen). */
export type RequiredPathNode =
  | { readonly relativePath: string; readonly kind: "absent" }
  | { readonly relativePath: string; readonly kind: "file"; readonly contentHash: string; readonly byteLength: number }
  | { readonly relativePath: string; readonly kind: "directory" }
  | { readonly relativePath: string; readonly kind: "symlink" }
  | { readonly relativePath: string; readonly kind: "other" };

/** Lectura previa del build manifest (bytes → parse seguro fuera de este módulo). */
export type PreviousBuildManifestInput =
  | { readonly state: "absent" }
  | { readonly state: "unreadable" }
  | { readonly state: "parsed"; readonly value: unknown };

export interface OwnershipInput {
  readonly previousManifest: PreviousBuildManifestInput;
  /** Nodos de los artifacts requeridos (tokens.css, tokens.resolved.json, tokens.ts). */
  readonly artifactNodes: readonly RequiredPathNode[];
}

const STATE_PRECEDENCE: readonly BuildOwnershipState[] = [
  "untrusted-build-manifest",
  "required-path-owned-by-unknown",
  "managed-artifact-modified",
  "managed-artifact-missing",
  "unsupported-unknown-node",
];

function conflict(code: BuildConflictCode, path: string | null, format: BuildFormat | null, message: string): BuildConflict {
  return Object.freeze({ code, path, format, severity: "error", message, blocksWrite: true });
}

function compareNullable(a: string | null, b: string | null): number {
  const x = a ?? "";
  const y = b ?? "";
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Orden determinista: relativePath → code → format (code point, sin localeCompare). */
function sortConflicts(conflicts: readonly BuildConflict[]): readonly BuildConflict[] {
  return [...conflicts].sort((a, b) => compareNullable(a.path, b.path) || compareNullable(a.code, b.code) || compareNullable(a.format, b.format));
}

function dominantState(conflicts: readonly BuildConflict[]): BuildOwnershipState {
  for (const state of STATE_PRECEDENCE) {
    if (conflicts.some((c) => c.code === state)) return state;
  }
  return "untrusted-build-manifest";
}

function blocked(conflicts: readonly BuildConflict[]): BuildOwnership {
  const ordered = sortConflicts(conflicts);
  return Object.freeze({ state: dominantState(ordered), conflicts: Object.freeze(ordered) });
}

/** Clasifica el ownership del output. `empty`/`trusted` permiten publicar; el resto bloquea. */
export function classifyBuildOwnership(input: OwnershipInput): BuildOwnership {
  const artifactSpecs = BUILD_FORMATS.map((format) => ({ format, path: artifactFilename(format) }));
  const nodeByPath = new Map(input.artifactNodes.map((node) => [node.relativePath, node]));
  const nodeOf = (path: string): RequiredPathNode => nodeByPath.get(path) ?? { relativePath: path, kind: "absent" };

  const pm = input.previousManifest;

  if (pm.state === "absent") {
    const occupied = artifactSpecs.filter((spec) => nodeOf(spec.path).kind !== "absent");
    if (occupied.length === 0) return Object.freeze({ state: "empty", conflicts: Object.freeze([]) });
    return blocked(
      occupied.map((spec) =>
        conflict("required-path-owned-by-unknown", spec.path, spec.format, `Required path ${spec.path} ocupado por contenido no administrado (sin build manifest confiable).`),
      ),
    );
  }

  if (pm.state === "unreadable") {
    return blocked([conflict("untrusted-build-manifest", null, null, "Build manifest previo ilegible o corrupto.")]);
  }

  const validation = validateBuildManifestV1(pm.value);
  if (!validation.ok) {
    return blocked([conflict("untrusted-build-manifest", null, null, `Build manifest previo no confiable: ${validation.reason}.`)]);
  }

  const conflicts: BuildConflict[] = [];
  for (const artifact of validation.manifest.artifacts) {
    const node = nodeOf(artifact.relativePath);
    if (node.kind === "absent") {
      conflicts.push(conflict("managed-artifact-missing", artifact.relativePath, artifact.format, `Artifact administrado ausente: ${artifact.relativePath}.`));
    } else if (node.kind !== "file") {
      conflicts.push(conflict("managed-artifact-modified", artifact.relativePath, artifact.format, `Artifact administrado reemplazado por un nodo ${node.kind}: ${artifact.relativePath}.`));
    } else if (node.contentHash !== artifact.contentHash || node.byteLength !== artifact.byteLength) {
      conflicts.push(conflict("managed-artifact-modified", artifact.relativePath, artifact.format, `Artifact administrado modificado: ${artifact.relativePath}.`));
    }
  }

  if (conflicts.length === 0) return Object.freeze({ state: "trusted", conflicts: Object.freeze([]) });
  return blocked(conflicts);
}
