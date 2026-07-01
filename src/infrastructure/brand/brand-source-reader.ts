import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256Hex } from "../build-export/hash.js";
import { BRAND_FILES, BRAND_ROOT, type BrandDocumentSnapshot, type BrandSourceSnapshot } from "../../domain/brand/brand-store.js";

function decode(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

async function readOne(rootDir: string, filename: string): Promise<BrandDocumentSnapshot> {
  const relativePath = `${BRAND_ROOT}/${filename}`;
  const absolutePath = join(rootDir, ...relativePath.split("/"));
  try {
    const stat = await lstat(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      return { relativePath, state: "unreadable", value: null, contentHash: null, byteLength: null };
    }
  } catch {
    return { relativePath, state: "absent", value: null, contentHash: null, byteLength: null };
  }

  try {
    const bytes = await readFile(absolutePath);
    const text = decode(bytes);
    if (text === null) return { relativePath, state: "unreadable", value: null, contentHash: null, byteLength: null };
    return {
      relativePath,
      state: "parsed",
      value: JSON.parse(text),
      contentHash: sha256Hex(bytes),
      byteLength: bytes.byteLength,
    };
  } catch {
    return { relativePath, state: "unreadable", value: null, contentHash: null, byteLength: null };
  }
}

export async function readBrandSource(rootDir: string): Promise<BrandSourceSnapshot> {
  const brandProfile = await readOne(rootDir, BRAND_FILES.brandProfile);
  const voice = await readOne(rootDir, BRAND_FILES.voice);
  const visualLanguage = await readOne(rootDir, BRAND_FILES.visualLanguage);
  const usageGuidelines = await readOne(rootDir, BRAND_FILES.usageGuidelines);
  const snapshots = { brandProfile, voice, visualLanguage, usageGuidelines } as const;
  const states = Object.values(snapshots).map((snapshot) => snapshot.state);
  const status =
    states.every((state) => state === "absent")
      ? "absent"
      : states.every((state) => state === "parsed")
        ? "present"
        : "partial";
  return {
    root: rootDir,
    status,
    documents: snapshots,
  };
}
