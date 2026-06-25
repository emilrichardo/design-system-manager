// Adapter real del puerto FileSystem sobre node:fs/promises (ADR-0005). Única capa con node:fs.
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, rmdir, writeFile } from "node:fs/promises";
import type { FileSystem, ManagedFileKind } from "../../application/ports.js";

function errno(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : undefined;
}

export const nodeFileSystem: FileSystem = {
  async lstatKind(path: string): Promise<ManagedFileKind> {
    try {
      const st = await lstat(path);
      if (st.isSymbolicLink()) return "symlink";
      if (st.isDirectory()) return "directory";
      if (st.isFile()) return "file";
      return "other";
    } catch {
      return "absent";
    }
  },
  async mkdir(path: string, recursive: boolean): Promise<void> {
    await mkdir(path, { recursive });
  },
  async mkdtemp(prefix: string): Promise<string> {
    return mkdtemp(prefix);
  },
  async readFile(path: string): Promise<string> {
    return readFile(path, "utf8");
  },
  async writeFileExclusive(path: string, content: string): Promise<void> {
    await writeFile(path, content, { encoding: "utf8", flag: "wx" });
  },
  async rename(from: string, to: string): Promise<void> {
    await rename(from, to);
  },
  async removeFile(path: string): Promise<void> {
    await rm(path, { force: true });
  },
  async removeDir(path: string): Promise<void> {
    try {
      await rmdir(path);
    } catch (e) {
      // Tolerar ausencia o directorio no vacío (no es nuestro contenido): no es un fallo.
      const code = errno(e);
      if (code !== "ENOENT" && code !== "ENOTEMPTY" && code !== "EEXIST") throw e;
    }
  },
  async removeTree(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true });
  },
  async realpath(path: string): Promise<string> {
    return realpath(path);
  },
};
