// T014 (007) — Lector del asset store (`design-system/assets/`). Lee el manifest, observa el estado de
// los paths administrados SIN seguir symlinks (lstat), enumera nodos desconocidos y aplica defensa de
// contención. No toca tokens/host/build. Provee observaciones para ownership/concurrencia (Checkpoint C).
import { lstat, readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { ASSET_MANIFEST_FILENAME, ASSET_STORE_ROOT, validateAssetManifestV1 } from "../../domain/assets/asset-manifest.js";
import { sha256Hex } from "./hash.js";

export type RawNodeKind = "regular-file" | "regular-directory" | "symlink" | "socket" | "fifo" | "block-device" | "char-device" | "other";

export type ManagedPathState = "file" | "dir" | "symlink" | "absent" | "other";

export interface ManagedPathStatus {
  readonly relativePath: string;
  readonly state: ManagedPathState;
  readonly contentHash: string | null;
  readonly byteLength: number | null;
}

export interface RawAssetNode {
  readonly relativePath: string;
  readonly rawKind: RawNodeKind;
  readonly byteLength: number | null;
  readonly depth: number;
}

export type PreviousAssetManifestInput =
  | { readonly state: "absent" }
  | { readonly state: "unreadable" }
  | { readonly state: "parsed"; readonly value: unknown };

export interface AssetStoreObservation {
  readonly manifest: PreviousAssetManifestInput;
  /** SHA-256 de los bytes de `assets.json`, o `null` si ausente. Para recheck de concurrencia. */
  readonly manifestHash: string | null;
  /** Paths lógicos declarados por un manifest VÁLIDO (vacío si ausente/ilegible/no válido). */
  readonly managedPaths: readonly string[];
  readonly managedPathStates: readonly ManagedPathStatus[];
  readonly unknownNodes: readonly RawAssetNode[];
}

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

async function managedPathStatus(storeDir: string, rel: string): Promise<ManagedPathStatus> {
  const abs = join(storeDir, rel);
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

async function readManifest(storeDir: string): Promise<PreviousAssetManifestInput> {
  const abs = join(storeDir, ASSET_MANIFEST_FILENAME);
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

/** Enumera nodos desconocidos: todo bajo el store que no sea un path administrado ni `assets.json`. */
async function readUnknownNodes(storeDir: string, managed: ReadonlySet<string>): Promise<RawAssetNode[]> {
  const out: RawAssetNode[] = [];
  async function walk(dirAbs: string, depth: number): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dirAbs);
    } catch {
      return;
    }
    for (const name of entries) {
      const abs = join(dirAbs, name);
      const rel = relative(storeDir, abs).split(sep).join("/");
      if (rel === ASSET_MANIFEST_FILENAME) continue;
      if (managed.has(rel)) continue; // managed paths se tratan aparte
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
      // No descender dentro de un directorio administrado; sí dentro de uno desconocido para reportarlo.
      if (rawKind === "regular-directory") await walk(abs, depth + 1);
    }
  }
  await walk(storeDir, 0);
  return out;
}

/** Observa el asset store (lstat, sin seguir symlinks). `rootDir` es la raíz del host (absoluta). */
export async function observeAssetStore(rootDir: string): Promise<AssetStoreObservation> {
  const storeDir = join(rootDir, ...ASSET_STORE_ROOT.split("/"));
  const manifest = await readManifest(storeDir);

  let manifestHash: string | null = null;
  try {
    const manifestAbs = join(storeDir, ASSET_MANIFEST_FILENAME);
    if ((await rawKindOf(manifestAbs)) === "regular-file") manifestHash = sha256Hex(await readFile(manifestAbs));
  } catch {
    manifestHash = null;
  }

  let managedPaths: string[] = [];
  if (manifest.state === "parsed") {
    const validation = validateAssetManifestV1(manifest.value);
    if (validation.ok) managedPaths = validation.manifest.assets.map((a) => a.logicalPath);
  }
  const managedSet = new Set(managedPaths);
  const managedPathStates = await Promise.all(managedPaths.map((rel) => managedPathStatus(storeDir, rel)));
  const unknownNodes = await readUnknownNodes(storeDir, managedSet);

  return { manifest, manifestHash, managedPaths, managedPathStates, unknownNodes };
}

export interface AssetStoreReader {
  observe(): Promise<AssetStoreObservation>;
}

/** Crea un lector del asset store anclado a la raíz del host. */
export function createAssetStoreReader(rootDir: string): AssetStoreReader {
  return { observe: () => observeAssetStore(rootDir) };
}
