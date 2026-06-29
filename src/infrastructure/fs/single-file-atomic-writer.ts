import { copyFile, lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type {
  PresetTargetReader,
  SingleFileAtomicWriter,
  SingleFileBackupCleanupResult,
  SingleFileWriteRequest,
  SingleFileWriteResult,
  SingleFileWriteOutcome,
} from "../../application/presets/single-file-writer-port.js";

function fail(
  request: Pick<SingleFileWriteRequest, "relativePath">,
  outcome: Exclude<SingleFileWriteOutcome, "written">,
  message: string,
  backupRelativePath: string | null = null,
): SingleFileWriteResult {
  return {
    outcome,
    wrote: false,
    relativePath: request.relativePath,
    backupRelativePath,
    error: { code: outcome, message },
  };
}

function ok(request: Pick<SingleFileWriteRequest, "relativePath">, backupRelativePath: string | null): SingleFileWriteResult {
  return { outcome: "written", wrote: true, relativePath: request.relativePath, backupRelativePath, error: null };
}

function contained(rootDir: string, relativePath: string): { ok: true; absolutePath: string } | { ok: false; message: string } {
  if (path.isAbsolute(relativePath)) return { ok: false, message: "Target path must be relative." };
  const root = path.resolve(rootDir);
  const target = path.resolve(root, relativePath);
  if (target !== root && target.startsWith(`${root}${path.sep}`)) return { ok: true, absolutePath: target };
  return { ok: false, message: "Target path escapes the root." };
}

async function assertNoSymlinkPath(rootDir: string, absolutePath: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const root = path.resolve(rootDir);
  const relative = path.relative(root, absolutePath);
  const segments = relative.split(path.sep).filter((segment) => segment.length > 0);
  let current = root;

  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) return { ok: false, message: "Symlinks are not allowed in the target path." };
      if (current !== absolutePath && !info.isDirectory()) return { ok: false, message: "Target parent is not a directory." };
      if (current === absolutePath && !info.isFile()) return { ok: false, message: "Target is not a regular file." };
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "ENOENT") continue;
      return { ok: false, message: "Could not inspect target path." };
    }
  }
  return { ok: true };
}

function digest(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function backupPath(relativePath: string): string {
  return `${relativePath}.bak`;
}

function tempPath(absolutePath: string): string {
  return path.join(path.dirname(absolutePath), `.${path.basename(absolutePath)}.${process.pid}.${Date.now()}.tmp`);
}

export function createSingleFileAtomicWriter(): SingleFileAtomicWriter {
  return {
    async write(request): Promise<SingleFileWriteResult> {
      const target = contained(request.rootDir, request.relativePath);
      if (!target.ok) return fail(request, "path-error", target.message);

      const pathState = await assertNoSymlinkPath(request.rootDir, target.absolutePath);
      if (!pathState.ok) return fail(request, "path-error", pathState.message);

      const dir = path.dirname(target.absolutePath);
      const tmp = tempPath(target.absolutePath);
      const backupRelativePath = request.createBackup ? backupPath(request.relativePath) : null;
      const backupAbsolutePath = backupRelativePath === null ? null : path.resolve(request.rootDir, backupRelativePath);

      try {
        await mkdir(dir, { recursive: true });
      } catch {
        return fail(request, "temp-create-error", "Could not prepare target directory.");
      }

      try {
        await writeFile(tmp, request.content, { flag: "wx" });
      } catch {
        return fail(request, "write-error", "Could not write temporary file.");
      }

      try {
        const tmpContent = await readFile(tmp, "utf8");
        if (tmpContent !== request.content) {
          await rm(tmp, { force: true });
          return fail(request, "temp-verify-error", "Temporary file verification failed.");
        }
      } catch {
        await rm(tmp, { force: true });
        return fail(request, "temp-verify-error", "Could not verify temporary file.");
      }

      let current: string;
      try {
        current = await readFile(target.absolutePath, "utf8");
      } catch {
        await rm(tmp, { force: true });
        return fail(request, "before-rename-error", "Could not read target before rename.");
      }
      if (digest(current) !== digest(request.expectedContent)) {
        await rm(tmp, { force: true });
        return fail(request, "concurrent-modification", "Target changed before replacement.");
      }

      if (backupAbsolutePath !== null) {
        try {
          await copyFile(target.absolutePath, backupAbsolutePath, constants.COPYFILE_EXCL);
        } catch {
          await rm(tmp, { force: true });
          return fail(request, "before-rename-error", "Could not create backup before replacement.");
        }
      }

      try {
        await rename(tmp, target.absolutePath);
      } catch {
        await rm(tmp, { force: true });
        return fail(request, "rename-error", "Could not replace target.", backupRelativePath);
      }

      return ok(request, backupRelativePath);
    },

    async cleanupBackup(rootDir: string, backupRelativePath: string): Promise<SingleFileBackupCleanupResult> {
      const target = contained(rootDir, backupRelativePath);
      if (!target.ok) return { ok: false, error: { code: "path-error", message: target.message } };
      try {
        await rm(target.absolutePath, { force: true });
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: { code: "cleanup-error", message: "Could not remove backup." } };
      }
    },
  };
}

export function createPresetTargetReader(): PresetTargetReader {
  return {
    async read(request) {
      const target = contained(request.rootDir, request.relativePath);
      if (!target.ok) return { outcome: "read-error", content: null, error: target.message };
      const pathState = await assertNoSymlinkPath(request.rootDir, target.absolutePath);
      if (!pathState.ok) return { outcome: "read-error", content: null, error: pathState.message };
      try {
        return { outcome: "success", content: await readFile(target.absolutePath, "utf8") };
      } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
        if (code === "ENOENT") return { outcome: "not-found", content: null, error: "Target not found." };
        return { outcome: "read-error", content: null, error: "Could not read target." };
      }
    },
  };
}
