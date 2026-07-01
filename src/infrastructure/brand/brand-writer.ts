import { join } from "node:path";
import { nodeWriterFileSystem, type WriterFileSystem } from "../build-export/artifact-set-writer.js";
import { BRAND_FILES, BRAND_ROOT } from "../../domain/brand/brand-store.js";
import type { BrandWriteFile, BrandWriteRequest, BrandWriteResult, BrandWriterPort } from "../../application/brand/brand-ports.js";
import { sha256Hex } from "../build-export/hash.js";

const BRAND_DOC_RELATIVE_PATHS = Object.values(BRAND_FILES).map((filename) => `${BRAND_ROOT}/${filename}`);

function safeMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : null;
  return code === null ? "operación de filesystem fallida" : `operación de filesystem fallida (${code})`;
}

async function readHash(fs: WriterFileSystem, absolutePath: string): Promise<string | null> {
  try {
    const bytes = await fs.readFile(absolutePath);
    return sha256Hex(bytes);
  } catch {
    return null;
  }
}

async function verifyFiles(
  fs: WriterFileSystem,
  rootDir: string,
  files: readonly BrandWriteFile[],
): Promise<boolean> {
  for (const file of files) {
    const absolutePath = join(rootDir, ...file.relativePath.split("/"));
    const hash = await readHash(fs, absolutePath);
    if (hash !== file.contentHash) return false;
  }
  return true;
}

export function createBrandWriter(rootDir: string, fs: WriterFileSystem = nodeWriterFileSystem): BrandWriterPort {
  const brandDir = join(rootDir, ...BRAND_ROOT.split("/"));
  const brandParent = join(rootDir, "design-system");
  const stagingDir = join(brandParent, "brand.staging");
  const backupDir = join(brandParent, "brand.backup");

  return {
    async write(request: BrandWriteRequest): Promise<BrandWriteResult> {
      const candidateHashes = Object.fromEntries(request.files.map((file) => [file.relativePath, file.contentHash]));
      const unchanged = BRAND_DOC_RELATIVE_PATHS.every((relativePath) => request.expectedCurrent[relativePath] === candidateHashes[relativePath]);
      if (unchanged) {
        return { outcome: "unchanged", wrote: false, brandAvailable: true, recoveryRequired: false, error: null };
      }

      for (const relativePath of BRAND_DOC_RELATIVE_PATHS) {
        const absolutePath = join(rootDir, ...relativePath.split("/"));
        const currentHash = await readHash(fs, absolutePath);
        if ((request.expectedCurrent[relativePath] ?? null) !== currentHash) {
          return {
            outcome: "concurrent-modification",
            wrote: false,
            brandAvailable: true,
            recoveryRequired: false,
            error: { code: "concurrent-brand-change", message: `El documento ${relativePath} cambió antes de escribir.` },
          };
        }
      }

      await fs.removeTree(stagingDir).catch(() => undefined);
      await fs.removeTree(backupDir).catch(() => undefined);

      try {
        await fs.mkdir(stagingDir, true);
        for (const file of request.files) {
          await fs.writeFile(join(rootDir, ...file.relativePath.replace(`${BRAND_ROOT}/`, "design-system/brand.staging/").split("/")), file.bytes);
        }
      } catch (error) {
        await fs.removeTree(stagingDir).catch(() => undefined);
        return {
          outcome: "write-error",
          wrote: false,
          brandAvailable: true,
          recoveryRequired: false,
          error: { code: "staging-write-failed", message: safeMessage(error) },
        };
      }

      const candidateVerified = await verifyFiles(
        fs,
        rootDir,
        request.files.map((file) => ({
          ...file,
          relativePath: file.relativePath.replace(`${BRAND_ROOT}/`, "design-system/brand.staging/"),
        })),
      );
      if (!candidateVerified) {
        await fs.removeTree(stagingDir).catch(() => undefined);
        return {
          outcome: "write-error",
          wrote: false,
          brandAvailable: true,
          recoveryRequired: false,
          error: { code: "staging-verify-failed", message: "La verificación del candidato de brand falló." },
        };
      }

      const currentKind = await fs.pathKind(brandDir);
      const hadPreviousBrand = currentKind === "directory";
      if (hadPreviousBrand) {
        try {
          await fs.rename(brandDir, backupDir);
        } catch (error) {
          await fs.removeTree(stagingDir).catch(() => undefined);
          return {
            outcome: "write-error",
            wrote: false,
            brandAvailable: true,
            recoveryRequired: false,
            error: { code: "backup-create-failed", message: safeMessage(error) },
          };
        }
      }

      try {
        await fs.rename(stagingDir, brandDir);
      } catch (error) {
        if (hadPreviousBrand) await fs.rename(backupDir, brandDir).catch(() => undefined);
        await fs.removeTree(stagingDir).catch(() => undefined);
        return {
          outcome: "write-error",
          wrote: false,
          brandAvailable: true,
          recoveryRequired: false,
          error: { code: "publish-rename-failed", message: safeMessage(error) },
        };
      }

      const publishedVerified = await verifyFiles(fs, rootDir, request.files);
      if (!publishedVerified) {
        await fs.removeTree(brandDir).catch(() => undefined);
        if (hadPreviousBrand) {
          await fs.rename(backupDir, brandDir).catch(() => undefined);
        }
        return {
          outcome: "verification-error",
          wrote: false,
          brandAvailable: hadPreviousBrand,
          recoveryRequired: true,
          error: { code: "post-write-verification-failed", message: "La verificación posterior del brand write falló." },
        };
      }

      await fs.removeTree(backupDir).catch(() => undefined);
      return {
        outcome: "written",
        wrote: true,
        brandAvailable: true,
        recoveryRequired: false,
        error: null,
      };
    },
  };
}
