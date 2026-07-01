// T110 (006) — Lector del estado de `design-system/build/` (output dir). Observa estados de required
// paths SIN seguir symlinks (lstat), lee el build manifest previo y enumera nodos desconocidos crudos.
// Provee el `BuildOutputInspector` (ownership) y observaciones para clasificación/concurrencia. Infra:
// usa node:fs; nunca expone rutas absolutas en los modelos públicos; defensa de contención por root.
import { lstat, readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { BUILD_BRAND_ARTIFACT_FILENAME, BUILD_MANIFEST_FILENAME, BUILD_OUTPUT_ROOT } from "../../domain/build-export/build-manifest.js";
import { artifactFilename, BUILD_FORMATS } from "../../domain/build-export/build-format.js";
import type { RawNodeKind, RawOutputNode, RequiredPathStatus } from "../../domain/build-export/build-snapshot.js";
import type { BuildOutputInspection, BuildOutputInspector } from "../../application/build-export/build-ports.js";
import type { PreviousBuildManifestInput, RequiredPathNode } from "../../application/build-export/ownership.js";
import { sha256Hex } from "./hash.js";

const ARTIFACT_PATHS = BUILD_FORMATS.map((f) => artifactFilename(f));
const REQUIRED_PATHS = [...ARTIFACT_PATHS, BUILD_MANIFEST_FILENAME, BUILD_BRAND_ARTIFACT_FILENAME];

async function rawKindOf(abs: string): Promise<RawNodeKind> {
  const st = await lstat(abs);
  if (st.isSymbolicLink()) return "symlink";
  if (st.isFile()) return "regular-file";
  if (st.isDirectory()) return "regular-directory";
  if (st.isSocket()) return "socket";
  if (st.isFIFO()) return "fifo";
  if (st.isBlockDevice()) return "block-device";
  if (st.isCharacterDevice()) return "char-device";
  return "other";
}

async function requiredPathStatus(buildDir: string, rel: string): Promise<RequiredPathStatus> {
  const abs = join(buildDir, rel);
  let kind: RawNodeKind;
  try {
    kind = await rawKindOf(abs);
  } catch {
    return { relativePath: rel, state: "absent", contentHash: null, byteLength: null };
  }
  if (kind === "symlink") return { relativePath: rel, state: "symlink", contentHash: null, byteLength: null };
  if (kind === "regular-directory") return { relativePath: rel, state: "dir", contentHash: null, byteLength: null };
  if (kind === "regular-file") {
    const bytes = await readFile(abs);
    return { relativePath: rel, state: "file", contentHash: sha256Hex(bytes), byteLength: bytes.byteLength };
  }
  return { relativePath: rel, state: "other", contentHash: null, byteLength: null };
}

async function readPreviousManifest(buildDir: string): Promise<PreviousBuildManifestInput> {
  const abs = join(buildDir, BUILD_MANIFEST_FILENAME);
  let bytes: Uint8Array;
  try {
    const kind = await rawKindOf(abs);
    if (kind !== "regular-file") return kind === "symlink" || kind === "regular-directory" ? { state: "unreadable" } : { state: "absent" };
    bytes = await readFile(abs);
  } catch {
    return { state: "absent" };
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { state: "unreadable" };
  }
  try {
    return { state: "parsed", value: JSON.parse(text) as unknown };
  } catch {
    return { state: "unreadable" };
  }
}

function toArtifactNode(status: RequiredPathStatus): RequiredPathNode {
  switch (status.state) {
    case "file":
      return { relativePath: status.relativePath, kind: "file", contentHash: status.contentHash ?? "", byteLength: status.byteLength ?? 0 };
    case "dir":
      return { relativePath: status.relativePath, kind: "directory" };
    case "symlink":
      return { relativePath: status.relativePath, kind: "symlink" };
    case "absent":
      return { relativePath: status.relativePath, kind: "absent" };
    default:
      return { relativePath: status.relativePath, kind: "other" };
  }
}

/** Enumera nodos desconocidos (todo bajo build/ que no sea un required path), crudos y sin seguir links. */
async function readUnknownNodes(buildDir: string): Promise<RawOutputNode[]> {
  const out: RawOutputNode[] = [];
  async function walk(dirAbs: string, depth: number): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dirAbs);
    } catch {
      return;
    }
    for (const name of entries) {
      const abs = join(dirAbs, name);
      const rel = relative(buildDir, abs).split(sep).join("/");
      if (depth === 0 && REQUIRED_PATHS.includes(rel)) continue; // required paths se tratan aparte
      const rawKind = await rawKindOf(abs);
      let byteLength: number | null = null;
      if (rawKind === "regular-file") {
        try {
          byteLength = (await readFile(abs)).byteLength;
        } catch {
          byteLength = null;
        }
      }
      out.push({ relativePath: rel, rawKind, byteLength, depth });
      if (rawKind === "regular-directory") await walk(abs, depth + 1);
    }
  }
  await walk(buildDir, 0);
  return out;
}

export interface BuildOutputObservation {
  readonly previousManifest: PreviousBuildManifestInput;
  readonly artifactNodes: readonly RequiredPathNode[];
  readonly requiredPathStates: readonly RequiredPathStatus[];
  readonly rawUnknownNodes: readonly RawOutputNode[];
}

/** Observa el output dir (lstat, sin seguir symlinks). `rootDir` es la raíz del host (absoluta). */
export async function observeBuildOutput(rootDir: string): Promise<BuildOutputObservation> {
  const buildDir = join(rootDir, ...BUILD_OUTPUT_ROOT.split("/"));
  const requiredPathStates = await Promise.all([...ARTIFACT_PATHS, BUILD_BRAND_ARTIFACT_FILENAME].map((rel) => requiredPathStatus(buildDir, rel)));
  const previousManifest = await readPreviousManifest(buildDir);
  const rawUnknownNodes = await readUnknownNodes(buildDir);
  return {
    previousManifest,
    artifactNodes: requiredPathStates.map(toArtifactNode),
    requiredPathStates,
    rawUnknownNodes,
  };
}

/** `BuildOutputInspector` para el caso de uso build (ownership). */
export function createBuildOutputInspector(rootDir: string): BuildOutputInspector {
  return {
    async inspect(): Promise<BuildOutputInspection> {
      const observation = await observeBuildOutput(rootDir);
      return { previousManifest: observation.previousManifest, artifactNodes: observation.artifactNodes };
    },
  };
}
